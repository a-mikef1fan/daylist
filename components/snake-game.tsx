'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Pause, Play, RotateCcw } from 'lucide-react'
import {
  SNAKE_GRID,
  createSnake,
  isOpposite,
  snakeInterval,
  stepSnake,
  type Direction,
  type SnakeState,
} from '@/lib/snake'

type Status = 'ready' | 'running' | 'paused' | 'over'

const BEST_STORAGE_KEY = 'daylist:snake-best'
const CELL = 20
const CANVAS_SIZE = SNAKE_GRID * CELL

const keyDirections: Record<string, Direction> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right',
  W: 'up', S: 'down', A: 'left', D: 'right',
}

const dPad: { direction: Direction; label: string; icon: typeof ArrowUp }[] = [
  { direction: 'up', label: 'Up', icon: ArrowUp },
  { direction: 'left', label: 'Left', icon: ArrowLeft },
  { direction: 'right', label: 'Right', icon: ArrowRight },
  { direction: 'down', label: 'Down', icon: ArrowDown },
]

export function SnakeGame() {
  const [game, setGame] = useState<SnakeState>(() => createSnake())
  const [status, setStatus] = useState<Status>('ready')
  const [best, setBest] = useState(0)
  const gameRef = useRef(game)
  const queueRef = useRef<Direction[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)
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

  const commit = useCallback((next: SnakeState) => {
    gameRef.current = next
    setGame(next)
    if (next.over) {
      setStatus('over')
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
  }, [])

  // The timer only exists while running, and is cleared on pause, game over, or unmount.
  const speed = snakeInterval(game.score)
  useEffect(() => {
    if (status !== 'running') return
    const id = window.setInterval(() => {
      const direction = queueRef.current.shift() ?? gameRef.current.direction
      commit(stepSnake(gameRef.current, direction))
    }, speed)
    return () => window.clearInterval(id)
  }, [status, speed, commit])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const styles = window.getComputedStyle(canvas)
    const color = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback
    context.fillStyle = color('--secondary', '#f1f1ea')
    context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    if (game.food) {
      context.fillStyle = color('--coral', '#d9774f')
      context.beginPath()
      context.arc((game.food.x + 0.5) * CELL, (game.food.y + 0.5) * CELL, CELL * 0.34, 0, Math.PI * 2)
      context.fill()
    }
    game.snake.forEach((part, index) => {
      context.fillStyle = index === 0 ? color('--sage-deep', '#2f5d46') : color('--primary', '#3d6b52')
      context.fillRect(part.x * CELL + 1, part.y * CELL + 1, CELL - 2, CELL - 2)
    })
  }, [game])

  function restart() {
    queueRef.current = []
    const fresh = createSnake()
    gameRef.current = fresh
    setGame(fresh)
    setStatus('running')
    boardRef.current?.focus()
  }

  function turn(direction: Direction) {
    if (status === 'over') return
    const last = queueRef.current[queueRef.current.length - 1] ?? gameRef.current.direction
    if (direction !== last && !isOpposite(last, direction) && queueRef.current.length < 2) {
      queueRef.current.push(direction)
    }
    if (status === 'ready' || status === 'paused') setStatus('running')
  }

  function togglePause() {
    if (status === 'running') setStatus('paused')
    else if (status === 'paused') setStatus('running')
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const direction = keyDirections[event.key]
    if (direction) {
      event.preventDefault()
      turn(direction)
    } else if (event.key === 'p' || event.key === 'P' || (event.key === ' ' && event.target === event.currentTarget)) {
      event.preventDefault()
      if (status === 'over') restart()
      else if (status === 'ready') setStatus('running')
      else togglePause()
    }
  }

  const statusText =
    status === 'over' ? `Game over. Final score ${game.score}.${game.won ? ' You filled the board!' : ''}` : `Score ${game.score}`

  return (
    <section className="snake-panel" aria-labelledby="snake-title">
      <div className="snake-heading">
        <div>
          <span className="eyebrow">JUST FOR FUN</span>
          <h2 id="snake-title">Snake</h2>
        </div>
        <div className="snake-scores">
          <span className="snake-score" aria-live="polite">{statusText}</span>
          <span className="snake-best">Best {best}</span>
        </div>
      </div>
      <p className="snake-help" id="snake-help">
        Eat the dots without hitting the walls or yourself. Use the arrow keys or W A S D to steer, and Space or P to pause.
      </p>
      <div className="snake-board" ref={boardRef} tabIndex={0} onKeyDown={handleKeyDown} aria-describedby="snake-help">
        <canvas ref={canvasRef} className="snake-canvas" width={CANVAS_SIZE} height={CANVAS_SIZE} role="img" aria-label={`Snake board. Score ${game.score}.`} />
        {status !== 'running' && (
          <div className="snake-overlay">
            <strong>{status === 'over' ? 'Game over' : status === 'paused' ? 'Paused' : 'Ready?'}</strong>
            <span>{status === 'over' ? `You scored ${game.score}.` : status === 'paused' ? 'Press Space or P to keep going.' : 'Press an arrow key to start.'}</span>
            {status === 'over' ? (
              <button className="snake-action" type="button" onClick={restart}><RotateCcw aria-hidden="true" /> Play again</button>
            ) : (
              <button className="snake-action" type="button"><Play aria-hidden="true" /> {status === 'paused' ? 'Resume' : 'Start'}</button>
            )}
          </div>
        )}
      </div>
      <div className="snake-controls">
        <div className="snake-dpad" role="group" aria-label="Steering">
          {dPad.map(({ direction, label, icon: Icon }) => (
            <button key={direction} type="button" className={`snake-dpad-${direction}`} onClick={() => turn(direction)} aria-label={label}><Icon aria-hidden="true" /></button>
          ))}
        </div>
        <button className="snake-pause" type="button" onClick={togglePause} disabled={status !== 'running' && status !== 'paused'}>
          {status === 'paused' ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
          {status === 'paused' ? 'Resume' : 'Pause'}
        </button>
      </div>
    </section>
  )
}
