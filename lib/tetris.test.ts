import { describe, expect, it } from 'vitest'
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  PIECE_TYPES,
  clearLines,
  collides,
  createBoard,
  createTetris,
  drawPiece,
  ghostPiece,
  hardDrop,
  movePiece,
  pieceCells,
  rotatePiece,
  stepDown,
  tetrisInterval,
  type Board,
  type Piece,
  type PieceType,
  type TetrisState,
} from './tetris'

// A deterministic generator so tests do not depend on Math.random.
function seeded(seed = 1) {
  let value = seed
  return () => {
    value = (value * 16807) % 2147483647
    return (value - 1) / 2147483646
  }
}

function stateWith(piece: Piece, overrides: Partial<TetrisState> = {}): TetrisState {
  return { ...createTetris(seeded()), piece, ...overrides }
}

// Fills the bottom `rows` rows, leaving column 9 open.
function stackWithGap(rows: number): Board {
  const board = createBoard()
  for (let y = BOARD_HEIGHT - rows; y < BOARD_HEIGHT; y++) {
    for (let x = 0; x < BOARD_WIDTH - 1; x++) board[y][x] = 'O'
  }
  return board
}

// A vertical I piece in column 9: its cells sit at x + 2 after one clockwise turn.
const verticalI: Piece = { type: 'I', rotation: 1, x: 7, y: 0 }

const count = (board: Board) => board.flat().filter((cell) => cell !== null).length

describe('createTetris', () => {
  it('starts with an empty 10x20 board and a spawned piece', () => {
    const state = createTetris(seeded())
    expect(state.board).toHaveLength(BOARD_HEIGHT)
    expect(state.board.every((row) => row.length === BOARD_WIDTH && row.every((cell) => cell === null))).toBe(true)
    expect(pieceCells(state.piece)).toHaveLength(4)
    expect(collides(state.board, state.piece)).toBe(false)
    expect(state).toMatchObject({ score: 0, lines: 0, level: 1, over: false })
  })

  it('deals every piece once per bag of seven', () => {
    let bag: PieceType[] = []
    const rng = seeded(7)
    for (let round = 0; round < 3; round++) {
      const dealt: PieceType[] = []
      for (let i = 0; i < PIECE_TYPES.length; i++) {
        const drawn = drawPiece(bag, rng)
        dealt.push(drawn.type)
        bag = drawn.bag
      }
      expect([...dealt].sort()).toEqual([...PIECE_TYPES].sort())
    }
  })
})

describe('movement', () => {
  it('moves sideways and stops at the walls', () => {
    let state = createTetris(seeded())
    const startX = state.piece.x
    expect(movePiece(state, 1).piece.x).toBe(startX + 1)
    for (let i = 0; i < 20; i++) state = movePiece(state, -1)
    expect(Math.min(...pieceCells(state.piece).map((p) => p.x))).toBe(0)
    for (let i = 0; i < 20; i++) state = movePiece(state, 1)
    expect(Math.max(...pieceCells(state.piece).map((p) => p.x))).toBe(BOARD_WIDTH - 1)
  })

  it('does not move into locked cells', () => {
    const board = createBoard()
    board[1][5] = 'O'
    const state = stateWith({ type: 'O', rotation: 0, x: 3, y: 0 }, { board })
    expect(movePiece(state, 1)).toBe(state)
  })

  it('does not mutate the previous state', () => {
    const state = createTetris(seeded())
    const snapshot = JSON.stringify(state)
    movePiece(state, 1)
    rotatePiece(state, 1)
    hardDrop(state, seeded())
    expect(JSON.stringify(state)).toBe(snapshot)
  })
})

describe('rotation', () => {
  it('returns to the starting cells after four turns', () => {
    for (const type of PIECE_TYPES) {
      const start = stateWith({ type, rotation: 0, x: 3, y: 5 })
      let state = start
      for (let i = 0; i < 4; i++) state = rotatePiece(state, 1)
      expect(pieceCells(state.piece)).toEqual(pieceCells(start.piece))
    }
  })

  it('undoes a clockwise turn with a counter-clockwise one', () => {
    const start = stateWith({ type: 'T', rotation: 0, x: 3, y: 5 })
    expect(rotatePiece(rotatePiece(start, 1), -1).piece).toEqual(start.piece)
  })

  it('turns a flat I piece upright', () => {
    const state = rotatePiece(stateWith({ type: 'I', rotation: 0, x: 3, y: 5 }), 1)
    const cells = pieceCells(state.piece)
    expect(new Set(cells.map((p) => p.x)).size).toBe(1)
    expect(new Set(cells.map((p) => p.y)).size).toBe(4)
  })

  it('kicks off the wall when the turn would not fit in place', () => {
    // Upright I against the left wall; turning it flat would poke out of the board without a kick.
    const upright = stateWith({ type: 'I', rotation: 1, x: -2, y: 5 })
    const turned = rotatePiece(upright, 1)
    expect(turned).not.toBe(upright)
    expect(turned.piece.rotation).toBe(2)
    expect(collides(turned.board, turned.piece)).toBe(false)
  })

  it('leaves the piece alone when no kick fits', () => {
    const board = createBoard()
    // Wall the piece in so the flat orientation cannot fit anywhere.
    for (let y = 0; y < BOARD_HEIGHT; y++) for (let x = 0; x < BOARD_WIDTH; x++) board[y][x] = 'O'
    for (let y = 5; y < 9; y++) board[y][5] = null
    const state = stateWith({ type: 'I', rotation: 1, x: 3, y: 5 }, { board })
    expect(rotatePiece(state, 1)).toBe(state)
  })
})

