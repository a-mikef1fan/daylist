import { getSessionUserId, json, unavailable } from '@/lib/theseus-api'
import { getLeaderboard } from '@/lib/theseus-store'

export const dynamic = 'force-dynamic'

// Top players plus the signed-in user's own row (with their real rank) when they are outside the top list.
export async function GET(request: Request) {
  const userId = await getSessionUserId(request)
  if (!userId) return json({ error: 'Sign in to see the leaderboard.' }, 401)
  try {
    return json(await getLeaderboard(userId))
  } catch (error) {
    return unavailable(error)
  }
}
