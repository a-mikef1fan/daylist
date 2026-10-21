import { isInt, type RunCheck } from '@/lib/score-ranking'
import { SNAKE_GRID, createSnake, snakeInterval } from '@/lib/snake'

// What counts as a believable Snake result. Snake runs in the browser on a random board, so the server cannot replay a
// run the way it does for Theseus; it only rejects numbers the game could not have produced.
export const SNAKE_BOARD = 'snake'

// One point per dot eaten. The board holds SNAKE_GRID squared cells and the snake starts with a few of them filled.
export const SNAKE_MAX_SCORE = SNAKE_GRID * SNAKE_GRID - createSnake(() => 0).snake.length

// The game reports how long the run was in play (the sum of the tick lengths it waited, so time spent paused does not
// count). Eating dot k + 1 takes at least one tick, and a tick lasts snakeInterval(k) at that score.
export function snakeMinDurationMs(score: number): number {
  let total = 0
  for (let eaten = 0; eaten < score; eaten++) total += snakeInterval(eaten)
  return total
}

const MAX_DURATION_MS = 6 * 60 * 60 * 1000

// Request body: { score, durationMs }.
export function validateSnakeRun(body: Record<string, unknown>): RunCheck {
  const { score, durationMs } = body
  if (!isInt(score, 1, 1_000_000)) return { ok: false, status: 400, error: 'Invalid score.' }
  if (!isInt(durationMs, 0, 1_000_000_000)) return { ok: false, status: 400, error: 'Invalid duration.' }
  if (score > SNAKE_MAX_SCORE) return { ok: false, status: 422, error: 'That score is not possible on this board.' }
  if (durationMs < snakeMinDurationMs(score)) return { ok: false, status: 422, error: 'That run was too short for that score.' }
  if (durationMs > MAX_DURATION_MS) return { ok: false, status: 422, error: 'That run was too long to count.' }
  return { ok: true, run: { board: SNAKE_BOARD, score, durationMs } }
}
