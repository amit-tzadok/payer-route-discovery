'use client'

import { relativeDate, overallStatus } from '@/lib/reconciler'
import { ROUTE_SECTIONS, DRUG_SECTIONS, FIELD_LABELS } from '@/lib/data'
import { estimateRisk } from '@/lib/risk'
import { useT } from '@/lib/i18n'
import type { ReconciledField, ReconciledRoute } from '@/lib/types'
import FieldRow          from './FieldRow'
import ConfidenceBadge   from './ConfidenceBadge'
import ExportButton      from './ExportButton'
import ApprovalHistogram from './ApprovalHistogram'
import RiskPanel         from './RiskPanel'
import { PayerLogo }     from '@/lib/logos'

interface Props {
  route:        ReconciledRoute
  selectedDrug: string | null
  onAddDrug:    (drugName: string, fields: Record<string, ReconciledField>) => void
  onAddSource:  () => void
}

const RISK_COLOR: Record<string, string> = {
  low:      'text-ruma-green-dark',
  medium:   'text-amber-600',
  high:     'text-ruma-orange-dark',
  critical: 'text-red-600',
}

export default function RoutePanel({ route, selectedDrug, onAddDrug, onAddSource }: Props) {
  const t = useT()

  const drugData = selectedDrug ? route.drugFields[selectedDrug] : null
  const status   = overallStatus(route)
  const risk     = estimateRisk(route, selectedDrug)

  // KPI counts
  const fieldValues    = Object.values(route.fields)
  const allEvidence    = fieldValues.flatMap(f => f.evidence)
  const sourceCount    = new Set(allEvidence.map(e => e.source_id)).size
  const verifiedCount  = fieldValues.filter(f => f.status === 'verified').length
  const conflictCount  = fieldValues.filter(f => f.status === 'conflicted').length

  // Conflict / stale explanation
  const statusNote = (() => {
    if (status === 'conflicted') {
      const names = Object.entries(route.fields)
        .filter(([, f]) => f.status === 'conflicted')
        .map(([k]) => FIELD_LABELS[k] ?? k.replace(/_/g, ' '))
      return names.length > 0 ? `Sources disagree on: ${names.join(' · ')}` : null
    }
    if (status === 'stale') {
      const names = Object.entries(route.fields)
        .filter(([, f]) => f.status === 'stale' || f.status === 'conflicted')
        .map(([k]) => FIELD_LABELS[k] ?? k.replace(/_/g, ' '))
      return names.length > 0 ? `Outdated data in: ${names.join(' · ')}` : null
    }
    return null
  })()

  return (
    <div className="space-y-4">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-ruma-border border-l-4 border-l-ruma-blue
        px-6 py-5 flex items-center justify-between gap-4 shadow-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="rounded-xl overflow-hidden shrink-0 shadow-sm">
              <PayerLogo payerKey={route.payerKey} size="xl" />
            </div>
            <h1 className="text-[22px] font-bold text-gray-900 tracking-tight truncate leading-tight">
              {route.payer}
            </h1>
            {selectedDrug && (
              <>
                <span className="text-gray-300">·</span>
                <span className="px-2.5 py-0.5 rounded-full bg-ruma-cyan-light text-ruma-cyan-dark text-[12px] font-semibold">
                  {selectedDrug}
                </span>
              </>
            )}
          </div>
          <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
            <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3 shrink-0 opacity-50">
              <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M6 3.5V6l1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            {t.mostRecentData} {relativeDate(route.lastUpdated)}
          </p>
          {statusNote && (
            <p className={`text-[11px] mt-1.5 flex items-center gap-1.5 font-medium
              ${status === 'conflicted' ? 'text-ruma-orange-dark' : 'text-gray-400'}`}>
              <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3 shrink-0">
                <path d="M6 1L11 10H1L6 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                <path d="M6 5v2.5M6 9v.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              {statusNote}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ConfidenceBadge status={status} />
          <button
            onClick={onAddSource}
            title="Add a source document to this payer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium
              border border-ruma-border text-gray-600 hover:bg-ruma-bg hover:border-gray-300 transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            Add Source
          </button>
          <ExportButton route={route} selectedDrug={selectedDrug} />
        </div>
      </div>

      {/* ── KPI stats ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        {/* Risk score */}
        <div className="bg-white rounded-xl border border-ruma-border px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Risk Score</p>
          <p className={`text-[26px] font-bold leading-none tabular-nums ${RISK_COLOR[risk.level]}`}>
            {risk.score}
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700
                ${risk.level === 'critical' ? 'bg-red-500' :
                  risk.level === 'high'     ? 'bg-ruma-orange' :
                  risk.level === 'medium'   ? 'bg-amber-400' : 'bg-ruma-green'}`}
              style={{ width: `${risk.score}%` }}
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5 capitalize">{risk.level} risk</p>
        </div>

        {/* Sources */}
        <div className="bg-white rounded-xl border border-ruma-border px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Sources</p>
          <p className="text-[26px] font-bold text-gray-900 leading-none tabular-nums">{sourceCount}</p>
          <p className="text-[11px] text-gray-400 mt-3">documents on file</p>
        </div>

        {/* Field confidence */}
        <div className="bg-white rounded-xl border border-ruma-border px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Verified Fields</p>
          <p className="text-[26px] font-bold text-gray-900 leading-none tabular-nums">
            {verifiedCount}
            <span className="text-[14px] text-gray-400 font-medium"> / {fieldValues.length}</span>
          </p>
          <p className={`text-[11px] mt-3 font-medium
            ${conflictCount > 0 ? 'text-ruma-orange-dark' : 'text-ruma-green-dark'}`}>
            {conflictCount > 0 ? `${conflictCount} conflict${conflictCount > 1 ? 's' : ''}` : 'No conflicts'}
          </p>
        </div>

        {/* Drugs */}
        <div className="bg-white rounded-xl border border-ruma-border px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Drugs</p>
          <p className="text-[26px] font-bold text-gray-900 leading-none tabular-nums">
            {route.availableDrugs.length}
          </p>
          <p className="text-[11px] text-ruma-cyan-dark mt-3 font-medium truncate">
            {route.availableDrugs.length > 0
              ? route.availableDrugs.slice(0, 2).join(', ') + (route.availableDrugs.length > 2 ? '…' : '')
              : 'None on file'}
          </p>
        </div>
      </div>

      {/* ── Charts: Histogram + Risk side-by-side ─────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div id="section-approval-history" className="h-full">
          <ApprovalHistogram route={route} />
        </div>
        <div id="section-risk" className="h-full">
          <RiskPanel route={route} selectedDrug={selectedDrug} />
        </div>
      </div>

      {/* ── Route sections grid ────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        {ROUTE_SECTIONS.map(section => {
          const rows = section.fields
            .map(f => ({ key: f, field: route.fields[f] }))
            .filter(({ field }) => !!field)
          if (rows.length === 0) return null

          return (
            <div key={section.label} id={`section-${section.label.toLowerCase()}`}
              className="bg-white rounded-xl border border-ruma-border overflow-hidden">
              <div className="px-5 py-3 border-b border-ruma-border bg-gray-50">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
                  {t.sections[section.label] ?? section.label}
                </h2>
              </div>
              <div className="divide-y divide-ruma-border">
                {rows.map(({ key, field }) => (
                  <FieldRow key={key} fieldKey={key} field={field} payerName={route.payer} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Drug-specific grid ─────────────────────────────────────── */}
      {drugData && Object.keys(drugData).length > 0 && (
        <>
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-ruma-border" />
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold shrink-0">
              {t.drugSpecific} · {selectedDrug}
            </span>
            <div className="flex-1 h-px bg-ruma-border" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {DRUG_SECTIONS.map(section => {
              const rows = section.fields
                .map(f => ({ key: f, field: drugData[f] }))
                .filter(({ field }) => !!field)
              if (rows.length === 0) return null

              return (
                <div key={section.label} id={`section-drug-${section.label.toLowerCase()}`}
                  className="bg-white rounded-xl border border-ruma-border overflow-hidden">
                  <div className="px-5 py-2.5 border-b border-ruma-border bg-gray-50">
                    <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      {t.sections[section.label] ?? section.label}
                    </h2>
                  </div>
                  <div className="divide-y divide-ruma-border">
                    {rows.map(({ key, field }) => (
                      <FieldRow key={key} fieldKey={key} field={field} payerName={route.payer}
                        drugName={selectedDrug ?? undefined} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
