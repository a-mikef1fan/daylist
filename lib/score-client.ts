import { ApiError, request } from '@/lib/game-client'
import type { ScoreLeaderboardView } from '@/lib/score-ranking'

export type ScoreGameId = 'snake' | 'skiing'

// A finished run as the score routes expect it. Skiing adds `course` and `distance`; Snake sends only the first two.
export type ScoreSubmission = { score: number; durationMs: number; course?: string; distance?: number }

export type BoardView = ScoreLeaderboardView & { board: string }

export async function submitScore(game: ScoreGameId, run: ScoreSubmission): Promise<Record<string, number>> {
  const body = await request<{ best: Record<string, number> }>(`/api/${game}/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(run),
  })
  return body.best
}

export function fetchBoard(game: ScoreGameId, course?: string): Promise<BoardView> {
  const query = course ? `?course=${encodeURIComponent(course)}` : ''
  return request<BoardView>(`/api/${game}/leaderboard${query}`)
}

// A score that could not be saved (offline, signed out, server down) is kept in this browser and sent again later, so
// the leaderboard still gets it. Only the best unsent run per board is kept, and a run the server rejects is dropped.
const unsentKey = (game: ScoreGameId) => `daylist:${game}-unsent`

export function readUnsent(game: ScoreGameId): Record<string, ScoreSubmission> {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(unsentKey(game)) ?? '{}')
    const runs: Record<string, ScoreSubmission> = {}
    for (const [board, run] of Object.entries((parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, Partial<ScoreSubmission>>)) {
      if (Number.isInteger(run?.score) && Number.isInteger(run?.durationMs)) runs[board] = run as ScoreSubmission
    }
    return runs
  } catch {
    return {}
  }
}

function writeUnsent(game: ScoreGameId, runs: Record<string, ScoreSubmission>) {
  try {
    window.localStorage.setItem(unsentKey(game), JSON.stringify(runs))
  } catch {
    // Storage can be unavailable; the score is then only sent if the request below succeeds.
  }
}

export function rememberUnsent(game: ScoreGameId, board: string, run: ScoreSubmission) {
  const runs = readUnsent(game)
  if (runs[board] && runs[board].score >= run.score) return
  writeUnsent(game, { ...runs, [board]: run })
}

// Forget a board's unsent run once it (or a better one) has been dealt with.
export function clearUnsent(game: ScoreGameId, board: string, throughScore: number) {
  const runs = readUnsent(game)
  if (!runs[board] || runs[board].score > throughScore) return
  delete runs[board]
  writeUnsent(game, runs)
}

// Try to send every unsent run. Resolves to whether the server accepted at least one. Stops at the first failure that
// could be temporary; a run the server rejects as invalid (400 or 422) is dropped instead of retried forever.
export async function sendUnsent(game: ScoreGameId): Promise<boolean> {
  let sent = false
  for (const [board, run] of Object.entries(readUnsent(game))) {
    try {
      await submitScore(game, run)
      clearUnsent(game, board, run.score)
      sent = true
    } catch (error) {
      if (error instanceof ApiError && (error.status === 400 || error.status === 422)) clearUnsent(game, board, run.score)
      else break
    }
  }
  return sent
}
