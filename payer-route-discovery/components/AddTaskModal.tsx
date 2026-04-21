'use client'

import { useState } from 'react'
import { TASK_TYPE_META, type Task, type TaskType } from '@/lib/tasks'
import type { ReconciledRoute } from '@/lib/types'

interface Props {
  payers:           string[]
  routes:           Record<string, ReconciledRoute>
  initialPayerKey?: string
  onConfirm:        (task: Omit<Task, 'id' | 'createdAt'>) => void
  onCancel:         () => void
}

function today(): string {
  return new Date().toISOString().split('T')[0]
}

function addDays(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

export default function AddTaskModal({ payers, routes, initialPayerKey, onConfirm, onCancel }: Props) {
  const [type,       setType]       = useState<TaskType>('pa_submission')
  const [payerKey,   setPayerKey]   = useState(initialPayerKey ?? payers[0] ?? '')
  const [drugName,   setDrugName]   = useState('')
  const [patientRef, setPatientRef] = useState('')
  const [deadline,   setDeadline]   = useState(addDays(14))
  const [notes,      setNotes]      = useState('')

  // When type changes to 'appeal', suggest deadline from denial letter data
  const handleTypeChange = (t: TaskType) => {
    setType(t)
    if (t === 'appeal') {
      // Try to find appeal deadline from route sources
      const route = routes[payerKey]
      // Look for appeal_deadline_days in source data — heuristic from field notes
      const appealDays = route?.fields['turnaround_standard_days']?.bestValue
      if (appealDays && typeof appealDays === 'number') {
        setDeadline(addDays(appealDays))
      } else {
        setDeadline(addDays(30)) // default 30-day appeal window
      }
    }
  }

  const drugs = routes[payerKey]?.availableDrugs ?? []

  const handleConfirm = () => {
    if (!payerKey || !deadline) return
    onConfirm({
      type,
      payerKey,
      payerName: routes[payerKey]?.payer ?? payerKey,
      drugName:   drugName.trim()   || undefined,
      patientRef: patientRef.trim() || undefined,
      deadline,
      notes:      notes.trim()      || undefined,
      status:     'pending',
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-ruma-border shrink-0">
          <h2 className="text-[15px] font-bold text-gray-900">Add Task</h2>
          <p className="text-[12px] text-gray-400 mt-0.5">Track a PA submission, appeal, or follow-up</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">

          {/* Task type */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Task Type</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(TASK_TYPE_META) as [TaskType, typeof TASK_TYPE_META[TaskType]][]).map(([t, meta]) => (
                <button
                  key={t}
                  onClick={() => handleTypeChange(t)}
                  className={`px-3 py-2 rounded-xl border text-left transition-all
                    ${type === t
                      ? `border-current ${meta.bg} ${meta.color}`
                      : 'border-ruma-border text-gray-600 hover:border-gray-300 hover:bg-gray-50'}`}
                >
                  <p className="text-[12px] font-semibold">{meta.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Payer */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400 block mb-1.5">
              Payer
            </label>
            <div className="relative">
              <select
                value={payerKey}
                onChange={e => setPayerKey(e.target.value)}
                className="w-full appearance-none px-3 pr-8 py-2 text-[12px] border border-ruma-border
                  rounded-lg focus:outline-none focus:ring-2 focus:ring-ruma-blue/30 cursor-pointer"
              >
                {payers.map(k => (
                  <option key={k} value={k}>{routes[k]?.payer ?? k}</option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400"
                viewBox="0 0 12 12" fill="none">
                <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {/* Drug name */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400 block mb-1.5">
              Drug Name <span className="normal-case font-normal text-gray-300">(optional)</span>
            </label>
            {drugs.length > 0 ? (
              <div className="relative">
                <select
                  value={drugName}
                  onChange={e => setDrugName(e.target.value)}
                  className="w-full appearance-none px-3 pr-8 py-2 text-[12px] border border-ruma-border
                    rounded-lg focus:outline-none focus:ring-2 focus:ring-ruma-blue/30 cursor-pointer"
                >
                  <option value="">— none —</option>
                  {drugs.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400"
                  viewBox="0 0 12 12" fill="none">
                  <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            ) : (
              <input
                value={drugName}
                onChange={e => setDrugName(e.target.value)}
                placeholder="e.g. Dupixent"
                className="w-full px-3 py-2 text-[12px] border border-ruma-border rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-ruma-blue/30"
              />
            )}
          </div>

          {/* Deadline */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400 block mb-1.5">
              Deadline
            </label>
            <input
              type="date"
              value={deadline}
              min={today()}
              onChange={e => setDeadline(e.target.value)}
              className="w-full px-3 py-2 text-[12px] border border-ruma-border rounded-lg
                focus:outline-none focus:ring-2 focus:ring-ruma-blue/30"
            />
          </div>

          {/* Patient Ref */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400 block mb-1.5">
              Patient Ref <span className="normal-case font-normal text-gray-300">(optional)</span>
            </label>
            <input
              value={patientRef}
              onChange={e => setPatientRef(e.target.value)}
              placeholder="e.g. MRN-1042 or Jane D."
              className="w-full px-3 py-2 text-[12px] border border-ruma-border rounded-lg
                focus:outline-none focus:ring-2 focus:ring-ruma-blue/30"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400 block mb-1.5">
              Notes <span className="normal-case font-normal text-gray-300">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any relevant context or reminders…"
              rows={3}
              className="w-full px-3 py-2 text-[12px] border border-ruma-border rounded-lg resize-none
                focus:outline-none focus:ring-2 focus:ring-ruma-blue/30"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-ruma-border flex gap-3 shrink-0">
          <button
            onClick={onCancel}
            className="flex-1 py-2 text-[13px] font-medium text-gray-600 border border-ruma-border
              rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!payerKey || !deadline}
            className="flex-1 py-2 text-[13px] font-semibold text-white bg-ruma-blue
              rounded-xl disabled:opacity-40 hover:bg-ruma-blue-light transition-colors"
          >
            Add Task
          </button>
        </div>
      </div>
    </div>
  )
}
