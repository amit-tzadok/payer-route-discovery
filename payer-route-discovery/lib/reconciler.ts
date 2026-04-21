import type {
  ConfidenceStatus,
  FieldEvidence,
  PayerData,
  ReconciledField,
  ReconciledRoute,
  Source,
  SourceType,
} from './types'

// ─── Trust hierarchy ────────────────────────────────────────────────────────
// denial_letter: payer's own words applied to a real case — ground truth
// phone_transcript: real-time but rep-dependent
// web_page: official but can lag behind policy changes
// provider_manual: annual cycle, often stale for operational details

const SOURCE_TRUST: Record<SourceType, number> = {
  denial_letter:    4,
  phone_transcript: 3,
  web_page:         2,
  provider_manual:  1,
}

// ─── Confidence constants ───────────────────────────────────────────────────

const CONF_VERIFIED_TOMBSTONE = 93  // old value deprecated, new sources agree
const CONF_VERIFIED_BASE      = 88  // 2+ independent source types agree
const CONF_VERIFIED_MAX_BONUS = 10  // up to +10 for additional agreeing sources
const CONF_CORROBORATED       = 76  // 2+ sources agree but same source type
const CONF_LIKELY_BASE        = 55  // single source; +8 per SOURCE_TRUST tier
const CONF_STALE              = 38  // best source is beyond its stale threshold
const CONF_CONFLICT_BASE      = 45  // conflict; best-trust source breaks the tie

// Per-source-type staleness thresholds (days) — ground-truth sources stay
// fresh longer; provider manuals are expected to be updated annually
const STALE_DAYS: Record<SourceType, number> = {
  denial_letter:    730,  // payer's own decisions: valid ~2 years
  phone_transcript: 180,  // rep info: reliable for ~6 months
  web_page:         270,  // official site: ~9 months
  provider_manual:  365,  // annual update cycle
}

// ─── Recency weighting ──────────────────────────────────────────────────────

function daysSince(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function recencyMultiplier(dateStr: string): number {
  const days = daysSince(dateStr)
  if (days <= 30)  return 1.00
  if (days <= 90)  return 0.90
  if (days <= 180) return 0.75
  if (days <= 365) return 0.60
  if (days <= 730) return 0.40
  return 0.20
}

function trustScore(source: Source): number {
  return SOURCE_TRUST[source.source_type] * recencyMultiplier(source.source_date)
}

// ─── Relative date helper ───────────────────────────────────────────────────

export function relativeDate(dateStr: string): string {
  const days = daysSince(dateStr)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7)  return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  if (days < 365) return `${Math.floor(days / 30)} months ago`
  return `${Math.floor(days / 365)}+ years ago`
}

// ─── Value comparison (normalises array order + field-specific formats) ─────

const PHONE_FIELDS = new Set(['fax_number', 'phone_urgent', 'phone_status_only'])

function normalizeForComparison(field: string, value: unknown): string {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) {
    return JSON.stringify([...value].map(v => String(v).toLowerCase()).sort())
  }
  const str = String(value)
  if (PHONE_FIELDS.has(field)) {
    // Strip all non-digit characters so "800-555-1234" == "8005551234"
    return str.replace(/\D/g, '')
  }
  if (field === 'portal_url') {
    // Strip protocol and trailing slash so "https://foo.com/" == "http://foo.com"
    return str.replace(/^https?:\/\//i, '').replace(/\/$/, '').toLowerCase()
  }
  return str.toLowerCase().trim()
}

function valuesMatch(field: string, a: unknown, b: unknown): boolean {
  return normalizeForComparison(field, a) === normalizeForComparison(field, b)
}

// ─── Fields to extract ──────────────────────────────────────────────────────

const ROUTE_FIELDS = [
  'submission_methods',
  'fax_number',
  'portal_url',
  'pa_form',
  'chart_note_window_days',
  'turnaround_standard_days',
  'turnaround_fax_days',
  'turnaround_urgent_hours',
  'phone_urgent',
  'phone_status_only',
]

const DRUG_FIELDS = [
  'step_therapy_required',
  'biosimilar_required',
  'biosimilar_preferred',
  'biosimilar_attestation',
  'auth_period_months',
  'notes',
]

// ─── Core reconciliation ────────────────────────────────────────────────────

