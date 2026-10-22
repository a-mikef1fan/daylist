// Pure helpers shared by the goals server actions and UI.

import type { GoalProgress } from '@/lib/db/schema'

export const GOAL_TITLE_MAX = 120
export const GOAL_DESCRIPTION_MAX = 500

// Local-calendar 'YYYY-MM-DD' for a Date.
export function localDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatGoalDate(value: string) {
  const date = new Date(`${value}T12:00:00`)
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

// True for a real calendar date written as 'YYYY-MM-DD'.
export function isValidDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

// Counts completed and total tasks per goal id. Tasks with no goal are ignored.
export function getGoalProgress(tasks: { goalId: string | null; completed: boolean }[]) {
  const progress = new Map<string, GoalProgress>()
  for (const task of tasks) {
    if (!task.goalId) continue
    const entry = progress.get(task.goalId) ?? { completed: 0, total: 0 }
    entry.total += 1
    if (task.completed) entry.completed += 1
    progress.set(task.goalId, entry)
  }
  return progress
}
