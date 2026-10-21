import { THESEUS_LEVELS } from '@/lib/theseus-levels'
import { parseMaze, takeTurn, type Maze, type Move, type Positions } from '@/lib/theseus'

// Shared by the game (to describe a win) and the server (to verify it). A solution is the list of Theseus turns
// as a compact string, one letter per turn: u d l r (a step) or w (wait). A "step" on the leaderboard is one turn.
const MOVE_CODES: Record<Move, string> = { up: 'u', down: 'd', left: 'l', right: 'r', wait: 'w' }
const CODE_MOVES: Record<string, Move> = { u: 'up', d: 'down', l: 'left', r: 'right', w: 'wait' }

export const LEVEL_COUNT = THESEUS_LEVELS.length
// The longest shortest solution is 187 turns; this leaves ample room for wandering while bounding the replay cost.
export const MAX_MOVES = 1000
const MOVES_PATTERN = /^[udlrw]+$/

export function encodeMoves(moves: Move[]): string {
  return moves.map((move) => MOVE_CODES[move]).join('')
}

export function isValidLevel(level: unknown): level is number {
  return typeof level === 'number' && Number.isInteger(level) && level >= 0 && level < LEVEL_COUNT
}

export function isMoveString(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 1 && value.length <= MAX_MOVES && MOVES_PATTERN.test(value)
}

const mazeCache = new Map<number, Maze>()
function mazeFor(level: number): Maze {
  let maze = mazeCache.get(level)
  if (!maze) {
    maze = parseMaze(THESEUS_LEVELS[level])
    mazeCache.set(level, maze)
  }
  return maze
}

export type ReplayResult = { ok: true; steps: number } | { ok: false; reason: string }

// Replays a solution with the same rules the game uses. It is accepted only when every turn is legal (no walking into
// a wall), Theseus is never caught, and the final turn walks out of the exit. Nothing may follow the winning turn.
export function replaySolution(level: number, moves: string): ReplayResult {
  if (!isValidLevel(level)) return { ok: false, reason: 'Unknown level' }
  if (!isMoveString(moves)) return { ok: false, reason: 'Invalid moves' }
  const maze = mazeFor(level)
  let positions: Positions = { theseus: maze.theseus, minotaur: maze.minotaur }
  for (let index = 0; index < moves.length; index++) {
    const result = takeTurn(maze, positions, CODE_MOVES[moves[index]])
    if (!result) return { ok: false, reason: `Turn ${index + 1} walks into a wall` }
    if (result.outcome === 'lost') return { ok: false, reason: `The Minotaur catches Theseus on turn ${index + 1}` }
    if (result.outcome === 'won') {
      return index === moves.length - 1 ? { ok: true, steps: moves.length } : { ok: false, reason: 'Moves continue after the exit' }
    }
    positions = result.positions
  }
  return { ok: false, reason: 'The moves do not reach the exit' }
}
