#!/usr/bin/env node
/**
 * Payer Route Reconciliation Pipeline
 * ─────────────────────────────────────────────────────────────────────────────
 * Reads structured source data (extracted_route_data.json) and runs the full
 * reconciliation pipeline, emitting a machine-readable JSON result to stdout
 * and a human-readable summary to stderr.
 *
 * In a production system, an extraction step using an LLM (e.g. Claude) would
 * precede this script — converting raw provider manuals, phone transcripts,
 * web pages, and denial letters into the structured JSON format this pipeline
 * consumes.  That separation of concerns keeps extraction and reconciliation
 * independently testable and replaceable.
 *
 * Usage
 * ─────
 *   npx tsx scripts/reconcile.ts                        # all payers → stdout
 *   npx tsx scripts/reconcile.ts --payer aetna          # single payer
 *   npx tsx scripts/reconcile.ts --out results.json     # write to file
 *   npx tsx scripts/reconcile.ts --payer cigna --pretty # pretty-print JSON
 */

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// ── Imports (relative paths — this script runs outside Next.js) ───────────────
import { reconcilePayer, overallStatus } from '../lib/reconciler'
import type {
  RouteData,
  ReconciledRoute,
  ReconciledField,
  ConfidenceStatus,
} from '../lib/types'

// ── CLI args ─────────────────────────────────────────────────────────────────
const args   = process.argv.slice(2)
const get    = (flag: string) => {
  const i = args.indexOf(flag)
  return i !== -1 ? args[i + 1] : null
}
const has    = (flag: string) => args.includes(flag)

const PAYER_FILTER = get('--payer')
const OUT_FILE     = get('--out')
const PRETTY       = has('--pretty') || !!OUT_FILE

// ── Load source data ─────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)
const DATA_PATH  = path.resolve(__dirname, '../data/extracted_route_data.json')

if (!fs.existsSync(DATA_PATH)) {
  console.error(`[reconcile] ERROR: data file not found at ${DATA_PATH}`)
  process.exit(1)
}

const rawData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')) as RouteData

// ── Filter payers ─────────────────────────────────────────────────────────────
const payerKeys = PAYER_FILTER
  ? Object.keys(rawData).filter(k => k === PAYER_FILTER)
  : Object.keys(rawData)

if (payerKeys.length === 0) {
  console.error(`[reconcile] ERROR: payer "${PAYER_FILTER}" not found. Available: ${Object.keys(rawData).join(', ')}`)
  process.exit(1)
}

// ── Run reconciliation ────────────────────────────────────────────────────────
const startMs = Date.now()

const reconciled: Record<string, ReconciledRoute> = {}
for (const key of payerKeys) {
  reconciled[key] = reconcilePayer(rawData[key])
}

const elapsedMs = Date.now() - startMs

// ── Build output ──────────────────────────────────────────────────────────────

type FieldSummary = {
  value:         unknown
  status:        ConfidenceStatus
  confidence:    number
  reasoning:     string
  sources_total: number
  sources_agree: number
}

type ConflictDetail = {
  field:       string
  recommended: unknown
  alternatives: Array<{ source_type: string; source_name: string; date: string; value: unknown }>
}

type PayerResult = {
  payer:            string
  overall_status:   ConfidenceStatus
  last_updated:     string
  source_count:     number
  fields:           Record<string, FieldSummary>
  conflicts:        ConflictDetail[]
  drugs:            Record<string, Record<string, FieldSummary>>
}

function summariseField(f: ReconciledField): FieldSummary {
  return {
    value:         f.bestValue,
    status:        f.status,
    confidence:    f.confidence,
    reasoning:     f.reasoning,
    sources_total: f.totalSources,
    sources_agree: f.agreementCount,
  }
}

