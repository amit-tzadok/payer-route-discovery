'use client'

import { estimateRisk } from '@/lib/risk'
import { overallStatus } from '@/lib/reconciler'
import { PayerLogo } from '@/lib/logos'
import type { ReconciledRoute } from '@/lib/types'
import type { Task } from '@/lib/tasks'

interface Props {
  payerKey:  string
  route:     ReconciledRoute
  tasks:     Task[]
  onClick:   () => void
}

const STATUS_DOT: Record<string, string> = {
  verified:   'bg-ruma-green',
  stale:      'bg-amber-400',
  conflicted: 'bg-ruma-orange',
  unknown:    'bg-gray-300',
}

const RISK_BAR: Record<string, string> = {
  low:      'bg-ruma-blue',
  medium:   'bg-ruma-blue',
  high:     'bg-ruma-orange',
  critical: 'bg-red-500',
}

const RISK_TEXT: Record<string, string> = {
  low:      'text-ruma-blue',
  medium:   'text-ruma-blue',
  high:     'text-ruma-orange-dark',
  critical: 'text-red-600',
}

function humanizeMethod(raw: string): string {
  const base      = raw.split('_')[0]
  const qualifier = raw.split('_').slice(1).join(' ')
  const label     = base.charAt(0).toUpperCase() + base.slice(1)
  return qualifier ? `${label} (${qualifier})` : label
}

export default function PayerCard({ payerKey, route, tasks, onClick }: Props) {
  const risk   = estimateRisk(route, null)
  const status = overallStatus(route)

  const activeTasks  = tasks.filter(t => t.status !== 'done')
  const overdueTasks = tasks.filter(t => {
    if (t.status === 'done') return false
    const diff = Math.round((new Date(t.deadline + 'T00:00:00').setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86_400_000)
    return diff < 0
  })

  const methods: string[] = (() => {
    const f = route.fields['submission_methods']
    if (!f?.bestValue) return []
    const v = f.bestValue
    return Array.isArray(v) ? v as string[] : [String(v)]
  })()

  const standardDays = route.fields['turnaround_standard_days']?.bestValue ?? null
  const urgentHours  = route.fields['turnaround_urgent_hours']?.bestValue ?? null

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl border border-ruma-border hover:border-ruma-blue/40
        hover:shadow-md transition-all text-left group w-full overflow-hidden"
    >
      {/* Top accent bar based on risk */}
      <div
        className={`h-1 w-full ${RISK_BAR[risk.level]}`}
        style={{ opacity: 0.7 }}
      />

      <div className="px-4 py-4">
        {/* Header row: logo + name + status dot */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="rounded-lg overflow-hidden shrink-0">
              <PayerLogo payerKey={payerKey} size="lg" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-gray-900 leading-tight truncate group-hover:text-ruma-blue transition-colors">
                {route.payer}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${STATUS_DOT[status]}`} />
                <span className="text-[10px] text-gray-400 capitalize">{status}</span>
              </div>
            </div>
          </div>

          {/* Task badge */}
          {activeTasks.length > 0 && (
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0
              ${overdueTasks.length > 0
                ? 'bg-red-50 text-red-600'
                : 'bg-ruma-blue/10 text-ruma-blue'}`}
            >
              {overdueTasks.length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
              )}
              {activeTasks.length} task{activeTasks.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Risk bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Risk</span>
            <span className={`text-[11px] font-bold ${RISK_TEXT[risk.level]}`}>
              {risk.score} · <span className="capitalize">{risk.level}</span>
            </span>
          </div>
          <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full ${RISK_BAR[risk.level]} transition-all`}
              style={{ width: `${risk.score}%` }}
            />
          </div>
        </div>

        {/* Turnaround */}
        <div className="flex items-center gap-3 mb-3">
          {standardDays !== null && (
            <div className="flex items-center gap-1 text-[11px] text-gray-500">
              <svg className="w-3 h-3 text-gray-300" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M6 3.5V6l1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              <span className="font-semibold text-gray-700">
                {typeof standardDays === 'number' ? `${standardDays}d` : String(standardDays)}
              </span>
              <span>standard</span>
            </div>
          )}
          {urgentHours !== null && (
            <div className="flex items-center gap-1 text-[11px] text-gray-500">
              <svg className="w-3 h-3 text-ruma-blue/50" viewBox="0 0 12 12" fill="none">
                <path d="M6 1v4l2.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
              </svg>
              <span className="font-semibold text-gray-700">
                {typeof urgentHours === 'number' ? `${urgentHours}h` : String(urgentHours)}
              </span>
              <span>urgent</span>
            </div>
          )}
          {standardDays === null && urgentHours === null && (
            <span className="text-[11px] text-gray-300 italic">No timeline data</span>
          )}
        </div>

        {/* Submission methods */}
        <div className="flex flex-wrap gap-1">
          {methods.length > 0 ? methods.map(m => (
            <span
              key={m}
              className="px-2 py-0.5 rounded-full bg-ruma-blue/8 text-[10px] text-ruma-blue font-medium"
            >
              {humanizeMethod(m)}
            </span>
          )) : (
            <span className="text-[10px] text-gray-300 italic">No submission methods</span>
          )}
        </div>
      </div>
    </button>
  )
}
