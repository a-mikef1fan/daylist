import type { TaskPriority } from '@/lib/db/schema'

export const TASK_TITLE_MAX_LENGTH = 180
export const TASK_PRIORITIES: readonly TaskPriority[] = ['low', 'normal', 'high']

export type TaskFields = {
  title: string
  dueDate: string | null
  priority: TaskPriority
}

/**
 * Pure validation for editable task fields. Mirrors the rules createTask
 * applies (trimmed title of 1-180 chars, priority enum, YYYY-MM-DD real
 * calendar date or null) and throws the same error messages.
 */
export function parseTaskFields(input: unknown): TaskFields {
  if (!input || typeof input !== 'object') throw new Error('Invalid task')
  const { title: rawTitle, dueDate, priority } = input as Record<string, unknown>

  const title = typeof rawTitle === 'string' ? rawTitle.trim() : ''
  if (title.length < 1 || title.length > TASK_TITLE_MAX_LENGTH) throw new Error('Invalid task title')

  if (typeof priority !== 'string' || !(TASK_PRIORITIES as readonly string[]).includes(priority)) {
    throw new Error('Invalid task priority')
  }

  if (dueDate !== null) {
    if (typeof dueDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      throw new Error('Invalid due date')
    }
    const parsedDate = new Date(`${dueDate}T00:00:00.000Z`)
    if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== dueDate) {
      throw new Error('Invalid due date')
    }
  }

  return { title, dueDate, priority: priority as TaskPriority }
}
