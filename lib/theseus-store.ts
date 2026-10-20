import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { theseusProgress, user } from '@/lib/db/schema'
import { buildLeaderboard, type LeaderboardView, type ProgressSummary } from '@/lib/theseus-ranking'

// Postgres "undefined_table": the theseus_progress table has not been created in this database yet.
export function isMissingTable(error: unknown): boolean {
  for (let current: unknown = error; current && typeof current === 'object'; current = (current as { cause?: unknown }).cause) {
    if ((current as { code?: unknown }).code === '42P01') return true
  }
  return false
}

export async function getOwnBest(userId: string): Promise<Record<string, number>> {
  const rows = await db
    .select({ level: theseusProgress.level, bestMoves: theseusProgress.bestMoves })
    .from(theseusProgress)
    .where(eq(theseusProgress.userId, userId))
  const best: Record<string, number> = {}
  for (const row of rows) best[String(row.level)] = row.bestMoves
  return best
}

// Records a verified solution, keeping whichever of the old and new solutions has fewer steps. Returns whether the
// stored best changed.
export async function saveSolution(userId: string, level: number, moves: string, steps: number): Promise<boolean> {
  const saved = await db
    .insert(theseusProgress)
    .values({ userId, level, bestMoves: steps, moves })
    .onConflictDoUpdate({
      target: [theseusProgress.userId, theseusProgress.level],
      set: { bestMoves: sql`excluded."bestMoves"`, moves: sql`excluded."moves"`, updatedAt: sql`now()` },
      setWhere: sql`${theseusProgress.bestMoves} > excluded."bestMoves"`,
    })
    .returning({ level: theseusProgress.level })
  return saved.length > 0
}

// Ranking happens in TypeScript (lib/theseus-ranking.ts) over one aggregate row per user, so the rule lives in one
// place. That is fine at this app's scale; with many thousands of players, move the ORDER BY into SQL.
export async function getLeaderboard(meId: string | null): Promise<LeaderboardView> {
  const rows = await db
    .select({
      userId: theseusProgress.userId,
      name: user.name,
      email: user.email,
      farthest: sql<number>`max(${theseusProgress.level}) + 1`.mapWith(Number),
      solved: sql<number>`count(*)`.mapWith(Number),
      steps: sql<number>`sum(${theseusProgress.bestMoves})`.mapWith(Number),
      reachedAt: sql<string>`max(${theseusProgress.updatedAt})`,
    })
    .from(theseusProgress)
    .innerJoin(user, eq(user.id, theseusProgress.userId))
    .groupBy(theseusProgress.userId, user.name, user.email)
  const summaries: ProgressSummary[] = rows.map((row) => ({ ...row, reachedAt: new Date(row.reachedAt).getTime() }))
  return buildLeaderboard(summaries, meId)
}
