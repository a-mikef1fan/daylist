'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tasks, xpAwards } from '@/lib/db/schema'
import { lockStats, recomputeStats } from '@/lib/gamification-server'
import { DAILY_HABIT, HABIT_XP, isPlausibleLocalDate, isValidDateKey, taskXp, type Progress } from '@/lib/gamification'
import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

function assertLocalDate(value: unknown): asserts value is string {
  if (!isValidDateKey(value) || !isPlausibleLocalDate(value)) throw new Error('Invalid date')
}

/**
 * Completes or un-completes a task and applies the XP change in one transaction.
 * `localDate` is the user's local calendar date (YYYY-MM-DD) from the browser; it decides the
 * on-time bonus and which day counts toward the streak.
 */
export async function setTaskCompleted(id: string, completed: boolean, localDate: string) {
  const userId = await getUserId()
  if (typeof id !== 'string' || id.length < 1 || id.length > 80 || typeof completed !== 'boolean') {
    throw new Error('Invalid task update')
  }
  assertLocalDate(localDate)

  const result = await db.transaction(async (tx) => {
    await lockStats(tx, userId)
    const [task] = await tx
      .update(tasks)
      .set({ completed, updatedAt: new Date() })
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning()
    if (!task) throw new Error('Task not found')

    const awardId = `task:${task.id}`
    if (completed) {
      await tx
        .insert(xpAwards)
        .values({
          id: awardId,
          userId,
          kind: 'task',
          xp: taskXp({ priority: task.priority, dueDate: task.dueDate, completedOn: localDate }),
          awardedOn: localDate,
        })
        .onConflictDoNothing()
    } else {
      await tx.delete(xpAwards).where(and(eq(xpAwards.id, awardId), eq(xpAwards.userId, userId)))
    }
    const progress: Progress = await recomputeStats(tx, userId)
    return { task, progress }
  })
  revalidatePath('/')
  return result
}

/** Marks today's built-in daily habit done (or undone). One XP grant per user per local day. */
export async function setDailyHabitDone(done: boolean, localDate: string) {
  const userId = await getUserId()
  if (typeof done !== 'boolean') throw new Error('Invalid habit update')
  assertLocalDate(localDate)

  const progress = await db.transaction(async (tx) => {
    await lockStats(tx, userId)
    const awardId = `habit:${DAILY_HABIT.key}:${localDate}`
    if (done) {
      await tx
        .insert(xpAwards)
        .values({ id: `${awardId}:${userId}`, userId, kind: 'habit', xp: HABIT_XP, awardedOn: localDate })
        .onConflictDoNothing()
    } else {
      await tx.delete(xpAwards).where(and(eq(xpAwards.id, `${awardId}:${userId}`), eq(xpAwards.userId, userId)))
    }
    return recomputeStats(tx, userId)
  })
  revalidatePath('/')
  return progress
}
