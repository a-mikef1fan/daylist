import { eq, like, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { tasks, user } from '@/lib/db/schema'
import { LEVEL_COUNT, MAX_MOVES } from '@/lib/theseus-moves'
import { buildLeaderboard, summarizeProgress, type LeaderboardView, type ProgressSummary, type SolvedLevel } from '@/lib/theseus-ranking'

// Persistence without a schema change. Each player's progress is one reserved row in the existing `tasks` table:
//   id          'theseus:<user id>'  (primary key, so there is at most one row per player)
//   userId      'theseus:<user id>'  (NOT the player's own id, so every todo query, which filters on the signed-in
//                                     user's id, never sees or touches it; tasks.userId has no foreign key)
//   title       a fixed label
//   description JSON payload (see ProgressPayload)
// Nothing else in the app reads these rows; the leaderboard reads only rows whose id starts with the prefix.
const PREFIX = 'theseus:'
const TITLE = 'Theseus & the Minotaur progress (reserved row, not a task)'

type StoredLevel = { moves: string; bestMoves: number; solvedAt: number }
type ProgressPayload = { v: 1; levels: Record<string, StoredLevel> }

const rowId = (userId: string) => PREFIX + userId

function emptyPayload(): ProgressPayload {
  return { v: 1, levels: {} }
}

// The payload is only written by this file, but it is parsed defensively: anything unexpected is dropped.
function parsePayload(text: string | null): ProgressPayload {
  const payload = emptyPayload()
  try {
    const parsed = JSON.parse(text ?? '')
    if (parsed?.v !== 1 || typeof parsed.levels !== 'object' || parsed.levels === null) return payload
    for (const [key, value] of Object.entries(parsed.levels as Record<string, Partial<StoredLevel>>)) {
      const level = Number(key)
      if (!Number.isInteger(level) || level < 0 || level >= LEVEL_COUNT) continue
      if (typeof value?.moves !== 'string' || !Number.isInteger(value.bestMoves) || !Number.isFinite(value.solvedAt)) continue
      if (value.bestMoves! < 1 || value.bestMoves! > MAX_MOVES) continue
      payload.levels[key] = { moves: value.moves, bestMoves: value.bestMoves!, solvedAt: value.solvedAt! }
    }
  } catch {
    // Unreadable payload: treat as no progress.
  }
  return payload
}

export async function getOwnBest(userId: string): Promise<Record<string, number>> {
  const [row] = await db.select({ description: tasks.description }).from(tasks).where(eq(tasks.id, rowId(userId))).limit(1)
  const best: Record<string, number> = {}
  for (const [key, level] of Object.entries(parsePayload(row?.description ?? null).levels)) best[key] = level.bestMoves
  return best
}

// Records a verified solution, keeping whichever of the old and new solutions has fewer steps. Returns whether the
// stored best changed. The row is created if needed and then locked (SELECT ... FOR UPDATE) for the read-modify-write,
// so concurrent submissions for the same player serialize and a lower step count can never be overwritten by a higher one.
export async function saveSolution(userId: string, level: number, moves: string, steps: number): Promise<boolean> {
  const id = rowId(userId)
  return db.transaction(async (tx) => {
    await tx
      .insert(tasks)
      .values({ id, userId: id, title: TITLE, description: JSON.stringify(emptyPayload()), completed: true, status: 'done' })
      .onConflictDoNothing({ target: tasks.id })
    const [row] = await tx.select({ description: tasks.description }).from(tasks).where(eq(tasks.id, id)).for('update')
    const payload = parsePayload(row?.description ?? null)
    const key = String(level)
    const current = payload.levels[key]
    if (current && current.bestMoves <= steps) return false
    payload.levels[key] = { moves, bestMoves: steps, solvedAt: Date.now() }
    await tx.update(tasks).set({ description: JSON.stringify(payload), updatedAt: sql`now()` }).where(eq(tasks.id, id))
    return true
  })
}

// Ranking happens in TypeScript (lib/theseus-ranking.ts) over each player's solved levels, so the rule lives in one
// place. That is fine at this app's scale (one small row per player); with many players, move this to a proper table.
export async function getLeaderboard(meId: string | null): Promise<LeaderboardView> {
  const rows = await db
    .select({ userId: user.id, name: user.name, email: user.email, description: tasks.description })
    .from(tasks)
    .innerJoin(user, sql`${tasks.id} = ${PREFIX} || ${user.id}`)
    .where(like(tasks.id, `${PREFIX}%`))
  const summaries: ProgressSummary[] = rows.map((row) => {
    const solved: SolvedLevel[] = Object.entries(parsePayload(row.description).levels).map(([key, level]) => ({
      level: Number(key),
      bestMoves: level.bestMoves,
      solvedAt: level.solvedAt,
    }))
    return summarizeProgress({ userId: row.userId, name: row.name, email: row.email }, solved)
  })
  return buildLeaderboard(summaries, meId)
}
