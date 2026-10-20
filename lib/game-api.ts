import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// Helpers shared by the game API routes (Theseus, Snake, Downhill Skiing).
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
export function unavailable(game: string, error: unknown) {
  console.error(`${game} leaderboard request failed`, error)
  return json({ error: 'The leaderboard is unavailable right now.' }, 503)
}

// Reads a small JSON object body. Requiring JSON means a cross-site form post cannot submit on a user's behalf
// (browsers preflight JSON requests). Returns the parsed object, or the error response to send back.
export async function readJsonObject(request: Request, maxBytes: number): Promise<{ body: Record<string, unknown> } | { error: Response }> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return { error: json({ error: 'Send JSON.' }, 415) }
  }
  if (Number(request.headers.get('content-length') ?? 0) > maxBytes) return { error: json({ error: 'Request too large.' }, 413) }
  try {
    const text = await request.text()
    if (text.length > maxBytes) return { error: json({ error: 'Request too large.' }, 413) }
    const body = JSON.parse(text)
    if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: json({ error: 'Send a JSON object.' }, 400) }
    return { body }
  } catch {
    return { error: json({ error: 'Invalid JSON.' }, 400) }
  }
}
