'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tasks, type TaskPriority, type TaskStatus } from '@/lib/db/schema'
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
  return db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, userId))
    .orderBy(asc(tasks.completed), desc(tasks.createdAt))
}

export async function createTask(input: {
  title: string
  dueDate: string | null
  priority: TaskPriority
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

  if (input.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) {
    throw new Error('Invalid due date')
  }

  const [task] = await db
    .insert(tasks)
    .values({
      id: crypto.randomUUID(),
      userId,
      title,
      dueDate: input.dueDate,
      priority: input.priority,
    })
    .returning()
  revalidatePath('/')
  return task
}

export async function updateTaskCompletion(id: string, completed: boolean) {
  const userId = await getUserId()
  if (typeof id !== 'string' || id.length > 80 || typeof completed !== 'boolean') {
    throw new Error('Invalid task update')
  }
  const [task] = await db
    .update(tasks)
    .set({ completed, status: completed ? 'done' : 'not_started', updatedAt: new Date() })
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .returning()
  if (!task) throw new Error('Task not found')
  revalidatePath('/')
  return task
}

export async function deleteTask(id: string) {
  const userId = await getUserId()
  if (typeof id !== 'string' || id.length > 80) throw new Error('Invalid task')
  await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
  revalidatePath('/')
}

const TASK_STATUSES: TaskStatus[] = ['not_started', 'working', 'stuck', 'done']

export async function updateTaskStatus(id: string, status: TaskStatus) {
  const userId = await getUserId()
  if (typeof id !== 'string' || id.length > 80 || !TASK_STATUSES.includes(status)) {
    throw new Error('Invalid task update')
  }
  // "completed" stays in sync so the existing list, counts and filters keep working.
  const [task] = await db
    .update(tasks)
    .set({ status, completed: status === 'done', updatedAt: new Date() })
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .returning()
  if (!task) throw new Error('Task not found')
  revalidatePath('/')
  return task
}

export async function updateTaskDueDate(id: string, dueDate: string | null) {
  const userId = await getUserId()
  if (typeof id !== 'string' || id.length > 80) throw new Error('Invalid task update')
  if (dueDate !== null) {
    if (typeof dueDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) throw new Error('Invalid due date')
    const parsedDate = new Date(`${dueDate}T00:00:00.000Z`)
    if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== dueDate) {
      throw new Error('Invalid due date')
    }
  }
  const [task] = await db
    .update(tasks)
    .set({ dueDate, updatedAt: new Date() })
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .returning()
  if (!task) throw new Error('Task not found')
  revalidatePath('/')
  return task
}
