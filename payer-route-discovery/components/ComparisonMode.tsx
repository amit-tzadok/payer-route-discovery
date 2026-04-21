'use client'

import { useState } from 'react'
import { ROUTE_SECTIONS, FIELD_LABELS, formatFieldValue } from '@/lib/data'
import { relativeDate } from '@/lib/reconciler'
import type { ReconciledRoute, ReconciledField } from '@/lib/types'
import ConfidenceBadge from './ConfidenceBadge'

interface Props {
  route1:             ReconciledRoute
  payer1Key:          string
  allRoutes:          Record<string, ReconciledRoute>
  allPayers:          string[]
  getDisplayName:     (key: string) => string
  onClose:            () => void
}

function valuesEqual(a: ReconciledField | undefined, b: ReconciledField | undefined): boolean {
  if (!a || !b) return false
  const norm = (v: unknown) => {
    if (Array.isArray(v)) return JSON.stringify([...v].map(String).sort())
    return String(v ?? '').toLowerCase().trim()
  }
  return norm(a.bestValue) === norm(b.bestValue)
}

interface CellProps {
  field:    ReconciledField | undefined
  fieldKey: string
}

function Cell({ field, fieldKey }: CellProps) {
  if (!field) {
    return (
      <div className="flex-1 px-4 py-3 flex flex-col gap-1 min-w-0">
        <span className="text-[12px] text-gray-300 italic">No data</span>
      </div>
    )
  }

  const display = formatFieldValue(fieldKey, field.bestValue)
  const date    = field.evidence[0]?.source_date

  return (
    <div className="flex-1 px-4 py-3 flex flex-col gap-1.5 min-w-0">
      <span className="text-[13px] font-medium text-gray-900 break-words">{display}</span>
      <div className="flex items-center gap-1.5 flex-wrap">
        <ConfidenceBadge status={field.status} />
        {date && (
          <span className="text-[10px] text-gray-400">{relativeDate(date)}</span>
        )}
      </div>
    </div>
  )
}

export default function ComparisonMode({
  route1, payer1Key, allRoutes, allPayers, getDisplayName, onClose,
}: Props) {
  const otherPayers = allPayers.filter(k => k !== payer1Key)
  const [payer2Key, setPayer2Key] = useState(otherPayers[0] ?? payer1Key)
  const route2 = allRoutes[payer2Key]

  const allFields = ROUTE_SECTIONS.flatMap(s => s.fields)
  const diffCount = allFields.filter(f => {
    const f1 = route1.fields[f]
    const f2 = route2?.fields[f]
    return f1 && f2 && !valuesEqual(f1, f2)
  }).length

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl w-full max-w-4xl flex flex-col shadow-2xl" style={{ maxHeight: '85vh' }}>

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-ruma-border px-6 py-4 rounded-t-2xl z-10
          flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <h2 className="text-[15px] font-bold text-gray-900 shrink-0">Compare</h2>
            {/* Payer 1 — fixed */}
            <span className="px-2.5 py-1 bg-ruma-cyan-light text-ruma-cyan-dark rounded-full
              text-[12px] font-semibold shrink-0 truncate max-w-[160px]">
              {getDisplayName(payer1Key)}
            </span>
            <span className="text-gray-300 text-[12px] shrink-0">vs</span>
            {/* Payer 2 — selectable */}
            <select
              value={payer2Key}
              onChange={e => setPayer2Key(e.target.value)}
              className="px-2.5 py-1 rounded-full border border-ruma-border bg-white
                text-[12px] font-semibold text-gray-700 focus:outline-none
                focus:ring-2 focus:ring-ruma-blue/20 cursor-pointer"
            >
              {otherPayers.map(k => (
                <option key={k} value={k}>{getDisplayName(k)}</option>
              ))}
            </select>
            {diffCount > 0 && (
              <span className="text-[11px] font-semibold text-ruma-orange-dark bg-ruma-orange-bg
                px-2 py-0.5 rounded-full shrink-0">
                {diffCount} difference{diffCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0">
            <svg viewBox="0 0 12 12" fill="none" className="w-4 h-4 text-gray-500">
              <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Column labels */}
        <div className="flex border-b border-ruma-border bg-gray-50 text-[11px] font-bold
          uppercase tracking-widest text-gray-400">
          <div className="w-36 shrink-0 px-4 py-2.5" />
          <div className="flex-1 px-4 py-2.5 truncate">{getDisplayName(payer1Key)}</div>
          <div className="flex-1 px-4 py-2.5 truncate border-l border-ruma-border">
            {getDisplayName(payer2Key)}
          </div>
        </div>

        {/* Sections */}
        <div className="overflow-y-auto">
          {ROUTE_SECTIONS.map(section => {
            const rows = section.fields.filter(f =>
              route1.fields[f] || route2?.fields[f]
            )
            if (rows.length === 0) return null

            return (
              <div key={section.label}>
                {/* Section header */}
                <div className="px-4 py-2 bg-gray-50 border-y border-ruma-border">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    {section.label}
                  </span>
                </div>

                {/* Field rows */}
                {rows.map(fieldKey => {
                  const f1   = route1.fields[fieldKey]
                  const f2   = route2?.fields[fieldKey]
                  const diff = f1 && f2 && !valuesEqual(f1, f2)

                  return (
                    <div key={fieldKey}
                      className={`flex items-stretch border-b border-ruma-border last:border-b-0
                        ${diff ? 'bg-amber-50' : ''}`}
                    >
                      {/* Label */}
                      <div className="w-36 shrink-0 px-4 py-3 flex items-start">
                        <span className="text-[11px] font-semibold text-gray-500 leading-tight">
                          {FIELD_LABELS[fieldKey] ?? fieldKey.replace(/_/g, ' ')}
                        </span>
                        {diff && (
                          <span className="ml-1.5 mt-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        )}
                      </div>

                      {/* Payer 1 */}
                      <Cell field={f1} fieldKey={fieldKey} />

                      {/* Payer 2 */}
                      <div className="flex-1 border-l border-ruma-border">
                        <Cell field={f2} fieldKey={fieldKey} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
