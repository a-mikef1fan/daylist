'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ChevronsDown, Pause, Play, RotateCcw, RotateCw } from 'lucide-react'
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  createTetris,
  ghostPiece,
  hardDrop,
  movePiece,
  pieceCells,
  pieceShape,
  rotatePiece,
  stepDown,
  tetrisInterval,
  type PieceType,
  type TetrisState,
} from '@/lib/tetris'
import './tetris-game.css'

type Status = 'ready' | 'running' | 'paused' | 'over'
type Action = 'left' | 'right' | 'down' | 'rotate' | 'drop'

const BEST_STORAGE_KEY = 'daylist:tetris-best'
const CELL = 24
const PREVIEW_CELL = 20
const PREVIEW_SIZE = PREVIEW_CELL * 4

const PIECE_COLORS: Record<PieceType, string> = {
  I: '#6fb7b0',
  O: '#e3b95b',
  T: '#9b86c4',
  S: '#6fa36f',
  Z: '#d9774f',
  J: '#6f8fc9',
  L: '#d99a5f',
}

const keyActions: Record<string, Action> = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down', ArrowUp: 'rotate',
  a: 'left', d: 'right', s: 'down', w: 'rotate',
  A: 'left', D: 'right', S: 'down', W: 'rotate',
}

const touchControls: { action: Action; label: string; icon: typeof ArrowDown }[] = [
  { action: 'left', label: 'Move left', icon: ArrowLeft },
  { action: 'rotate', label: 'Rotate', icon: RotateCw },
  { action: 'right', label: 'Move right', icon: ArrowRight },
  { action: 'down', label: 'Soft drop', icon: ArrowDown },
  { action: 'drop', label: 'Hard drop', icon: ChevronsDown },
]

