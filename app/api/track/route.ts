import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { CLIENT_EVENTS, trackEvent, type UsageMetadata } from '@/lib/usage'

export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 2048
const MAX_PATH_LENGTH = 200
const PATH_PATTERN = /^\/[A-Za-z0-9\-._~/]*$/
const GAMES = ['snake']
const FILTERS = ['all', 'today', 'upcoming', 'urgent', 'completed']

// Best-effort per-instance throttle so one client can't flood the table.
const RATE_LIMIT = 120
const RATE_WINDOW_MS = 60_000
const hits = new Map<string, { count: number; resetAt: number }>()

function rateLimited(key: string) {
  const now = Date.now()
  if (hits.size > 5000) for (const [k, v] of hits) if (v.resetAt < now) hits.delete(k)
  const entry = hits.get(key)
  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return false
  }
  entry.count += 1
  return entry.count > RATE_LIMIT
}

// Only small, known fields are kept per event, so no free text can be stored.
function cleanMetadata(name: string, raw: unknown): UsageMetadata | null | undefined {
  const input = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  switch (name) {
    case 'game_opened':
    case 'game_started':
      return GAMES.includes(input.game as string) ? { game: input.game as string } : undefined
    case 'game_over': {
      const score = input.score
      if (!GAMES.includes(input.game as string) || typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > 100000) return undefined
      return { game: input.game as string, score }
    }
    case 'filter_changed':
      return FILTERS.includes(input.filter as string) ? { filter: input.filter as string } : undefined
    default:
      return null
  }
}

export async function POST(request: Request) {
  const requestHeaders = await headers()
  if (requestHeaders.get('sec-fetch-site') === 'cross-site') return new NextResponse(null, { status: 403 })

  const ip = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (rateLimited(ip)) return new NextResponse(null, { status: 429 })

  let payload: { name?: unknown; path?: unknown; metadata?: unknown }
  try {
    const text = await request.text()
    if (text.length > MAX_BODY_BYTES) return new NextResponse(null, { status: 413 })
    payload = JSON.parse(text)
  } catch {
    return new NextResponse(null, { status: 400 })
  }
  if (!payload || typeof payload !== 'object') return new NextResponse(null, { status: 400 })

  const { name, path } = payload
  if (typeof name !== 'string' || !(CLIENT_EVENTS as readonly string[]).includes(name)) {
    return NextResponse.json({ error: 'Unknown event' }, { status: 400 })
  }
  if (typeof path !== 'string' || path.length > MAX_PATH_LENGTH || !PATH_PATTERN.test(path)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }
  const metadata = cleanMetadata(name, payload.metadata)
  if (metadata === undefined) return NextResponse.json({ error: 'Invalid metadata' }, { status: 400 })

  let userId: string | null = null
  try {
    const session = await auth.api.getSession({ headers: requestHeaders })
    userId = session?.user?.id ?? null
  } catch {
    // Treat an unreadable session as anonymous.
  }

  trackEvent(name as (typeof CLIENT_EVENTS)[number], { userId, path, metadata: metadata ?? undefined })
  return new NextResponse(null, { status: 204 })
}
