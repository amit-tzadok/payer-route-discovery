'use client'

import type { ConfidenceStatus } from '@/lib/types'
import { useT } from '@/lib/i18n'

const STYLE: Record<ConfidenceStatus, { className: string; dot: string }> = {
  verified:   { className: 'bg-ruma-green-bg text-ruma-green-dark', dot: 'bg-ruma-green' },
  likely:     { className: 'bg-ruma-cyan-light text-ruma-cyan-dark',     dot: 'bg-ruma-cyan' },
  conflicted: { className: 'bg-ruma-orange-bg text-ruma-orange-dark', dot: 'bg-ruma-orange' },
  stale:      { className: 'bg-gray-100 text-gray-700',            dot: 'bg-gray-400' },
  deprecated: { className: 'bg-ruma-red-bg text-ruma-red-dark',           dot: 'bg-ruma-red' },
  overridden: { className: 'bg-ruma-orange-bg text-ruma-orange-dark', dot: 'bg-ruma-orange' },
}

interface Props {
  status: ConfidenceStatus
  confidence?: number
}

export default function ConfidenceBadge({ status, confidence }: Props) {
  const t = useT()
  const s = STYLE[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${s.className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
      {t.status[status]}
      {confidence !== undefined && (
        <span className="opacity-60 font-medium text-[10px]">{confidence}%</span>
      )}
    </span>
  )
}
