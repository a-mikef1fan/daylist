import type { Task, TaskStatus } from '@/lib/db/schema'

export const TASK_STATUSES: readonly TaskStatus[] = ['todo', 'in_progress', 'done']

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
}

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && (TASK_STATUSES as readonly string[]).includes(value)
}

// `completed` is the source of truth for "done", so the tracker and the list can never disagree
// (for example when a task is ticked off in the list view or by older code that only sets `completed`).
export function getTaskStatus(task: Pick<Task, 'completed' | 'status'>): TaskStatus {
  if (task.completed) return 'done'
  return task.status === 'in_progress' ? 'in_progress' : 'todo'
}

export type TaskProgress = {
  total: number
  todo: number
  inProgress: number
  done: number
  percent: number
}

export function getTaskProgress(tasks: Pick<Task, 'completed' | 'status'>[]): TaskProgress {
  let todo = 0
  let inProgress = 0
  let done = 0
  for (const task of tasks) {
    const status = getTaskStatus(task)
    if (status === 'done') done += 1
    else if (status === 'in_progress') inProgress += 1
    else todo += 1
  }
  const total = tasks.length
  return { total, todo, inProgress, done, percent: total === 0 ? 0 : Math.round((done / total) * 100) }
}
