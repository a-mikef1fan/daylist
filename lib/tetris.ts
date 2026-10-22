export type Point = { x: number; y: number }
export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L'
export type Cell = PieceType | null
export type Board = Cell[][] // rows top to bottom

export type Piece = {
  type: PieceType
  rotation: number // 0-3, clockwise quarter turns from spawn
  x: number // board column of the piece's bounding box
  y: number // board row of the piece's bounding box
}

export type TetrisState = {
  board: Board
  piece: Piece
  next: PieceType
  bag: PieceType[] // pieces still to come in the current shuffled bag
  score: number
  lines: number
  level: number
  over: boolean
}

export const BOARD_WIDTH = 10
export const BOARD_HEIGHT = 20
export const LINES_PER_LEVEL = 10
export const PIECE_TYPES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']

// Points for clearing 0-4 rows at once, multiplied by the current level.
const LINE_SCORES = [0, 100, 300, 500, 800]

// Cells at spawn rotation, inside a square bounding box of the given size.
const BASE_SHAPES: Record<PieceType, { size: number; cells: Point[] }> = {
  I: { size: 4, cells: [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }] },
  O: { size: 2, cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }] },
  T: { size: 3, cells: [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }] },
  S: { size: 3, cells: [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }] },
  Z: { size: 3, cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }] },
  J: { size: 3, cells: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }] },
  L: { size: 3, cells: [{ x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }] },
}

function rotateClockwise(cells: Point[], size: number): Point[] {
  return cells.map((p) => ({ x: size - 1 - p.y, y: p.x }))
}

const SHAPES = Object.fromEntries(
  PIECE_TYPES.map((type) => {
    const { size, cells } = BASE_SHAPES[type]
    const rotations = [cells]
    for (let i = 1; i < 4; i++) rotations.push(rotateClockwise(rotations[i - 1], size))
    return [type, rotations]
  }),
) as Record<PieceType, Point[][]>

// Horizontal offsets tried in order when a rotation does not fit in place.
const WALL_KICKS = [0, -1, 1, -2, 2]

export function createBoard(): Board {
  return Array.from({ length: BOARD_HEIGHT }, () => Array<Cell>(BOARD_WIDTH).fill(null))
}

export function pieceCells(piece: Piece): Point[] {
  return SHAPES[piece.type][piece.rotation].map((p) => ({ x: piece.x + p.x, y: piece.y + p.y }))
}

// The piece's cells relative to its own box, for drawing a preview.
export function pieceShape(type: PieceType, rotation = 0): { size: number; cells: Point[] } {
  return { size: BASE_SHAPES[type].size, cells: SHAPES[type][rotation] }
}

export function collides(board: Board, piece: Piece) {
  return pieceCells(piece).some(
    (p) => p.x < 0 || p.x >= BOARD_WIDTH || p.y < 0 || p.y >= BOARD_HEIGHT || board[p.y][p.x] !== null,
  )
}

// Takes the next piece from the bag, refilling it with a fresh shuffle of all seven when empty.
export function drawPiece(bag: PieceType[], rng: () => number = Math.random): { type: PieceType; bag: PieceType[] } {
  let rest = bag
  if (rest.length === 0) {
    rest = [...PIECE_TYPES]
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.min(i, Math.floor(rng() * (i + 1)))
      ;[rest[i], rest[j]] = [rest[j], rest[i]]
    }
  }
  return { type: rest[0], bag: rest.slice(1) }
}

function spawnPiece(type: PieceType): Piece {
  return { type, rotation: 0, x: Math.floor((BOARD_WIDTH - BASE_SHAPES[type].size) / 2), y: 0 }
}

export function createTetris(rng: () => number = Math.random): TetrisState {
  const first = drawPiece([], rng)
  const second = drawPiece(first.bag, rng)
  return {
    board: createBoard(),
    piece: spawnPiece(first.type),
    next: second.type,
    bag: second.bag,
    score: 0,
    lines: 0,
    level: 1,
    over: false,
  }
}

export function movePiece(state: TetrisState, dx: number): TetrisState {
  if (state.over) return state
  const piece = { ...state.piece, x: state.piece.x + dx }
  return collides(state.board, piece) ? state : { ...state, piece }
}

// direction: 1 turns clockwise, -1 counter-clockwise.
export function rotatePiece(state: TetrisState, direction: 1 | -1): TetrisState {
  if (state.over) return state
  const rotation = (state.piece.rotation + direction + 4) % 4
  for (const kick of WALL_KICKS) {
    const piece = { ...state.piece, rotation, x: state.piece.x + kick }
    if (!collides(state.board, piece)) return { ...state, piece }
  }
  return state
}

export function clearLines(board: Board): { board: Board; cleared: number } {
  const kept = board.filter((row) => row.some((cell) => cell === null))
  const cleared = board.length - kept.length
  if (cleared === 0) return { board, cleared }
  const empty = Array.from({ length: cleared }, () => Array<Cell>(BOARD_WIDTH).fill(null))
  return { board: [...empty, ...kept], cleared }
}

function lockPiece(state: TetrisState, rng: () => number): TetrisState {
  const merged = state.board.map((row) => [...row])
  for (const p of pieceCells(state.piece)) merged[p.y][p.x] = state.piece.type
  const { board, cleared } = clearLines(merged)

  const lines = state.lines + cleared
  const level = Math.floor(lines / LINES_PER_LEVEL) + 1
  const score = state.score + LINE_SCORES[cleared] * state.level

  const piece = spawnPiece(state.next)
  const drawn = drawPiece(state.bag, rng)
  return { board, piece, next: drawn.type, bag: drawn.bag, score, lines, level, over: collides(board, piece) }
}

// One gravity tick or soft-drop step: the piece falls a row, or locks in place if it is resting.
export function stepDown(state: TetrisState, rng: () => number = Math.random): TetrisState {
  if (state.over) return state
  const piece = { ...state.piece, y: state.piece.y + 1 }
  return collides(state.board, piece) ? lockPiece(state, rng) : { ...state, piece }
}

// Where the current piece would land if dropped straight down.
export function ghostPiece(state: TetrisState): Piece {
  let piece = state.piece
  while (!collides(state.board, { ...piece, y: piece.y + 1 })) piece = { ...piece, y: piece.y + 1 }
  return piece
}

export function hardDrop(state: TetrisState, rng: () => number = Math.random): TetrisState {
  if (state.over) return state
  return lockPiece({ ...state, piece: ghostPiece(state) }, rng)
}

// Milliseconds per gravity tick: starts relaxed and speeds up each level down to a floor.
export function tetrisInterval(level: number) {
  return Math.max(90, 800 - (level - 1) * 70)
}
