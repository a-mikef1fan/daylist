'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { goals, tasks, type Goal, type GoalWithProgress } from '@/lib/db/schema'
import { GOAL_DESCRIPTION_MAX, GOAL_TITLE_MAX, isValidDateKey } from '@/lib/goals'
import { toTaskView } from '@/lib/recurrence'
import { and, asc, eq, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

type GoalInput = {
  title: string
  description?: string | null
  targetDate?: string | null
}

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

function validateGoalInput(input: GoalInput) {
  if (!input || typeof input !== 'object') throw new Error('Invalid goal')
  const title = typeof input.title === 'string' ? input.title.trim() : ''
  if (title.length < 1 || title.length > GOAL_TITLE_MAX) throw new Error('Invalid goal title')

  let description: string | null = null
  if (input.description !== undefined && input.description !== null) {
    if (typeof input.description !== 'string') throw new Error('Invalid goal description')
    description = input.description.trim() || null
    if (description && description.length > GOAL_DESCRIPTION_MAX) throw new Error('Invalid goal description')
  }

  let targetDate: string | null = null
  if (input.targetDate !== undefined && input.targetDate !== null && input.targetDate !== '') {
    if (!isValidDateKey(input.targetDate)) throw new Error('Invalid target date')
    targetDate = input.targetDate
  }

  return { title, description, targetDate }
}

function validateId(id: unknown, message: string) {
  if (typeof id !== 'string' || id.length < 1 || id.length > 80) throw new Error(message)
  return id
}

// The signed-in user's goals, oldest first, each with how many of its tasks are
// completed out of the total.
export async function getGoals(): Promise<GoalWithProgress[]> {
  const userId = await getUserId()
  const rows = await db
    .select({
      goal: goals,
      total: sql<number>`count(${tasks.id})::int`,
      completed: sql<number>`(count(${tasks.id}) filter (where ${tasks.completed}))::int`,
    })
    .from(goals)
    .leftJoin(tasks, and(eq(tasks.goalId, goals.id), eq(tasks.userId, userId)))
    .where(eq(goals.userId, userId))
    .groupBy(goals.id)
    .orderBy(asc(goals.createdAt))
  return rows.map(({ goal, total, completed }) => ({ ...goal, total, completed }))
}

export async function createGoal(input: GoalInput): Promise<Goal> {
  const userId = await getUserId()
  const values = validateGoalInput(input)
  const [goal] = await db
    .insert(goals)
    .values({ id: crypto.randomUUID(), userId, ...values })
    .returning()
  revalidatePath('/')
  return goal
}

export async function updateGoal(id: string, input: GoalInput): Promise<Goal> {
  const userId = await getUserId()
  validateId(id, 'Invalid goal')
  const values = validateGoalInput(input)
  const [goal] = await db
    .update(goals)
    .set({ ...values, updatedAt: new Date() })
    .where(and(eq(goals.id, id), eq(goals.userId, userId)))
    .returning()
  if (!goal) throw new Error('Goal not found')
  revalidatePath('/')
  return goal
}

// Tasks linked to the goal are kept: the tasks.goalId foreign key is ON DELETE SET NULL.
export async function deleteGoal(id: string) {
  const userId = await getUserId()
  validateId(id, 'Invalid goal')
  await db.delete(goals).where(and(eq(goals.id, id), eq(goals.userId, userId)))
  revalidatePath('/')
}

// Links a task to one of the user's goals, or clears the link when goalId is null.
export async function setTaskGoal(taskId: string, goalId: string | null) {
  const userId = await getUserId()
  validateId(taskId, 'Invalid task')
  if (goalId !== null) {
    validateId(goalId, 'Invalid goal')
    // The goal must belong to the current user, otherwise anyone could attach
    // their tasks to (and so learn the existence of) another user's goal.
    const [goal] = await db
      .select({ id: goals.id })
      .from(goals)
      .where(and(eq(goals.id, goalId), eq(goals.userId, userId)))
      .limit(1)
    if (!goal) throw new Error('Goal not found')
  }
  const [task] = await db
    .update(tasks)
    .set({ goalId, updatedAt: new Date() })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .returning()
  if (!task) throw new Error('Task not found')
  revalidatePath('/')
  return toTaskView(task)
}
