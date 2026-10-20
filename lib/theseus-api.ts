import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function getSessionUserId(request: Request): Promise<string | null> {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    return session?.user?.id ?? null
  } catch {
    return null
  }
}

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

// Database failures become a 503 the game treats as "leaderboard unavailable"; the game itself never depends on
// these routes.
export function unavailable(error: unknown) {
  console.error('Theseus leaderboard request failed', error)
  return json({ error: 'The leaderboard is unavailable right now.' }, 503)
}
