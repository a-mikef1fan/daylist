import { getSessionUserId, json, readJsonObject, unavailable } from '@/lib/game-api'
import type { ScoreGame } from '@/lib/score-games'
import { checkRateLimit } from '@/lib/rate-limit'

const MAX_BODY_BYTES = 1024
// A game over every few seconds is already a lot; this only stops floods (per server instance).
const SUBMISSIONS_PER_MINUTE = 30

// POST: submit a finished run as { score, durationMs, ... } (the fields each game adds are in its validator). The
// server keeps the player's best. The score is NOT verified by replaying the run: the game runs in the browser, so this
// only rejects values the game could not have produced (see lib/snake-rules.ts and lib/ski-rules.ts).
export async function submitScore(request: Request, game: ScoreGame) {
  const userId = await getSessionUserId(request)
  if (!userId) return json({ error: 'Sign in to save your score.' }, 401)

  const read = await readJsonObject(request, MAX_BODY_BYTES)
  if ('error' in read) return read.error

  const check = game.validate(read.body)
  if (!check.ok) return json({ error: check.error }, check.status)

  const limit = checkRateLimit(`score:${game.name}:${userId}`, SUBMISSIONS_PER_MINUTE, 60_000)
  if (!limit.ok) return new Response(JSON.stringify({ error: 'Too many scores. Try again shortly.' }), {
    status: 429,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Retry-After': String(limit.retryAfterSeconds) },
  })

  try {
    const improved = await game.store.saveScore(userId, check.run)
    return json({ improved, best: await game.store.getOwnBest(userId) })
  } catch (error) {
    return unavailable(game.name, error)
  }
}

// GET: top players for one board plus the signed-in user's own row (with their real rank) when they are outside the top
// list. A game with several boards takes the board in the query string (?course=trees for Downhill Skiing).
export async function getLeaderboard(request: Request, game: ScoreGame) {
  const userId = await getSessionUserId(request)
  if (!userId) return json({ error: 'Sign in to see the leaderboard.' }, 401)
  const requested = new URL(request.url).searchParams.get(game.boardParam)
  if (requested !== null && !game.isBoard(requested)) return json({ error: 'Unknown board.' }, 400)
  const board = requested ?? game.defaultBoard
  try {
    return json({ board, ...(await game.store.getLeaderboard(board, userId)) })
  } catch (error) {
    return unavailable(game.name, error)
  }
}
