import { submitScore } from '@/lib/score-api'
import { snakeGame } from '@/lib/score-games'

export const dynamic = 'force-dynamic'

export const POST = (request: Request) => submitScore(request, snakeGame)
