'use client'

import { useMemo } from 'react'
import { estimateRisk } from '@/lib/risk'
import { overallStatus } from '@/lib/reconciler'
import PayerCard from './PayerCard'
import type { ReconciledRoute } from '@/lib/types'
import type { Task } from '@/lib/tasks'

interface Props {
  payers:        string[]
  routes:        Record<string, ReconciledRoute>
  tasks:         Task[]
  onPayerSelect: (payerKey: string) => void
}

export default function Dashboard({ payers, routes, tasks, onPayerSelect }: Props) {
  const stats = useMemo(() => {
    const riskLevels = payers.map(k => estimateRisk(routes[k], null).level)
    const statuses   = payers.map(k => overallStatus(routes[k]))

    return {
      total:     payers.length,
      highRisk:  riskLevels.filter(l => l === 'high' || l === 'critical').length,
      conflicts: statuses.filter(s => s === 'conflicted').length,
      stale:     statuses.filter(s => s === 'stale').length,
      activeTasks:  tasks.filter(t => t.status !== 'done').length,
      overdueTasks: tasks.filter(t => {
        if (t.status === 'done') return false
        const diff = Math.round((new Date(t.deadline + 'T00:00:00').setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86_400_000)
        return diff < 0
      }).length,
    }
  }, [payers, routes, tasks])

  const tasksByPayer = useMemo(() => {
    const map: Record<string, Task[]> = {}
    for (const t of tasks) {
      map[t.payerKey] = [...(map[t.payerKey] ?? []), t]
    }
    return map
  }, [tasks])

  return (
    <div className="space-y-5">

      {/* ── Stats strip ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Payers"          value={stats.total}        color="text-gray-900" />
        <StatCard label="Active Tasks"    value={stats.activeTasks}  color="text-ruma-blue" />
        <StatCard label="Overdue"         value={stats.overdueTasks} color={stats.overdueTasks > 0 ? 'text-red-500' : 'text-gray-400'} />
        <StatCard label="High / Critical" value={stats.highRisk}     color={stats.highRisk > 0 ? 'text-ruma-orange-dark' : 'text-gray-400'} />
        <StatCard label="Conflicts"       value={stats.conflicts}    color={stats.conflicts > 0 ? 'text-amber-600' : 'text-gray-400'} />
        <StatCard label="Stale Data"      value={stats.stale}        color={stats.stale > 0 ? 'text-amber-500' : 'text-gray-400'} />
      </div>

      {/* ── Payer grid ─────────────────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">
          All Payers
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {payers.map(key => (
            <PayerCard
              key={key}
              payerKey={key}
              route={routes[key]}
              tasks={tasksByPayer[key] ?? []}
              onClick={() => onPayerSelect(key)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-ruma-border px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{label}</p>
      <p className={`text-[26px] font-bold leading-none tabular-nums ${color}`}>{value}</p>
    </div>
  )
}
