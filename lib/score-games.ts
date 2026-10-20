import { SKI_COURSES, DEFAULT_SKI_COURSE, isSkiCourse, skiMaxScore, validateSkiRun } from '@/lib/ski-rules'
import { SNAKE_BOARD, SNAKE_MAX_SCORE, validateSnakeRun } from '@/lib/snake-rules'
import type { RunCheck } from '@/lib/score-ranking'
import { createScoreStore, type ScoreStore } from '@/lib/score-store'

// The score-based games the leaderboard routes serve (Theseus has its own routes, since it verifies solutions).
export type ScoreGame = {
  name: string // for log lines
  boardParam: string // query-string name of the board for the leaderboard route
  defaultBoard: string
  isBoard: (value: unknown) => boolean
  validate: (body: Record<string, unknown>) => RunCheck
  store: ScoreStore
}

export const snakeGame: ScoreGame = {
  name: 'Snake',
  boardParam: 'board',
  defaultBoard: SNAKE_BOARD,
  isBoard: (value) => value === SNAKE_BOARD,
  validate: validateSnakeRun,
  store: createScoreStore({
    prefix: 'snake:',
    title: 'Snake high score (reserved row, not a task)',
    boards: [SNAKE_BOARD],
    maxScore: () => SNAKE_MAX_SCORE,
  }),
}

export const skiingGame: ScoreGame = {
  name: 'Downhill Skiing',
  boardParam: 'course',
  defaultBoard: DEFAULT_SKI_COURSE,
  isBoard: isSkiCourse,
  validate: validateSkiRun,
  store: createScoreStore({
    prefix: 'skiing:',
    title: 'Downhill Skiing high scores (reserved row, not a task)',
    boards: SKI_COURSES,
    maxScore: (board) => (isSkiCourse(board) ? skiMaxScore(board) : 0),
  }),
}
