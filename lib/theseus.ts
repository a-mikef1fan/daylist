export type Point = { x: number; y: number }
export type Move = 'up' | 'down' | 'left' | 'right' | 'wait'

export type Maze = {
  width: number
  height: number
  // east[y][x]: wall between (x, y) and (x + 1, y). south[y][x]: wall between (x, y) and (x, y + 1).
  // The outer border is solid except for the exit, which lies one step outside the grid.
  east: boolean[][]
  south: boolean[][]
  theseus: Point
  minotaur: Point
  exit: Point
}

export type Positions = { theseus: Point; minotaur: Point }
export type Outcome = 'playing' | 'won' | 'lost'

const vectors: Record<Exclude<Move, 'wait'>, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

export const MOVES: Move[] = ['up', 'down', 'left', 'right', 'wait']

// Levels are drawn as ASCII art: '+' corners, '-' / '|' walls, T (Theseus) and M (Minotaur) inside cells.
// The art is a (2w+1) x (2h+1) character grid; cell (x, y) sits at column 2x+1, row 2y+1. As in Abbott's original
// mazes, the exit is the single gap in the outer border, so the exit point lies just outside the grid.
export function parseMaze(art: string[]): Maze {
  const height = (art.length - 1) / 2
  const width = (art[0].length - 1) / 2
  if (!Number.isInteger(height) || !Number.isInteger(width)) throw new Error('Invalid maze art dimensions')
  const east: boolean[][] = []
  const south: boolean[][] = []
  let theseus: Point | null = null
  let minotaur: Point | null = null
  let exit: Point | null = null
  for (let y = 0; y < height; y++) {
    east.push([])
    south.push([])
    for (let x = 0; x < width; x++) {
      east[y].push(art[2 * y + 1][2 * x + 2] === '|')
      south[y].push(art[2 * y + 2][2 * x + 1] === '-')
      const mark = art[2 * y + 1][2 * x + 1]
      if (mark === 'T') theseus = { x, y }
      else if (mark === 'M') minotaur = { x, y }
    }
  }
  for (let x = 0; x < width; x++) {
    if (art[0][2 * x + 1] === ' ') exit = { x, y: -1 }
    if (art[2 * height][2 * x + 1] === ' ') exit = { x, y: height }
  }
  for (let y = 0; y < height; y++) {
    if (art[2 * y + 1][0] === ' ') exit = { x: -1, y }
    if (art[2 * y + 1][2 * width] === ' ') exit = { x: width, y }
  }
  if (!theseus || !minotaur || !exit) throw new Error('Maze needs T, M and a gap in the border for the exit')
  return { width, height, east, south, theseus, minotaur, exit }
}

export function canMove(maze: Maze, from: Point, move: Move): boolean {
  if (move === 'wait') return true
  const { x, y } = from
  const to = step(from, move)
  if (to.x < 0 || to.y < 0 || to.x >= maze.width || to.y >= maze.height) {
    // The border is solid except for the exit gap.
    return to.x === maze.exit.x && to.y === maze.exit.y
  }
  switch (move) {
    case 'up':
      return !maze.south[y - 1][x]
    case 'down':
      return !maze.south[y][x]
    case 'left':
      return !maze.east[y][x - 1]
    case 'right':
      return !maze.east[y][x]
  }
}

export function step(from: Point, move: Move): Point {
  if (move === 'wait') return from
  return { x: from.x + vectors[move].x, y: from.y + vectors[move].y }
}

// One Minotaur step: close the horizontal gap if possible, otherwise the vertical gap, otherwise stay put.
export function minotaurStep(maze: Maze, minotaur: Point, theseus: Point): Point {
  if (minotaur.x !== theseus.x) {
    const move: Move = theseus.x > minotaur.x ? 'right' : 'left'
    if (canMove(maze, minotaur, move)) return step(minotaur, move)
  }
  if (minotaur.y !== theseus.y) {
    const move: Move = theseus.y > minotaur.y ? 'down' : 'up'
    if (canMove(maze, minotaur, move)) return step(minotaur, move)
  }
  return minotaur
}