function extractConflicts(route: ReconciledRoute): ConflictDetail[] {
  return Object.entries(route.fields)
    .filter(([, f]) => f.status === 'conflicted')
    .map(([fieldName, f]) => ({
      field:       fieldName,
      recommended: f.bestValue,
      alternatives: f.evidence
        .filter(e => !e.isDeprecated && JSON.stringify(e.value) !== JSON.stringify(f.bestValue))
        .map(e => ({
          source_type: e.source_type,
          source_name: e.source_name,
          date:        e.source_date,
          value:       e.value,
        })),
    }))
}

const payerResults: Record<string, PayerResult> = {}

for (const key of payerKeys) {
  const route     = reconciled[key]
  const srcCount  = rawData[key].sources.length

  // Flatten drug fields
  const drugs: Record<string, Record<string, FieldSummary>> = {}
  for (const [drug, drugFields] of Object.entries(route.drugFields)) {
    drugs[drug] = Object.fromEntries(
      Object.entries(drugFields).map(([f, v]) => [f, summariseField(v)])
    )
  }

  payerResults[key] = {
    payer:          route.payer,
    overall_status: overallStatus(route),
    last_updated:   route.lastUpdated,
    source_count:   srcCount,
    fields:         Object.fromEntries(
      Object.entries(route.fields).map(([f, v]) => [f, summariseField(v)])
    ),
    conflicts:      extractConflicts(route),
    drugs,
  }
}

// ── Aggregate summary ─────────────────────────────────────────────────────────
const allFields   = Object.values(payerResults).flatMap(p => Object.values(p.fields))
const summary = {
  generated_at:          new Date().toISOString(),
  elapsed_ms:            elapsedMs,
  payers_processed:      payerKeys.length,
  payers_with_conflicts: Object.values(payerResults).filter(p => p.conflicts.length > 0).length,
  fields_total:          allFields.length,
  fields_verified:       allFields.filter(f => f.status === 'verified').length,
  fields_likely:         allFields.filter(f => f.status === 'likely').length,
  fields_conflicted:     allFields.filter(f => f.status === 'conflicted').length,
  fields_stale:          allFields.filter(f => f.status === 'stale').length,
}

const output = { summary, payers: payerResults }

// ── Write JSON ────────────────────────────────────────────────────────────────
const json = PRETTY
  ? JSON.stringify(output, null, 2)
  : JSON.stringify(output)

if (OUT_FILE) {
  const outPath = path.resolve(process.cwd(), OUT_FILE)
  fs.writeFileSync(outPath, json, 'utf8')
  console.error(`[reconcile] Wrote ${(json.length / 1024).toFixed(1)} KB → ${outPath}`)
} else {
  process.stdout.write(json + '\n')
}

// ── Human-readable summary → stderr ──────────────────────────────────────────
const STATUS_ICON: Record<ConfidenceStatus, string> = {
  verified:   '✓',
  likely:     '~',
  conflicted: '⚠',
  stale:      '○',
  deprecated: '✕',
  overridden: '✎',
}

console.error('\n╔══════════════════════════════════════════════════════════╗')
console.error('║          Payer Route Reconciliation — Summary            ║')
console.error('╚══════════════════════════════════════════════════════════╝\n')

for (const [key, result] of Object.entries(payerResults)) {
  const icon       = STATUS_ICON[result.overall_status]
  const fieldCount = Object.keys(result.fields).length
  const conflCount = result.conflicts.length

  console.error(`  ${icon}  ${result.payer.padEnd(30)} ${fieldCount} fields  |  ${conflCount} conflict${conflCount !== 1 ? 's' : ''}`)

  if (result.conflicts.length > 0) {
    for (const c of result.conflicts) {
      const alts = c.alternatives.map(a => `${a.source_type}: ${JSON.stringify(a.value)}`).join('  vs  ')
      console.error(`       ↳ ${c.field}: recommended=${JSON.stringify(c.recommended)}  ←  ${alts}`)
    }
  }
}

console.error(`\n  Fields: ${summary.fields_verified} verified  ${summary.fields_likely} likely  ${summary.fields_conflicted} conflicted  ${summary.fields_stale} stale`)
console.error(`  Ran in ${elapsedMs}ms\n`)
