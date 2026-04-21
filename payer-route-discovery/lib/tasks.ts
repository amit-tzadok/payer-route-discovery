const TASKS_KEY = 'ruma_tasks_v1'

export type TaskType   = 'pa_submission' | 'appeal' | 'resubmission' | 'follow_up'
export type TaskStatus = 'pending' | 'in_progress' | 'done'

export interface Task {
  id:          string
  type:        TaskType
  payerKey:    string
  payerName:   string
  drugName?:   string
  patientRef?: string
  deadline:    string     // YYYY-MM-DD
  notes?:      string
  status:      TaskStatus
  createdAt:   string     // YYYY-MM-DD
}

export const TASK_TYPE_META: Record<TaskType, { label: string; color: string; bg: string }> = {
  pa_submission: { label: 'PA Submission', color: 'text-ruma-blue',         bg: 'bg-ruma-blue/10'        },
  appeal:        { label: 'Appeal',         color: 'text-ruma-red',          bg: 'bg-ruma-red-bg'         },
  resubmission:  { label: 'Resubmission',  color: 'text-violet-700',        bg: 'bg-violet-50'           },
  follow_up:     { label: 'Follow-up',     color: 'text-ruma-green-dark',   bg: 'bg-ruma-green-bg'       },
}

// ── Deadline urgency helpers ──────────────────────────────────────────────────

export type Urgency = 'overdue' | 'today' | 'week' | 'upcoming'

export function getUrgency(deadline: string): Urgency {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due   = new Date(deadline + 'T00:00:00'); due.setHours(0, 0, 0, 0)
  const diff  = Math.round((due.getTime() - today.getTime()) / 86_400_000)
  if (diff <  0) return 'overdue'
  if (diff === 0) return 'today'
  if (diff <= 7)  return 'week'
  return 'upcoming'
}

export function daysUntil(deadline: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due   = new Date(deadline + 'T00:00:00'); due.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / 86_400_000)
}

export function formatDeadline(deadline: string): string {
  const d    = daysUntil(deadline)
  if (d < -1)  return `${Math.abs(d)} days late`
  if (d === -1) return 'Yesterday'
  if (d === 0)  return 'Due today'
  if (d === 1)  return 'Tomorrow'
  if (d <= 7)   return `${d} days`
  return new Date(deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── localStorage helpers ──────────────────────────────────────────────────────

export function loadTasks(): Task[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(TASKS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function saveTasks(tasks: Task[]): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)) } catch {}
}
