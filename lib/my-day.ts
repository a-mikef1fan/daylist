import type { Task, TaskPriority, TaskStatus } from '@/lib/db/schema'

// Day the week starts on for the "This week" bucket (0 = Sunday, 1 = Monday).
export const WEEK_START_DAY = 1

export const statusOptions: { id: TaskStatus; label: string }[] = [
  { id: 'not_started', label: 'Not started' },
  { id: 'working', label: 'Working on it' },
  { id: 'stuck', label: 'Stuck' },
  { id: 'done', label: 'Done' },
]

export function statusLabel(status: TaskStatus) {
  return statusOptions.find((option) => option.id === status)?.label ?? 'Not started'
}

export type MyDayBucket = 'overdue' | 'today' | 'week' | 'later' | 'none' | 'done'

export const bucketOrder: MyDayBucket[] = ['overdue', 'today', 'week', 'later', 'none', 'done']

export const bucketLabels: Record<MyDayBucket, string> = {
  overdue: 'Overdue',
  today: 'Today',
  week: 'This week',
  later: 'Later',
  none: 'No date',
  done: 'Done earlier',
}

export function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function fromDateKey(value: string) {
  return new Date(`${value}T12:00:00`)
}

export function addDaysToKey(value: string, days: number) {
  const date = fromDateKey(value)
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

export function endOfWeekKey(today: Date) {
  const sinceStart = (today.getDay() - WEEK_START_DAY + 7) % 7
  const end = new Date(today)
  end.setDate(today.getDate() + (6 - sinceStart))
  return toDateKey(end)
}

export function bucketFor(task: Pick<Task, 'dueDate' | 'status'>, todayKey: string, weekEndKey: string): MyDayBucket {
  const done = task.status === 'done'
  if (!task.dueDate) return 'none'
  if (task.dueDate < todayKey) return done ? 'done' : 'overdue'
  if (task.dueDate === todayKey) return 'today'
  if (task.dueDate <= weekEndKey) return 'week'
  return 'later'
}

const priorityRank: Record<TaskPriority, number> = { high: 0, normal: 1, low: 2 }

// Within a group: earliest date first, then priority in label order (not alphabetical), then newest.
export function compareMyDayTasks(a: Task, b: Task) {
  if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate)
  const priority = (priorityRank[a.priority as TaskPriority] ?? 1) - (priorityRank[b.priority as TaskPriority] ?? 1)
  if (priority !== 0) return priority
  return b.createdAt.getTime() - a.createdAt.getTime()
}

export function groupMyDayTasks(tasks: Task[], now: Date) {
  const todayKey = toDateKey(now)
  const weekEndKey = endOfWeekKey(now)
  const groups: Record<MyDayBucket, Task[]> = { overdue: [], today: [], week: [], later: [], none: [], done: [] }
  for (const task of tasks) groups[bucketFor(task, todayKey, weekEndKey)].push(task)
  for (const key of bucketOrder) groups[key].sort(compareMyDayTasks)
  return groups
}

export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(fromDateKey(value))
}
