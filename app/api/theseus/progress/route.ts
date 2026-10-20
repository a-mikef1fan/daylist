import { getSessionUserId, json, unavailable } from '@/lib/theseus-api'
import { isMoveString, isValidLevel, replaySolution } from '@/lib/theseus-moves'
import { getOwnBest, saveSolution } from '@/lib/theseus-store'

export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 4096

// The signed-in user's best step count per level, as { "0": 14, "3": 40 } (level index to steps).
export async function GET(request: Request) {
  const userId = await getSessionUserId(request)
  if (!userId) return json({ error: 'Sign in to load your progress.' }, 401)
  try {
    return json({ best: await getOwnBest(userId) })
  } catch (error) {
    return unavailable(error)
  }
}

// Submit a level completion as { level, moves }. The server replays the moves with the game rules and ignores any
// step count the client might claim; only a legal winning sequence for that level is stored.
export async function POST(request: Request) {
  const userId = await getSessionUserId(request)
  if (!userId) return json({ error: 'Sign in to save your progress.' }, 401)

  // Requiring JSON means a cross-site form post cannot submit on a user's behalf (browsers preflight JSON requests).
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return json({ error: 'Send JSON.' }, 415)
  }
  const length = Number(request.headers.get('content-length') ?? 0)
  if (length > MAX_BODY_BYTES) return json({ error: 'Request too large.' }, 413)
  let body: unknown
  try {
    const text = await request.text()
    if (text.length > MAX_BODY_BYTES) return json({ error: 'Request too large.' }, 413)
    body = JSON.parse(text)
  } catch {
    return json({ error: 'Invalid JSON.' }, 400)
  }
  const { level, moves } = (body && typeof body === 'object' ? body : {}) as { level?: unknown; moves?: unknown }
  if (!isValidLevel(level)) return json({ error: 'Unknown level.' }, 400)
  if (!isMoveString(moves)) return json({ error: 'Invalid moves.' }, 400)

  const result = replaySolution(level, moves)
  if (!result.ok) return json({ error: result.reason }, 422)

  try {
    const improved = await saveSolution(userId, level, moves, result.steps)
    return json({ improved, steps: result.steps, best: await getOwnBest(userId) })
  } catch (error) {
    return unavailable(error)
  }
}
