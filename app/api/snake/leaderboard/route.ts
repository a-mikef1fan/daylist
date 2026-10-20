import { getLeaderboard } from '@/lib/score-api'
import { snakeGame } from '@/lib/score-games'

export const dynamic = 'force-dynamic'

export const GET = (request: Request) => getLeaderboard(request, snakeGame)
