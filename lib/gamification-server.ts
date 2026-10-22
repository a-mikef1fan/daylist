import { db } from '@/lib/db'
import { userStats, xpAwards } from '@/lib/db/schema'
import { computeStreaks, emptyProgress, type Progress } from '@/lib/gamification'
import { eq } from 'drizzle-orm'

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

/**
 * Creates the user's stats row if needed and locks it until the transaction ends, so
 * concurrent completions from the same user (two tabs) are applied one at a time.
 */
export async function lockStats(tx: Tx, userId: string) {
  await tx.insert(userStats).values({ userId }).onConflictDoNothing()
  await tx.select().from(userStats).where(eq(userStats.userId, userId)).for('update')
}

/**
 * Rebuilds the user's stats from their XP grants and stores them. Everything is derived from
 * xp_awards, so the numbers cannot drift and un-completing a task removes exactly its XP.
 */
export async function recomputeStats(tx: Tx, userId: string): Promise<Progress> {
  const awards = await tx
    .select({ xp: xpAwards.xp, awardedOn: xpAwards.awardedOn })
    .from(xpAwards)
    .where(eq(xpAwards.userId, userId))

  const totalXp = awards.reduce((sum, award) => sum + award.xp, 0)
  const tasksCompleted = awards.length
  const streaks = computeStreaks(awards.map((award) => award.awardedOn))

  const values = { totalXp, tasksCompleted, ...streaks, updatedAt: new Date() }
  await tx
    .insert(userStats)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: userStats.userId, set: values })

  return { totalXp, tasksCompleted, ...streaks }
}

/** Loads a user's progress, building their stats row the first time (e.g. after the migration backfill). */
export async function getUserProgress(userId: string): Promise<Progress> {
  const [stats] = await db.select().from(userStats).where(eq(userStats.userId, userId))
  if (!stats) {
    return db.transaction(async (tx) => {
      await lockStats(tx, userId)
      return recomputeStats(tx, userId)
    })
  }
  return {
    ...emptyProgress,
    totalXp: stats.totalXp,
    tasksCompleted: stats.tasksCompleted,
    currentStreak: stats.currentStreak,
    bestStreak: stats.bestStreak,
    lastActiveDate: stats.lastActiveDate,
  }
}
