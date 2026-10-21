import { json } from '@/lib/game-api'

export { getSessionUserId, json } from '@/lib/game-api'

// Database failures become a 503 the game treats as "leaderboard unavailable"; the game itself never depends on
// these routes.
export function unavailable(error: unknown) {
  console.error('Theseus leaderboard request failed', error)
  return json({ error: 'The leaderboard is unavailable right now.' }, 503)
}
