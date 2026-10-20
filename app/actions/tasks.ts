'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tasks, type Assignee, type TaskPriority } from '@/lib/db/schema'
import { ASSIGNEE_NAME_MAX, getSlackMembers, SLACK_ID_PATTERN } from '@/lib/slack'
import { and, asc, desc, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

// Checks the assignee id against the Slack member list and returns the DB columns to store.
// Name and image come from Slack, not from the client. New assignments are rejected when the list is unavailable.
async function resolveAssignee(assignee: Assignee | null | undefined) {
  if (assignee === null || assignee === undefined) {
    return { assigneeSlackId: null, assigneeName: null, assigneeImage: null }
  }
  if (typeof assignee !== 'object' || typeof assignee.id !== 'string' || !SLACK_ID_PATTERN.test(assignee.id)) {
    throw new Error('Invalid assignee')
  }
  const { members, connected } = await getSlackMembers()
  if (!connected) throw new Error('Slack is not connected')
  const member = members.find((item) => item.id === assignee.id)
  if (!member) throw new Error('Unknown assignee')
  return { assigneeSlackId: member.id, assigneeName: member.name.trim().slice(0, ASSIGNEE_NAME_MAX), assigneeImage: member.image }
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
  assignee?: Assignee | null
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

  const assigneeColumns = await resolveAssignee(input.assignee)

  const [task] = await db
    .insert(tasks)
    .values({
      id: crypto.randomUUID(),
      userId,
      title,
      dueDate: input.dueDate,
      priority: input.priority,
      ...assigneeColumns,
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
    .set({ completed, updatedAt: new Date() })
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .returning()
  if (!task) throw new Error('Task not found')
  revalidatePath('/')
  return task
}

export async function updateTaskAssignee(id: string, assignee: Assignee | null) {
  const userId = await getUserId()
  if (typeof id !== 'string' || id.length < 1 || id.length > 80) throw new Error('Invalid task update')
  const assigneeColumns = await resolveAssignee(assignee)
  const [task] = await db
    .update(tasks)
    .set({ ...assigneeColumns, updatedAt: new Date() })
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .returning()
  if (!task) throw new Error('Task not found')
  revalidatePath('/')
  return task
}

export async function deleteTask(id: string) {
  const userId = await getUserId()
  if (typeof id !== 'string' || id.length < 1 || id.length > 80) throw new Error('Invalid task')
  await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
  revalidatePath('/')
}