export function TetrisGame() {
  const [game, setGame] = useState<TetrisState>(() => createTetris())
  const [status, setStatus] = useState<Status>('ready')
  const [best, setBest] = useState(0)
  const gameRef = useRef(game)
  const statusRef = useRef(status)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewRef = useRef<HTMLCanvasElement>(null)
  const boardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem(BEST_STORAGE_KEY))
      if (Number.isFinite(saved) && saved > 0) setBest(saved)
    } catch {
      // Storage can be unavailable; the best score just won't persist.
    }
    boardRef.current?.focus()
  }, [])

  const changeStatus = useCallback((next: Status) => {
    statusRef.current = next
    setStatus(next)
  }, [])

  const commit = useCallback((next: TetrisState) => {
    gameRef.current = next
    setGame(next)
    if (next.over) {
      changeStatus('over')
      setBest((current) => {
        if (next.score <= current) return current
        try {
          window.localStorage.setItem(BEST_STORAGE_KEY, String(next.score))
        } catch {
          // Ignore storage failures.
        }
        return next.score
      })
    }
  }, [changeStatus])

  // The timer only exists while running, and is cleared on pause, game over, or unmount.
  const speed = tetrisInterval(game.level)
  useEffect(() => {
    if (status !== 'running') return
    const id = window.setInterval(() => commit(stepDown(gameRef.current)), speed)
    return () => window.clearInterval(id)
  }, [status, speed, commit])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const styles = window.getComputedStyle(canvas)
    const color = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback
    context.fillStyle = color('--secondary', '#f1f1ea')
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.strokeStyle = color('--border', '#e4e4dc')
    context.lineWidth = 1
    context.beginPath()
    for (let x = 1; x < BOARD_WIDTH; x++) {
      context.moveTo(x * CELL + 0.5, 0)
      context.lineTo(x * CELL + 0.5, canvas.height)
    }
    for (let y = 1; y < BOARD_HEIGHT; y++) {
      context.moveTo(0, y * CELL + 0.5)
      context.lineTo(canvas.width, y * CELL + 0.5)
    }
    context.stroke()
    game.board.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (!cell) return
        context.fillStyle = PIECE_COLORS[cell]
        context.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2)
      })
    })
    if (game.over) return
    context.globalAlpha = 0.22
    context.fillStyle = PIECE_COLORS[game.piece.type]
    for (const cell of pieceCells(ghostPiece(game))) {
      context.fillRect(cell.x * CELL + 1, cell.y * CELL + 1, CELL - 2, CELL - 2)
    }
    context.globalAlpha = 1
    for (const cell of pieceCells(game.piece)) {
      context.fillRect(cell.x * CELL + 1, cell.y * CELL + 1, CELL - 2, CELL - 2)
    }
  }, [game])

  useEffect(() => {
    const canvas = previewRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const styles = window.getComputedStyle(canvas)
    context.fillStyle = styles.getPropertyValue('--secondary').trim() || '#f1f1ea'
    context.fillRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE)
    const { size, cells } = pieceShape(game.next)
    const offset = ((4 - size) * PREVIEW_CELL) / 2
    context.fillStyle = PIECE_COLORS[game.next]
    for (const cell of cells) {
      context.fillRect(offset + cell.x * PREVIEW_CELL + 1, offset + cell.y * PREVIEW_CELL + 1, PREVIEW_CELL - 2, PREVIEW_CELL - 2)
    }
  }, [game.next])

  function start() {
    if (statusRef.current === 'over') {
      gameRef.current = createTetris()
      setGame(gameRef.current)
    }
    changeStatus('running')
    boardRef.current?.focus()
  }

  function togglePause() {
    if (statusRef.current === 'running') changeStatus('paused')
    else if (statusRef.current === 'paused') changeStatus('running')
    boardRef.current?.focus()
  }

  function act(action: Action) {
    if (statusRef.current !== 'running') return
    const current = gameRef.current
    if (action === 'left') commit(movePiece(current, -1))
    else if (action === 'right') commit(movePiece(current, 1))
    else if (action === 'down') commit(stepDown(current))
    else if (action === 'rotate') commit(rotatePiece(current, 1))
    else commit(hardDrop(current))
  }

  function touch(action: Action) {
    act(action)
    boardRef.current?.focus()
  }

  // Keys are only handled while focus is inside the game panel, so typing elsewhere in the app is never affected.
  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.ctrlKey || event.metaKey || event.altKey) return
    const onBoard = event.target === boardRef.current
    const action = keyActions[event.key]
    const isSpace = event.key === ' ' || event.key === 'Spacebar'
    const isPause = event.key === 'p' || event.key === 'P'
    const isEnter = event.key === 'Enter'

    if (action) {
      event.preventDefault()
      if (event.repeat && action === 'rotate') return
      act(action)
    } else if (isPause) {
      event.preventDefault()
      if (event.repeat) return
      if (statusRef.current === 'running' || statusRef.current === 'paused') togglePause()
      else start()
    } else if ((isSpace || isEnter) && onBoard) {
      // On the board itself Space hard-drops; elsewhere it is left to activate the focused button.
      event.preventDefault()
      if (event.repeat) return
      if (statusRef.current === 'running' && isSpace) act('drop')
      else if (statusRef.current !== 'running') start()
    }
  }

  // Pause when focus leaves the panel, since keys would no longer reach the game.
  function handleBlur(event: React.FocusEvent<HTMLElement>) {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return
    if (statusRef.current === 'running') changeStatus('paused')
  }

  const statusText =
    status === 'over' ? `Game over. Final score ${game.score}.` : `Score ${game.score}`

  return (
    <section className="tetris-panel" aria-labelledby="tetris-title" onKeyDown={handleKeyDown} onBlur={handleBlur}>
      <div className="tetris-heading">
        <div>
          <span className="eyebrow">JUST FOR FUN</span>
          <h2 id="tetris-title">Tetris</h2>
        </div>
        <div className="tetris-scores">
          <span className="tetris-score" aria-live="polite">{statusText}</span>
          <span className="tetris-best">Best {best}</span>
        </div>
      </div>
      <p className="tetris-help" id="tetris-help">
        Fill rows to clear them. Use the arrow keys or W A S D to move, turn, and soft drop, Space to hard drop, and P to pause.
      </p>
      <div className="tetris-layout">
        <div className="tetris-board" ref={boardRef} tabIndex={0} aria-describedby="tetris-help">
          <canvas ref={canvasRef} className="tetris-canvas" width={BOARD_WIDTH * CELL} height={BOARD_HEIGHT * CELL} role="img" aria-label={`Tetris board. Score ${game.score}. Level ${game.level}.`} />
          {status !== 'running' && (
            <div className="tetris-overlay">
              <strong>{status === 'over' ? 'Game over' : status === 'paused' ? 'Paused' : 'Ready?'}</strong>
              <span>{status === 'over' ? `You scored ${game.score}.` : status === 'paused' ? 'Press P to keep going.' : 'Press Space to start.'}</span>
              <button className="tetris-action" type="button" onClick={start}>
                {status === 'over' ? <RotateCcw aria-hidden="true" /> : <Play aria-hidden="true" />}
                {status === 'over' ? 'Play again' : status === 'paused' ? 'Resume' : 'Start'}
              </button>
            </div>
          )}
        </div>
        <aside className="tetris-side" aria-label="Game status">
          <div className="tetris-stat">
            <span>Next</span>
            <canvas ref={previewRef} className="tetris-preview" width={PREVIEW_SIZE} height={PREVIEW_SIZE} role="img" aria-label={`Next piece: ${game.next}`} />
          </div>
          <div className="tetris-stat"><span>Level</span><strong>{game.level}</strong></div>
          <div className="tetris-stat"><span>Lines</span><strong>{game.lines}</strong></div>
          <button className="tetris-pause" type="button" onClick={togglePause} disabled={status !== 'running' && status !== 'paused'}>
            {status === 'paused' ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
            {status === 'paused' ? 'Resume' : 'Pause'}
          </button>
        </aside>
      </div>
      <div className="tetris-controls" role="group" aria-label="Touch controls">
        {touchControls.map(({ action, label, icon: Icon }) => (
          <button key={action} type="button" onClick={() => touch(action)} aria-label={label} disabled={status !== 'running'}><Icon aria-hidden="true" /></button>
        ))}
      </div>
    </section>
  )
}
