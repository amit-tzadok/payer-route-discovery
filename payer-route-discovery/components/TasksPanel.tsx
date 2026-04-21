'use client'

import { useState } from 'react'
import {
  TASK_TYPE_META, getUrgency, formatDeadline, daysUntil,
  type Task, type TaskType, type Urgency,
} from '@/lib/tasks'

interface Props {
  tasks:        Task[]
  onAddTask:    () => void
  onSelectPayer: (payerKey: string) => void
  onStatusChange: (taskId: string, status: Task['status']) => void
  onDeleteTask:   (taskId: string) => void
}

const URGENCY_META: Record<Urgency, { label: string; color: string; bg: string }> = {
  overdue:  { label: 'Overdue',    color: 'text-red-600',         bg: 'bg-red-50'    },
  today:    { label: 'Due Today',  color: 'text-ruma-orange-dark', bg: 'bg-amber-50'  },
  week:     { label: 'This Week',  color: 'text-ruma-blue',        bg: 'bg-blue-50'   },
  upcoming: { label: 'Upcoming',   color: 'text-gray-500',         bg: 'bg-gray-50'   },
}

const URGENCY_ORDER: Urgency[] = ['overdue', 'today', 'week', 'upcoming']

export default function TasksPanel({ tasks, onAddTask, onSelectPayer, onStatusChange, onDeleteTask }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [showDone,  setShowDone]  = useState(false)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  const activeTasks = tasks.filter(t => t.status !== 'done')
  const doneTasks   = tasks.filter(t => t.status === 'done')

  // Group active tasks by urgency
  const groups = URGENCY_ORDER.map(urgency => ({
    urgency,
    items: activeTasks.filter(t => getUrgency(t.deadline) === urgency),
  })).filter(g => g.items.length > 0)

  const toggleCollapse = (key: string) => {
    setCollapsed(prev => {
      const n = new Set(prev)
      n.has(key) ? n.delete(key) : n.add(key)
      return n
    })
  }

  return (
    <div className="flex flex-col h-full bg-white border-l border-ruma-border">

      {/* Panel header */}
      <div className="px-4 py-3 border-b border-ruma-border shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[13px] font-bold text-gray-900">Priority Board</h2>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {activeTasks.length} active · {doneTasks.length} done
            </p>
          </div>
          <button
            onClick={onAddTask}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold
              bg-ruma-blue text-white hover:bg-ruma-blue-light transition-colors"
          >
            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
              <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            Add
          </button>
        </div>
      </div>

      {/* Task groups */}
      <div className="flex-1 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 px-4 text-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-300" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M7 9h6M7 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M7 2v3M13 2v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-[12px] text-gray-400 font-medium">No tasks yet</p>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              Track PA submissions, appeals, and follow-ups with deadlines.
            </p>
            <button
              onClick={onAddTask}
              className="mt-1 px-4 py-2 text-[12px] font-semibold bg-ruma-blue text-white
                rounded-lg hover:bg-ruma-blue-light transition-colors"
            >
              Add your first task
            </button>
          </div>
        ) : (
          <div className="divide-y divide-ruma-border">

            {groups.map(({ urgency, items }) => {
              const meta       = URGENCY_META[urgency]
              const isCollapsed = collapsed.has(urgency)

              return (
                <div key={urgency}>
                  {/* Group header */}
                  <button
                    onClick={() => toggleCollapse(urgency)}
                    className="w-full flex items-center justify-between px-4 py-2.5
                      hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${meta.color}`}>
                        {meta.label}
                      </span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
                        {items.length}
                      </span>
                    </div>
                    <svg
                      className={`w-3 h-3 text-gray-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                      viewBox="0 0 12 12" fill="none"
                    >
                      <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>

                  {/* Task items */}
                  {!isCollapsed && items.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      urgency={urgency}
                      isMenuOpen={activeMenu === task.id}
                      onMenuToggle={() => setActiveMenu(prev => prev === task.id ? null : task.id)}
                      onMenuClose={() => setActiveMenu(null)}
                      onPayerClick={() => { onSelectPayer(task.payerKey); setActiveMenu(null) }}
                      onMarkDone={() => { onStatusChange(task.id, 'done'); setActiveMenu(null) }}
                      onMarkPending={() => { onStatusChange(task.id, 'pending'); setActiveMenu(null) }}
                      onDelete={() => { onDeleteTask(task.id); setActiveMenu(null) }}
                    />
                  ))}
                </div>
              )
            })}

            {/* Done tasks */}
            {doneTasks.length > 0 && (
              <div>
                <button
                  onClick={() => setShowDone(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-2.5
                    hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300">Done</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">
                      {doneTasks.length}
                    </span>
                  </div>
                  <svg
                    className={`w-3 h-3 text-gray-300 transition-transform ${showDone ? '' : '-rotate-90'}`}
                    viewBox="0 0 12 12" fill="none"
                  >
                    <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {showDone && doneTasks.map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    urgency="upcoming"
                    isDone
                    isMenuOpen={activeMenu === task.id}
                    onMenuToggle={() => setActiveMenu(prev => prev === task.id ? null : task.id)}
                    onMenuClose={() => setActiveMenu(null)}
                    onPayerClick={() => { onSelectPayer(task.payerKey); setActiveMenu(null) }}
                    onMarkDone={() => { onStatusChange(task.id, 'done'); setActiveMenu(null) }}
                    onMarkPending={() => { onStatusChange(task.id, 'pending'); setActiveMenu(null) }}
                    onDelete={() => { onDeleteTask(task.id); setActiveMenu(null) }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── TaskItem sub-component ────────────────────────────────────────────────────

interface ItemProps {
  task:         Task
  urgency:      Urgency
  isDone?:      boolean
  isMenuOpen:   boolean
  onMenuToggle: () => void
  onMenuClose:  () => void
  onPayerClick: () => void
  onMarkDone:   () => void
  onMarkPending: () => void
  onDelete:     () => void
}

function TaskItem({
  task, urgency, isDone = false,
  isMenuOpen, onMenuToggle, onMenuClose,
  onPayerClick, onMarkDone, onMarkPending, onDelete,
}: ItemProps) {
  const meta    = TASK_TYPE_META[task.type]
  const days    = daysUntil(task.deadline)
  const urgMeta = URGENCY_META[urgency]

  return (
    <div className={`px-4 py-3 hover:bg-gray-50/80 transition-colors relative
      ${isDone ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start gap-2.5">
        {/* Check circle */}
        <button
          onClick={isDone ? onMarkPending : onMarkDone}
          className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors
            ${isDone
              ? 'bg-ruma-green border-ruma-green'
              : 'border-gray-300 hover:border-ruma-green'}`}
          title={isDone ? 'Mark pending' : 'Mark done'}
        >
          {isDone && (
            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
              <path d="M2 5l2.5 2.5 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Type + payer */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
              {meta.label}
            </span>
            <button
              onClick={onPayerClick}
              className="text-[11px] font-semibold text-gray-700 hover:text-ruma-blue transition-colors truncate"
            >
              {task.payerName}
            </button>
          </div>

          {/* Drug + patient ref */}
          {(task.drugName || task.patientRef) && (
            <p className="text-[11px] text-gray-400 mt-0.5 truncate">
              {[task.drugName, task.patientRef].filter(Boolean).join(' · ')}
            </p>
          )}

          {/* Deadline */}
          <div className="flex items-center gap-1 mt-1">
            <svg className="w-2.5 h-2.5 text-gray-300" viewBox="0 0 10 10" fill="none">
              <rect x="1" y="2" width="8" height="7" rx="1.5" stroke="currentColor" strokeWidth="1"/>
              <path d="M3.5 1v2M6.5 1v2M1 4.5h8" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
            </svg>
            <span className={`text-[10px] font-medium ${isDone ? 'text-gray-400' : urgMeta.color}`}>
              {formatDeadline(task.deadline)}
            </span>
          </div>

          {/* Notes */}
          {task.notes && (
            <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{task.notes}</p>
          )}
        </div>

        {/* Kebab menu */}
        <div className="relative shrink-0">
          <button
            onClick={onMenuToggle}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
          >
            <svg className="w-3 h-3 text-gray-400" viewBox="0 0 12 12" fill="currentColor">
              <circle cx="6" cy="2" r="1"/><circle cx="6" cy="6" r="1"/><circle cx="6" cy="10" r="1"/>
            </svg>
          </button>

          {isMenuOpen && (
            <>
              {/* Click-away overlay */}
              <div className="fixed inset-0 z-10" onClick={onMenuClose} />
              <div className="absolute right-0 top-7 z-20 bg-white rounded-xl border border-ruma-border
                shadow-lg py-1 w-36 text-[12px]">
                <button
                  onClick={onPayerClick}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700"
                >
                  View payer
                </button>
                {isDone ? (
                  <button
                    onClick={onMarkPending}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700"
                  >
                    Mark pending
                  </button>
                ) : (
                  <button
                    onClick={onMarkDone}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-ruma-green-dark"
                  >
                    Mark done
                  </button>
                )}
                <button
                  onClick={onDelete}
                  className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-500"
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
