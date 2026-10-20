import { ApiError, request } from '@/lib/game-client'
import type { LeaderboardView } from '@/lib/theseus-ranking'

export { ApiError }

export async function fetchOwnBest(): Promise<Record<string, number>> {
  return (await request<{ best: Record<string, number> }>('/api/theseus/progress')).best
}

// Sends the winning turn list; the server replays it and answers with the user's stored best per level.
export async function submitSolution(level: number, moves: string): Promise<Record<string, number>> {
  const body = await request<{ best: Record<string, number> }>('/api/theseus/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level, moves }),
  })
  return body.best
}

export function fetchLeaderboard(): Promise<LeaderboardView> {
  return request<LeaderboardView>('/api/theseus/leaderboard')
}