describe('gravity and locking', () => {
  it('falls one row per step', () => {
    const state = createTetris(seeded())
    expect(stepDown(state).piece.y).toBe(state.piece.y + 1)
  })

  it('locks on the floor and spawns the queued piece', () => {
    const state = stateWith({ type: 'O', rotation: 0, x: 4, y: BOARD_HEIGHT - 2 }, { next: 'T' })
    const after = stepDown(state, seeded())
    expect(count(after.board)).toBe(4)
    expect(after.board[BOARD_HEIGHT - 1][4]).toBe('O')
    expect(after.piece.type).toBe('T')
    expect(after.piece.y).toBe(0)
    expect(after.over).toBe(false)
  })

  it('locks on top of stacked cells', () => {
    const board = createBoard()
    board[10][4] = 'I'
    const state = stateWith({ type: 'O', rotation: 0, x: 4, y: 8 }, { board })
    const after = stepDown(state, seeded())
    expect(after.board[8][4]).toBe('O')
    expect(after.board[9][5]).toBe('O')
  })

  it('computes a ghost piece at the landing row', () => {
    const state = stateWith({ type: 'O', rotation: 0, x: 4, y: 0 })
    expect(ghostPiece(state)).toEqual({ type: 'O', rotation: 0, x: 4, y: BOARD_HEIGHT - 2 })
  })

  it('hard drops straight to the bottom and locks', () => {
    const state = stateWith({ type: 'O', rotation: 0, x: 4, y: 0 }, { next: 'T' })
    const after = hardDrop(state, seeded())
    expect(after.board[BOARD_HEIGHT - 1][4]).toBe('O')
    expect(after.board[BOARD_HEIGHT - 2][5]).toBe('O')
    expect(after.piece.type).toBe('T')
  })
})

describe('line clears and scoring', () => {
  it('removes full rows and shifts the rest down', () => {
    const board = createBoard()
    board[BOARD_HEIGHT - 1].fill('I')
    board[BOARD_HEIGHT - 2][0] = 'T'
    const result = clearLines(board)
    expect(result.cleared).toBe(1)
    expect(result.board).toHaveLength(BOARD_HEIGHT)
    expect(result.board[BOARD_HEIGHT - 1][0]).toBe('T')
    expect(count(result.board)).toBe(1)
  })

  it.each([
    [1, 100],
    [2, 300],
    [3, 500],
    [4, 800],
  ])('scores %i cleared lines as %i at level 1', (rows, points) => {
    const state = stateWith(verticalI, { board: stackWithGap(rows) })
    const after = hardDrop(state, seeded())
    expect(after.lines).toBe(rows)
    expect(after.score).toBe(points)
  })

  it('multiplies the score by the level', () => {
    const state = stateWith(verticalI, { board: stackWithGap(4), level: 3, lines: 20 })
    const after = hardDrop(state, seeded())
    expect(after.score).toBe(800 * 3)
  })

  it('keeps the leftover cells of the dropped piece after a clear', () => {
    // A vertical I through two open rows clears them and leaves the other two cells at the bottom.
    const state = stateWith(verticalI, { board: stackWithGap(2) })
    const after = hardDrop(state, seeded())
    expect(after.lines).toBe(2)
    expect(count(after.board)).toBe(2)
    expect(after.board[BOARD_HEIGHT - 1][9]).toBe('I')
  })

  it('levels up every ten lines', () => {
    const state = stateWith(verticalI, { board: stackWithGap(1), lines: 9 })
    const after = hardDrop(state, seeded())
    expect(after.lines).toBe(10)
    expect(after.level).toBe(2)
  })

  it('scores a clear at the level it was made on, before levelling up', () => {
    const state = stateWith(verticalI, { board: stackWithGap(1), lines: 9, level: 1 })
    expect(hardDrop(state, seeded()).score).toBe(100)
  })
})

describe('game over', () => {
  it('ends when the next piece cannot spawn', () => {
    const board = createBoard()
    for (let x = 0; x < BOARD_WIDTH; x++) board[1][x] = x === 9 ? null : 'O'
    const state = stateWith({ type: 'O', rotation: 0, x: 8, y: 17 }, { board, next: 'O' })
    const after = hardDrop(state, seeded())
    expect(after.over).toBe(true)
  })

  it('ignores input once the game is over', () => {
    const state = { ...createTetris(seeded()), over: true }
    expect(movePiece(state, 1)).toBe(state)
    expect(rotatePiece(state, 1)).toBe(state)
    expect(stepDown(state)).toBe(state)
    expect(hardDrop(state)).toBe(state)
  })
})

describe('tetrisInterval', () => {
  it('speeds up per level and never drops below the floor', () => {
    expect(tetrisInterval(2)).toBeLessThan(tetrisInterval(1))
    expect(tetrisInterval(5)).toBeLessThan(tetrisInterval(4))
    expect(tetrisInterval(50)).toBe(tetrisInterval(100))
    expect(tetrisInterval(50)).toBeGreaterThan(0)
  })
})
