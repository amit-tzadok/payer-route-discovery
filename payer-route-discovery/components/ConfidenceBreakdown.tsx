'use client'

import type { ReconciledField } from '@/lib/types'
import { useT } from '@/lib/i18n'

interface Props {
  fields: Record<string, ReconciledField>
  label?: string
}

export default function ConfidenceBreakdown({ fields, label }: Props) {
  const t = useT()
  const stats = {
    verified: Object.values(fields).filter(f => f.status === 'verified').length,
    likely: Object.values(fields).filter(f => f.status === 'likely').length,
    conflicted: Object.values(fields).filter(f => f.status === 'conflicted').length,
    stale: Object.values(fields).filter(f => f.status === 'stale').length,
  }

  const total = Object.keys(fields).length
  const verifiedPct = Math.round((stats.verified / total) * 100)
  const likelyPct = Math.round((stats.likely / total) * 100)
  const conflictPct = Math.round((stats.conflicted / total) * 100)

  return (
    <div className="bg-white rounded-lg border border-ruma-border p-4">
      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-4">
        {label ?? 'Data Quality'}
      </p>

      {/* Stacked bar */}
      <div className="flex h-2 rounded-full overflow-hidden mb-4 bg-gray-200">
        {verifiedPct > 0 && (
          <div
            className="bg-ruma-green transition-all duration-500 ease-out"
            style={{ width: `${verifiedPct}%` }}
          />
        )}
        {likelyPct > 0 && (
          <div
            className="bg-ruma-cyan transition-all duration-500 ease-out"
            style={{ width: `${likelyPct}%` }}
          />
        )}
        {conflictPct > 0 && (
          <div
            className="bg-ruma-orange transition-all duration-500 ease-out"
            style={{ width: `${conflictPct}%` }}
          />
        )}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-3 text-[11px]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-ruma-green" />
          <span className="text-gray-700">
            <span className="font-bold text-gray-900">{stats.verified}</span> {t.status.verified}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-ruma-cyan" />
          <span className="text-gray-700">
            <span className="font-bold text-gray-900">{stats.likely}</span> {t.status.likely}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-ruma-orange" />
          <span className="text-gray-700">
            <span className="font-bold text-gray-900">{stats.conflicted}</span> {t.status.conflicted}
          </span>
        </div>
      </div>
    </div>
  )
}
