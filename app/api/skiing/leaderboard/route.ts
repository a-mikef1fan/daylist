import { getLeaderboard } from '@/lib/score-api'
import { skiingGame } from '@/lib/score-games'

export const dynamic = 'force-dynamic'

export const GET = (request: Request) => getLeaderboard(request, skiingGame)