// Resolve one full turn. Returns null when Theseus bumps into a wall (the move is illegal and no turn passes).
export function takeTurn(maze: Maze, positions: Positions, move: Move): { positions: Positions; outcome: Outcome } | null {
  if (!canMove(maze, positions.theseus, move)) return null
  const theseus = step(positions.theseus, move)
  if (theseus.x === maze.exit.x && theseus.y === maze.exit.y) {
    return { positions: { theseus, minotaur: positions.minotaur }, outcome: 'won' }
  }
  let minotaur = positions.minotaur
  for (let i = 0; i < 2; i++) {
    minotaur = minotaurStep(maze, minotaur, theseus)
    if (minotaur.x === theseus.x && minotaur.y === theseus.y) {
      return { positions: { theseus, minotaur }, outcome: 'lost' }
    }
  }
  return { positions: { theseus, minotaur }, outcome: 'playing' }
}

export type SolveResult = {
  solvable: boolean
  minMoves: number | null
  solution: Move[] | null
  reachableStates: number
  // Reachable states from which no sequence of moves can win (the traps that make a level hard).
  doomedStates: number
}

// Breadth-first search over (Theseus, Minotaur) states from the starting position.
export function solveMaze(maze: Maze): SolveResult {
  const key = (p: Positions) => ((p.theseus.y * maze.width + p.theseus.x) * maze.height + p.minotaur.y) * maze.width + p.minotaur.x
  const start: Positions = { theseus: maze.theseus, minotaur: maze.minotaur }
  const nodes = new Map<number, { positions: Positions; parent: number | null; move: Move | null }>()
  const queue: number[] = []
  const edges = new Map<number, number[]>()
  const winning = new Map<number, Move>() // states with a move that reaches the exit
  nodes.set(key(start), { positions: start, parent: null, move: null })
  queue.push(key(start))
  let bestWin: number | null = null
  for (let head = 0; head < queue.length; head++) {
    const currentKey = queue[head]
    const current = nodes.get(currentKey)!.positions
    const out: number[] = []
    edges.set(currentKey, out)
    for (const move of MOVES) {
      const result = takeTurn(maze, current, move)
      if (!result || result.outcome === 'lost') continue
      if (result.outcome === 'won') {
        // BFS visits states in order of depth, so the first winning state found is the shallowest.
        if (!winning.has(currentKey)) winning.set(currentKey, move)
        if (bestWin === null) bestWin = currentKey
        continue
      }
      const nextKey = key(result.positions)
      out.push(nextKey)
      if (!nodes.has(nextKey)) {
        nodes.set(nextKey, { positions: result.positions, parent: currentKey, move })
        queue.push(nextKey)
      }
    }
  }
  let solution: Move[] | null = null
  if (bestWin !== null) {
    const moves: Move[] = [winning.get(bestWin)!]
    for (let k: number | null = bestWin; k !== null; ) {
      const node: { parent: number | null; move: Move | null } = nodes.get(k)!
      if (node.move) moves.unshift(node.move)
      k = node.parent
    }
    solution = moves
  }
  // Doomed states cannot reach any winning state: propagate "alive" backwards from the winners.
  const reverse = new Map<number, number[]>()
  edges.forEach((targets, from) => {
    targets.forEach((to) => {
      if (!reverse.has(to)) reverse.set(to, [])
      reverse.get(to)!.push(from)
    })
  })
  const alive = new Set<number>(winning.keys())
  const stack = Array.from(alive)
  while (stack.length > 0) {
    const k = stack.pop()!
    for (const parent of reverse.get(k) ?? []) {
      if (!alive.has(parent)) {
        alive.add(parent)
        stack.push(parent)
      }
    }
  }
  return {
    solvable: solution !== null,
    minMoves: solution ? solution.length : null,
    solution,
    reachableStates: nodes.size,
    doomedStates: nodes.size - alive.size,
  }
}
