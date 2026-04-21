'use client'

import type { ReconciledRoute, ReconciledField } from '@/lib/types'

interface Props {
  route: ReconciledRoute
}

interface QuarterData {
  label: string
  approvals: number
  denials: number
}

function collectEvents(route: ReconciledRoute) {
  const seen = new Set<string>()
  const events: { date: string; isDenial: boolean }[] = []

  const processFields = (fields: Record<string, ReconciledField>) => {
    for (const field of Object.values(fields)) {
      for (const ev of field.evidence) {
        if (!seen.has(ev.source_id)) {
          seen.add(ev.source_id)
          events.push({ date: ev.source_date, isDenial: ev.source_type === 'denial_letter' })
        }
      }
    }
  }

  processFields(route.fields)
  for (const drug of Object.values(route.drugFields)) {
    processFields(drug)
  }
  return events
}

function buildQuarters(events: { date: string; isDenial: boolean }[]): QuarterData[] {
  const map = new Map<string, QuarterData>()

  for (const ev of events) {
    const d = new Date(ev.date + 'T00:00:00')
    if (isNaN(d.getTime())) continue
    const q = Math.floor(d.getMonth() / 3) + 1
    const key = `${d.getFullYear()}-Q${q}`
    if (!map.has(key)) {
      map.set(key, { label: `Q${q} '${String(d.getFullYear()).slice(2)}`, approvals: 0, denials: 0 })
    }
    const entry = map.get(key)!
    if (ev.isDenial) entry.denials++
    else entry.approvals++
  }

  // Build a continuous quarter range so gaps between data points are visible
  const now = new Date()
  const currentQtr = { yr: now.getFullYear(), q: Math.floor(now.getMonth() / 3) + 1 }

  const dataKeys = Array.from(map.keys()).sort()
  const earliest = dataKeys[0]

  // Start 2 quarters before the earliest data point (or 6 quarters ago if no data)
  let start: { yr: number; q: number }
  if (earliest) {
    const [yr, q] = earliest.split('-Q').map(Number)
    start = { yr, q }
    for (let i = 0; i < 2; i++) {
      start.q--
      if (start.q < 1) { start.q = 4; start.yr-- }
    }
  } else {
    start = { yr: currentQtr.yr, q: currentQtr.q }
    for (let i = 0; i < 5; i++) {
      start.q--
      if (start.q < 1) { start.q = 4; start.yr-- }
    }
  }

  // Walk from start to current quarter, filling in every slot
  const range: [string, QuarterData][] = []
  const cursor = { ...start }
  while (
    cursor.yr < currentQtr.yr ||
    (cursor.yr === currentQtr.yr && cursor.q <= currentQtr.q)
  ) {
    const key = `${cursor.yr}-Q${cursor.q}`
    range.push([
      key,
      map.get(key) ?? { label: `Q${cursor.q} '${String(cursor.yr).slice(2)}`, approvals: 0, denials: 0 },
    ])
    cursor.q++
    if (cursor.q > 4) { cursor.q = 1; cursor.yr++ }
  }

  // Keep the most recent 8 quarters
  return range.slice(-8).map(([, v]) => v)
}

export default function ApprovalHistogram({ route }: Props) {
  const events  = collectEvents(route)
  const quarters = buildQuarters(events)

  const totalApprovals = events.filter(e => !e.isDenial).length
  const totalDenials   = events.filter(e => e.isDenial).length
  const total          = events.length
  const approvalRate   = total > 0 ? Math.round((totalApprovals / total) * 100) : 0
  const denialRate     = total > 0 ? Math.round((totalDenials   / total) * 100) : 0

  if (quarters.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-ruma-border p-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2">
          Approval History
        </p>
        <p className="text-[12px] text-gray-400 text-center py-3">No source history available</p>
      </div>
    )
  }

  const maxCount = Math.max(...quarters.map(q => q.approvals + q.denials), 1)

  return (
    <div className="bg-white rounded-lg border border-ruma-border p-4 h-full flex flex-col">
      {/* Header + summary */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
            Approval History
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">Source events by quarter</p>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <div className="text-right">
            <span className="font-bold text-ruma-green">{approvalRate}%</span>
            <span className="text-gray-400 ml-1">approval</span>
          </div>
          {totalDenials > 0 && (
            <div className="text-right">
              <span className="font-bold text-ruma-red">{denialRate}%</span>
              <span className="text-gray-400 ml-1">denials</span>
            </div>
          )}
        </div>
      </div>

      {/* Bar chart */}
      <div className="relative flex-1 min-h-0">
        {/* Horizontal gridlines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-0" aria-hidden>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="w-full border-t border-gray-100" />
          ))}
        </div>

        <div className="flex items-end gap-2 h-full relative">
          {quarters.map((q, i) => {
            const barTotal    = q.approvals + q.denials
            const heightFrac  = barTotal / maxCount
            const approvalPct = barTotal > 0 ? (q.approvals / barTotal) * 100 : 0
            const denialPct   = 100 - approvalPct

            return (
              <div
                key={i}
                className="flex-1 flex flex-col justify-end"
                style={{ height: '100%' }}
                title={`${q.label}: ${q.approvals} approval source${q.approvals !== 1 ? 's' : ''}, ${q.denials} denial letter${q.denials !== 1 ? 's' : ''}`}
              >
                <div
                  className="w-full flex flex-col-reverse rounded-md overflow-hidden transition-all duration-500"
                  style={{ height: `${Math.max(heightFrac * 100, barTotal > 0 ? 4 : 0)}%` }}
                >
                  {q.approvals > 0 && (
                    <div className="bg-ruma-green w-full" style={{ height: `${approvalPct}%` }} />
                  )}
                  {q.denials > 0 && (
                    <div className="bg-ruma-red w-full" style={{ height: `${denialPct}%` }} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex gap-2 mt-1">
        {quarters.map((q, i) => (
          <div key={i} className="flex-1 text-center text-[8px] text-gray-400 truncate">{q.label}</div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-ruma-border text-[10px] text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-sm bg-ruma-green shrink-0" />
          <span>Non-denial sources</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-sm bg-ruma-red shrink-0" />
          <span>Denial letters</span>
        </div>
      </div>
    </div>
  )
}
