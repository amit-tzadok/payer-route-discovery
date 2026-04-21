'use client'

import { estimateRisk, type RiskLevel, type RiskFactor } from '@/lib/risk'
import type { ReconciledRoute } from '@/lib/types'

interface Props {
  route:        ReconciledRoute
  selectedDrug?: string | null
}

const LEVEL_META: Record<RiskLevel, { label: string; textColor: string; bgColor: string; barColor: string }> = {
  low:      { label: 'Low Risk',      textColor: 'text-ruma-green-dark', bgColor: 'bg-ruma-green-bg',  barColor: 'bg-ruma-green'   },
  medium:   { label: 'Medium Risk',   textColor: 'text-ruma-orange-dark',bgColor: 'bg-ruma-orange-bg', barColor: 'bg-ruma-orange'  },
  high:     { label: 'High Risk',     textColor: 'text-ruma-orange-dark',bgColor: 'bg-ruma-orange-bg', barColor: 'bg-ruma-orange'  },
  critical: { label: 'Critical Risk', textColor: 'text-red-700',         bgColor: 'bg-ruma-red-bg',    barColor: 'bg-ruma-red'     },
}

function FactorRow({ factor }: { factor: RiskFactor }) {
  const isPos  = factor.impact === 'positive'
  const isNeg  = factor.impact === 'negative'
  const dotCls = isPos ? 'bg-ruma-green' : isNeg ? 'bg-ruma-red' : 'bg-gray-300'

  return (
    <div className="flex items-start gap-2.5 py-2.5">
      <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white ${dotCls}`} />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium text-gray-800 leading-tight">{factor.label}</p>
        <p className="text-[11px] text-gray-500 leading-tight mt-0.5">{factor.detail}</p>
      </div>
      {factor.points !== 0 && (
        <span className={`
          text-[10px] font-bold shrink-0 px-1.5 py-0.5 rounded-full tabular-nums
          ${factor.points > 0 ? 'bg-ruma-red-bg text-ruma-red' : 'bg-ruma-green-bg text-ruma-green-dark'}
        `}>
          {factor.points > 0 ? '+' : ''}{factor.points}
        </span>
      )}
    </div>
  )
}

export default function RiskPanel({ route, selectedDrug }: Props) {
  const risk = estimateRisk(route, selectedDrug)
  const meta = LEVEL_META[risk.level]

  return (
    <div className="bg-white rounded-xl border border-ruma-border overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3 border-b border-ruma-border bg-gray-50 flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
          Risk Assessment
        </h2>
        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${meta.bgColor} ${meta.textColor}`}>
          {meta.label}
        </span>
      </div>

      <div className="px-6 py-4">
        {/* Score bar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${meta.barColor}`}
              style={{ width: `${risk.score}%` }}
            />
          </div>
          <span className="text-[13px] font-bold text-gray-700 w-14 text-right tabular-nums">
            {risk.score} / 100
          </span>
        </div>

        {/* Factors list */}
        <div className="divide-y divide-gray-100">
          {risk.factors.map((f, i) => (
            <FactorRow key={i} factor={f} />
          ))}
        </div>
      </div>
    </div>
  )
}
