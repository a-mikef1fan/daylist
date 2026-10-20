import type { LeaderboardView } from '@/lib/theseus-ranking'

// Browser helpers for the Theseus leaderboard routes. Every failure rejects with an ApiError; the game treats that
// as "leaderboard unavailable" and carries on from local progress.
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, { ...init, cache: 'no-store' })
  } catch {
    throw new ApiError('Network error', 0)
  }
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(typeof body?.error === 'string' ? body.error : 'Request failed', response.status)
  return body as T
}

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
