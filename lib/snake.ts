export type Point = { x: number; y: number }
export type Direction = 'up' | 'down' | 'left' | 'right'

export type SnakeState = {
  snake: Point[] // head first
  direction: Direction
  food: Point | null
  score: number
  over: boolean
  won: boolean
}

export const SNAKE_GRID = 16

const vectors: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

const opposites: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' }

export function isOpposite(a: Direction, b: Direction) {
  return opposites[a] === b
}

export function placeFood(snake: Point[], rng: () => number = Math.random): Point | null {
  const taken = new Set(snake.map((p) => `${p.x},${p.y}`))
  const free: Point[] = []
  for (let y = 0; y < SNAKE_GRID; y++) {
    for (let x = 0; x < SNAKE_GRID; x++) {
      if (!taken.has(`${x},${y}`)) free.push({ x, y })
    }
  }
  if (free.length === 0) return null
  return free[Math.min(free.length - 1, Math.floor(rng() * free.length))]
}

export function createSnake(rng: () => number = Math.random): SnakeState {
  const mid = Math.floor(SNAKE_GRID / 2)
  const snake = [{ x: mid, y: mid }, { x: mid - 1, y: mid }, { x: mid - 2, y: mid }]
  return { snake, direction: 'right', food: placeFood(snake, rng), score: 0, over: false, won: false }
}

export function stepSnake(state: SnakeState, direction: Direction, rng: () => number = Math.random): SnakeState {
  if (state.over) return state
  // Ignore a reversal into the neck.
  const dir = isOpposite(state.direction, direction) ? state.direction : direction
  const head = state.snake[0]
  const next = { x: head.x + vectors[dir].x, y: head.y + vectors[dir].y }
  const hitsWall = next.x < 0 || next.y < 0 || next.x >= SNAKE_GRID || next.y >= SNAKE_GRID
  const eats = state.food !== null && next.x === state.food.x && next.y === state.food.y
  // The tail cell is vacated this tick unless the snake grows.
  const body = eats ? state.snake : state.snake.slice(0, -1)
  const hitsSelf = body.some((p) => p.x === next.x && p.y === next.y)
  if (hitsWall || hitsSelf) return { ...state, direction: dir, over: true }

  const snake = [next, ...(eats ? state.snake : state.snake.slice(0, -1))]
  if (!eats) return { ...state, snake, direction: dir }
  const food = placeFood(snake, rng)
  return { snake, direction: dir, food, score: state.score + 1, over: food === null, won: food === null }
}

// Milliseconds per tick: starts relaxed and ramps gently down to a floor.
export function snakeInterval(score: number) {
  return Math.max(70, 150 - score * 3)
}
