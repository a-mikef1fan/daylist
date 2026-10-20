import { reservedRows } from '@/lib/reserved-rows'
import { LEVEL_COUNT, MAX_MOVES } from '@/lib/theseus-moves'
import { buildLeaderboard, summarizeProgress, type LeaderboardView, type ProgressSummary, type SolvedLevel } from '@/lib/theseus-ranking'

// Progress lives in one reserved `tasks` row per player ('theseus:<user id>'), see lib/reserved-rows.ts for how that is
// stored and why the todo list never sees it. The JSON payload (see ProgressPayload) is owned by this file.
const PREFIX = 'theseus:'
const TITLE = 'Theseus & the Minotaur progress (reserved row, not a task)'

type StoredLevel = { moves: string; bestMoves: number; solvedAt: number }
type ProgressPayload = { v: 1; levels: Record<string, StoredLevel> }

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

const rows = reservedRows<ProgressPayload>({ prefix: PREFIX, title: TITLE, empty: emptyPayload, parse: parsePayload })

export async function getOwnBest(userId: string): Promise<Record<string, number>> {
  const best: Record<string, number> = {}
  for (const [key, level] of Object.entries((await rows.read(userId)).levels)) best[key] = level.bestMoves
  return best
}

// Records a verified solution, keeping whichever of the old and new solutions has fewer steps. Returns whether the
// stored best changed. The read-modify-write runs under the row lock (see ReservedRows.modify), so concurrent
// submissions for the same player serialize and a lower step count can never be overwritten by a higher one.
export function saveSolution(userId: string, level: number, moves: string, steps: number): Promise<boolean> {
  return rows.modify(userId, (payload) => {
    const key = String(level)
    const current = payload.levels[key]
    if (current && current.bestMoves <= steps) return null
    payload.levels[key] = { moves, bestMoves: steps, solvedAt: Date.now() }
    return payload
  })
}

// Ranking happens in TypeScript (lib/theseus-ranking.ts) over each player's solved levels, so the rule lives in one
// place. That is fine at this app's scale (one small row per player); with many players, move this to a proper table.
export async function getLeaderboard(meId: string | null): Promise<LeaderboardView> {
  const summaries: ProgressSummary[] = (await rows.readAll()).map((row) => {
    const solved: SolvedLevel[] = Object.entries(row.payload.levels).map(([key, level]) => ({
      level: Number(key),
      bestMoves: level.bestMoves,
      solvedAt: level.solvedAt,
    }))
    return summarizeProgress({ userId: row.userId, name: row.name, email: row.email }, solved)
  })
  return buildLeaderboard(summaries, meId)
}
