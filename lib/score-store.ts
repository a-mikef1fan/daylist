import { reservedRows } from '@/lib/reserved-rows'
import { buildScoreLeaderboard, type ScoreLeaderboardView, type ScoreRow, type ScoreRun } from '@/lib/score-ranking'

// One best score per player per board, kept in the player's reserved `tasks` row for the game (see
// lib/reserved-rows.ts for how that works and why no schema change is needed). A game with a single board (Snake) uses
// one board; Downhill Skiing has one board per course.
//
// description JSON: { v: 1, boards: { "<board>": { score, durationMs, at } } }, where `at` is when that best was set.
type StoredBest = { score: number; durationMs: number; at: number /* epoch ms */ }
type ScorePayload = { v: 1; boards: Record<string, StoredBest> }

export type ScoreStoreOptions = {
  prefix: string // reserved row id prefix, ending in ':'
  title: string
  boards: readonly string[]
  maxScore: (board: string) => number
}

export function createScoreStore({ prefix, title, boards, maxScore }: ScoreStoreOptions) {
  const empty = (): ScorePayload => ({ v: 1, boards: {} })

  // The payload is only written by this file, but it is parsed defensively: anything unexpected is dropped.
  function parse(text: string | null): ScorePayload {
    const payload = empty()
    try {
      const parsed = JSON.parse(text ?? '')
      if (parsed?.v !== 1 || typeof parsed.boards !== 'object' || parsed.boards === null) return payload
      for (const board of boards) {
        const value = (parsed.boards as Record<string, Partial<StoredBest> | undefined>)[board]
        if (!Number.isInteger(value?.score) || value!.score! < 1 || value!.score! > maxScore(board)) continue
        if (!Number.isFinite(value?.at) || !Number.isInteger(value?.durationMs)) continue
        payload.boards[board] = { score: value!.score!, durationMs: value!.durationMs!, at: value!.at! }
      }
    } catch {
      // Unreadable payload: treat as no scores.
    }
    return payload
  }

  const rows = reservedRows<ScorePayload>({ prefix, title, empty, parse })

  return {
    // The signed-in player's best score per board, as { "<board>": score }.
    async getOwnBest(userId: string): Promise<Record<string, number>> {
      const best: Record<string, number> = {}
      for (const [board, stored] of Object.entries((await rows.read(userId)).boards)) best[board] = stored.score
      return best
    },

    // Keeps whichever of the stored and the new score is higher (the earlier one wins a tie, so the time a score was
    // first reached never moves). Returns whether the stored best changed. Runs under the row lock, so concurrent
    // submissions serialize and a lower score can never overwrite a higher one.
    saveScore(userId: string, run: ScoreRun): Promise<boolean> {
      return rows.modify(userId, (payload) => {
        const current = payload.boards[run.board]
        if (current && current.score >= run.score) return null
        payload.boards[run.board] = { score: run.score, durationMs: run.durationMs, at: Date.now() }
        return payload
      })
    },

    // Ranking happens in TypeScript (lib/score-ranking.ts) so the rule lives in one place. That is fine at this app's
    // scale (one small row per player); with many players, move this to a proper table.
    async getLeaderboard(board: string, meId: string | null): Promise<ScoreLeaderboardView> {
      const scoreRows: ScoreRow[] = []
      for (const row of await rows.readAll()) {
        const best = row.payload.boards[board]
        if (best) scoreRows.push({ userId: row.userId, name: row.name, email: row.email, score: best.score, reachedAt: best.at })
      }
      return buildScoreLeaderboard(scoreRows, meId)
    },
  }
}

export type ScoreStore = ReturnType<typeof createScoreStore>
