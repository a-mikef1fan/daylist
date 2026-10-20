// Pure helpers for recurring tasks. Dates are 'YYYY-MM-DD' strings and the math
// is done in UTC so the result never shifts with the server's time zone.

import type { Task } from '@/lib/db/schema'

export const TASK_REPEATS = ['none', 'daily', 'weekdays', 'weekly'] as const
export type TaskRepeat = (typeof TASK_REPEATS)[number]

export const repeatLabels: Record<TaskRepeat, string> = {
  none: 'Does not repeat',
  daily: 'Daily',
  weekdays: 'Weekdays',
  weekly: 'Weekly',
}

export function isTaskRepeat(value: unknown): value is TaskRepeat {
  return typeof value === 'string' && (TASK_REPEATS as readonly string[]).includes(value)
}

// The repeat rule is stored in the existing nullable tasks.description column, as
// a one-line versioned marker at the start of the text, e.g. "[daylist:v1 repeat=weekly]".
// Any text after the marker's line break is the user's own description. Text that
// does not start with a valid marker (legacy or ordinary descriptions, other
// versions, unknown values) is treated as "does not repeat" and left untouched.
const MARKER = /^\[daylist:v1 repeat=(daily|weekdays|weekly)\](?:\n|$)/

export function parseRepeat(description: string | null): { repeat: TaskRepeat; text: string | null } {
  if (!description) return { repeat: 'none', text: description }
  const match = MARKER.exec(description)
  if (!match) return { repeat: 'none', text: description }
  return { repeat: match[1] as TaskRepeat, text: description.slice(match[0].length) || null }
}

export function encodeRepeat(repeat: TaskRepeat, text: string | null): string | null {
  if (repeat === 'none') return text
  return `[daylist:v1 repeat=${repeat}]${text ? `\n${text}` : ''}`
}

// A task as the UI sees it: the marker is stripped from `description` and the
// rule is exposed as `repeat`.
export type TaskView = Omit<Task, 'description'> & { description: string | null; repeat: TaskRepeat }

export function toTaskView(task: Task): TaskView {
  const { repeat, text } = parseRepeat(task.description)
  return { ...task, description: text, repeat }
}

function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00.000Z`)
  next.setUTCDate(next.getUTCDate() + days)
  return next.toISOString().slice(0, 10)
}

function isWeekend(date: string) {
  const day = new Date(`${date}T00:00:00.000Z`).getUTCDay()
  return day === 0 || day === 6
}

// Returns the due date of the next occurrence after completing a task that was
// due on `dueDate`, or null when the task does not repeat.
//
// `today` is the completer's local date. A task completed late never produces an
// occurrence in the past: daily and weekday tasks resume from the day after the
// later of the due date and today, and weekly tasks keep their weekday by
// stepping whole weeks from the due date until the result is after today.
export function nextOccurrence(dueDate: string, repeat: TaskRepeat, today: string) {
  if (repeat === 'none') return null
  if (repeat === 'weekly') {
    let next = addDays(dueDate, 7)
    while (next <= today) next = addDays(next, 7)
    return next
  }
  let next = addDays(dueDate > today ? dueDate : today, 1)
  if (repeat === 'weekdays') {
    while (isWeekend(next)) next = addDays(next, 1)
  }
  return next
}
