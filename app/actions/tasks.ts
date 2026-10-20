'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tasks, type TaskPriority } from '@/lib/db/schema'
import { encodeRepeat, isTaskRepeat, nextOccurrence, parseRepeat, toTaskView, type TaskRepeat } from '@/lib/recurrence'
import { and, asc, desc, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function getTasks() {
  const userId = await getUserId()
  const rows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, userId))
    .orderBy(asc(tasks.completed), desc(tasks.createdAt))
  return rows.map(toTaskView)
}

export async function createTask(input: {
  title: string
  dueDate: string | null
  priority: TaskPriority
  repeat?: TaskRepeat
}) {
  const userId = await getUserId()
  if (!input || typeof input !== 'object') throw new Error('Invalid task')
  const title = typeof input.title === 'string' ? input.title.trim() : ''
  if (title.length < 1 || title.length > 180) throw new Error('Invalid task title')
  if (!['low', 'normal', 'high'].includes(input.priority)) {
    throw new Error('Invalid task priority')
  }
  if (input.dueDate !== null) {
    if (typeof input.dueDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) {
      throw new Error('Invalid due date')
    }
    const parsedDate = new Date(`${input.dueDate}T00:00:00.000Z`)
    if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== input.dueDate) {
      throw new Error('Invalid due date')
    }
  }

  const repeat = input.repeat ?? 'none'
  if (!isTaskRepeat(repeat)) throw new Error('Invalid repeat option')
  if (repeat !== 'none' && input.dueDate === null) {
    throw new Error('A repeating task needs a due date')
  }

  const [task] = await db
    .insert(tasks)
    .values({
      id: crypto.randomUUID(),
      userId,
      title,
      dueDate: input.dueDate,
      priority: input.priority,
      description: encodeRepeat(repeat, null),
    })
    .returning()
  revalidatePath('/')
  return toTaskView(task)
}

// `today` is the caller's local 'YYYY-MM-DD' date, used so a late completion of a
// recurring task schedules its next occurrence in the future, not the past.
export async function updateTaskCompletion(id: string, completed: boolean, today?: string) {
  const userId = await getUserId()
  if (typeof id !== 'string' || id.length > 80 || typeof completed !== 'boolean') {
    throw new Error('Invalid task update')
  }
  if (today !== undefined && (typeof today !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(today))) {
    throw new Error('Invalid date')
  }
  const result = await db.transaction(async (tx) => {
    const [task] = await tx
      .update(tasks)
      .set({ completed, updatedAt: new Date() })
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning()
    if (!task) throw new Error('Task not found')

    // Completing a recurring task leaves it in the Completed list and adds the
    // next occurrence as a new open task. Skip it if that occurrence already
    // exists (for example after un-completing and completing again).
    let next: typeof task | null = null
    const { repeat } = parseRepeat(task.description)
    const nextDue =
      completed && task.dueDate
        ? nextOccurrence(task.dueDate, repeat, today ?? new Date().toISOString().slice(0, 10))
        : null
    if (nextDue && task.description) {
      const [existing] = await tx
        .select({ id: tasks.id })
        .from(tasks)
        .where(
          and(
            eq(tasks.userId, userId),
            eq(tasks.title, task.title),
            eq(tasks.description, task.description),
            eq(tasks.dueDate, nextDue),
            eq(tasks.completed, false),
          ),
        )
        .limit(1)
      if (!existing) {
        ;[next] = await tx
          .insert(tasks)
          .values({
            id: crypto.randomUUID(),
            userId,
            title: task.title,
            description: task.description,
            dueDate: nextDue,
            priority: task.priority,
          })
          .returning()
      }
    }
    return { task: toTaskView(task), next: next && toTaskView(next) }
  })
  revalidatePath('/')
  return result
}

export async function deleteTask(id: string) {
  const userId = await getUserId()
  if (typeof id !== 'string' || id.length < 1 || id.length > 80) throw new Error('Invalid task')
  await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
  revalidatePath('/')
}
