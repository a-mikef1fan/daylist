import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isMissingTable } from '@/lib/theseus-store'

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

// Database failures (most likely the table not being created yet) become a 503 the game treats as "leaderboard
// unavailable"; the game itself never depends on these routes.
export function unavailable(error: unknown) {
  if (isMissingTable(error)) {
    console.warn('theseus_progress table is missing; run lib/db/migrations/0001_theseus_progress.sql')
  } else {
    console.error('Theseus leaderboard request failed', error)
  }
  return json({ error: 'The leaderboard is unavailable right now.' }, 503)
}