function reconcileField(
  field: string,
  sources: Source[],
): ReconciledField | null {
  // First pass — collect all deprecated values and their notes
  const deprecatedValues = new Set<string>()
  const deprecationNotes = new Map<string, string>()

  for (const source of sources) {
    const data   = source.data
    const oldKey = `${field}_old`
    if (data[oldKey] !== undefined) {
      const oldVal = String(data[oldKey])
      deprecatedValues.add(oldVal)
      const note = (data[`${field}_old_status`] as string | undefined)
        ?? 'Marked deprecated by a newer source'
      deprecationNotes.set(oldVal, note)
    }
  }

  // Second pass — build evidence list
  const evidence: FieldEvidence[] = []

  for (const source of sources) {
    const value = source.data[field]
    // Skip undefined or null — null means the source didn't mention this field,
    // not that the field definitively has no value. Treat as absence of evidence.
    if (value === undefined || value === null) continue

    const strVal      = String(value)
    const isDeprecated = deprecatedValues.has(strVal)

    evidence.push({
      source_id:       source.source_id,
      source_type:     source.source_type,
      source_name:     source.source_name,
      source_date:     source.source_date,
      source_language: source.source_language,
      value,
      isDeprecated,
      deprecationNote: isDeprecated ? deprecationNotes.get(strVal) : undefined,
      trustScore:      trustScore(source),
    })
  }

  if (evidence.length === 0) return null

  // Separate active vs deprecated, sort active by trust descending
  const active     = evidence.filter(e => !e.isDeprecated).sort((a, b) => b.trustScore - a.trustScore)
  const deprecated = evidence.filter(e => e.isDeprecated)

  if (active.length === 0) return null

  const best      = active[0]
  const bestValue = best.value

  // Single pass: partition active evidence into agreeing vs conflicting
  const agreeing:    FieldEvidence[] = []
  const conflicting: FieldEvidence[] = []
  for (const e of active) {
    if (valuesMatch(field, e.value, bestValue)) agreeing.push(e)
    else conflicting.push(e)
  }

  // ── Status & confidence ──────────────────────────────────────────────────
  let status: ConfidenceStatus
  let confidence: number
  let reasoning: string

  const isStale = daysSince(best.source_date) > STALE_DAYS[best.source_type]

  if (conflicting.length === 0) {
    // No active conflicts
    if (deprecated.length > 0 && agreeing.length >= 1) {
      // Old value was explicitly killed; active sources agree on the new value
      status     = 'verified'
      confidence = CONF_VERIFIED_TOMBSTONE
      reasoning  = `Old value explicitly deprecated. ${agreeing.length} source${agreeing.length > 1 ? 's' : ''} confirm the new value.`
    } else if (agreeing.length >= 2) {
      const uniqueTypes = new Set(agreeing.map(e => e.source_type))
      if (uniqueTypes.size >= 2) {
        // True independent verification: sources from different origin types agree
        status     = 'verified'
        confidence = CONF_VERIFIED_BASE + Math.min(CONF_VERIFIED_MAX_BONUS, agreeing.length * 2)
        reasoning  = `${agreeing.length} independent sources (${agreeing.length} types) agree.`
      } else {
        // Same source type — corroborating but not independently verified
        status     = 'likely'
        confidence = CONF_CORROBORATED
        reasoning  = `${agreeing.length} sources agree, but all are ${best.source_type.replace(/_/g, ' ')} — not independently verified.`
      }
    } else if (isStale) {
      status     = 'stale'
      confidence = CONF_STALE
      reasoning  = `Only one source, last updated ${relativeDate(best.source_date)}. May be out of date.`
    } else {
      status     = 'likely'
      confidence = CONF_LIKELY_BASE + SOURCE_TRUST[best.source_type] * 8
      reasoning  = `Single source (${best.source_type.replace(/_/g, ' ')}) from ${relativeDate(best.source_date)}.`
    }
  } else {
    // Genuine conflict between active sources
    status     = 'conflicted'
    confidence = Math.round(CONF_CONFLICT_BASE + best.trustScore * 7)
    reasoning  = `${conflicting.length} source${conflicting.length > 1 ? 's' : ''} report a different value. Recommending highest-trust source (${best.source_type.replace(/_/g, ' ')}, ${relativeDate(best.source_date)}).`
  }

  return {
    field,
    bestValue,
    status,
    confidence: Math.min(99, Math.round(confidence)),
    agreementCount: agreeing.length,
    totalSources:   evidence.length,
    evidence:       [...active, ...deprecated], // active first
    reasoning,
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function reconcilePayer(payerData: PayerData, key?: string): ReconciledRoute {
  const { payer, sources } = payerData

  // Top-level route fields
  const fields: Record<string, ReconciledField> = {}
  for (const field of ROUTE_FIELDS) {
    const r = reconcileField(field, sources)
    if (r) fields[field] = r
  }

  // Collect all drugs mentioned across sources
  const allDrugs = new Set<string>()
  for (const source of sources) {
    const drugs = source.data.drugs as Record<string, unknown> | undefined
    if (drugs) Object.keys(drugs).forEach(d => allDrugs.add(d))
  }

  // Drug-specific fields — build pseudo-sources per drug
  const drugFields: Record<string, Record<string, ReconciledField>> = {}
  for (const drug of allDrugs) {
    drugFields[drug] = {}

    const drugSources: Source[] = sources
      .filter(s => (s.data.drugs as Record<string, unknown> | undefined)?.[drug])
      .map(s => ({
        ...s,
        data: (s.data.drugs as Record<string, Record<string, unknown>>)[drug],
      }))

    for (const field of DRUG_FIELDS) {
      const r = reconcileField(field, drugSources)
      if (r) drugFields[drug][field] = r
    }
  }

  // Most recent source date
  const lastUpdated = sources
    .map(s => s.source_date)
    .sort()
    .at(-1) ?? ''

  return {
    payer,
    payerKey: key ?? payer.toLowerCase().replace(/\s+/g, '_'),
    fields,
    drugFields,
    availableDrugs: Array.from(allDrugs).sort(),
    lastUpdated,
  }
}

// Critical fields drive the overall status — a conflict in fax_number matters
// more than a conflict in turnaround_standard_days
const CRITICAL_ROUTE_FIELDS = new Set([
  'submission_methods',
  'fax_number',
  'portal_url',
  'pa_form',
  'phone_urgent',
])

export function overallStatus(route: ReconciledRoute): ConfidenceStatus {
  const all      = Object.entries(route.fields)
  const critical = all.filter(([k]) => CRITICAL_ROUTE_FIELDS.has(k)).map(([, v]) => v)
  const rest     = all.filter(([k]) => !CRITICAL_ROUTE_FIELDS.has(k)).map(([, v]) => v)

  // Any conflict in a critical field immediately surfaces
  if (critical.some(f => f.status === 'conflicted')) return 'conflicted'
  // Non-critical conflicts are demoted to stale-level concern
  if (rest.some(f => f.status === 'conflicted'))     return 'stale'
  if (all.some(([, f]) => f.status === 'stale'))     return 'stale'
  if (critical.every(f => f.status === 'verified'))  return 'verified'
  return 'likely'
}
