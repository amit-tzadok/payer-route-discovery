'use client'

import type { SourceType } from '@/lib/types'
import { useT } from '@/lib/i18n'

const STYLE: Record<SourceType, string> = {
  denial_letter:    'bg-red-50 text-red-600 ring-1 ring-red-200',
  phone_transcript: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  web_page:         'bg-blue-50 text-blue-600 ring-1 ring-blue-200',
  provider_manual:  'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
}

interface Props {
  type: SourceType
  short?: boolean
}

export default function SourceTypeBadge({ type, short }: Props) {
  const t = useT()
  const { label, short: abbr } = t.sourceTypes[type]
  return (
    <span
      className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${STYLE[type]}`}
      title={`${label} — ${t.trustRank[type]}`}
    >
      {short ? abbr : label}
    </span>
  )
}
