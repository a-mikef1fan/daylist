'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronRight,
  Hourglass,
  RotateCcw,
  Undo2,
} from 'lucide-react'
import { THESEUS_LEVELS } from '@/lib/theseus-levels'
import { parseMaze, solveMaze, takeTurn, type Maze, type Move, type Outcome, type Point, type Positions } from '@/lib/theseus'
import './theseus-game.css'

const STORAGE_KEY = 'daylist:theseus-progress'
const CELL = 40
const PAD = 14
const LEVEL_COUNT = THESEUS_LEVELS.length

type Progress = { level: number; best: Record<string, number> }

type Game = {
  level: number
  positions: Positions
  history: Positions[] // earlier positions, so undo can step back one turn at a time
  outcome: Outcome
}

const keyMoves: Record<string, Move> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right',
  W: 'up', S: 'down', A: 'left', D: 'right',
}

const dPad: { move: Move; label: string; icon: typeof ArrowUp }[] = [
  { move: 'up', label: 'Up', icon: ArrowUp },
  { move: 'left', label: 'Left', icon: ArrowLeft },
  { move: 'right', label: 'Right', icon: ArrowRight },
  { move: 'down', label: 'Down', icon: ArrowDown },
]

function startGame(level: number, maze: Maze): Game {
  return { level, positions: { theseus: maze.theseus, minotaur: maze.minotaur }, history: [], outcome: 'playing' }
}

function exitSide(maze: Maze) {
  if (maze.exit.y < 0) return 'top'
  if (maze.exit.y >= maze.height) return 'bottom'
  if (maze.exit.x < 0) return 'left'
  return 'right'
}

function readProgress(): Progress {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (parsed && typeof parsed === 'object') {
      const level = Number(parsed.level)
      const best: Record<string, number> = {}
      if (parsed.best && typeof parsed.best === 'object') {
        for (const [key, value] of Object.entries(parsed.best)) {
          const index = Number(key)
          if (Number.isInteger(index) && index >= 0 && index < LEVEL_COUNT && Number.isFinite(value) && (value as number) > 0) {
            best[key] = value as number
          }
        }
      }
      return { level: Number.isInteger(level) && level >= 0 && level < LEVEL_COUNT ? level : 0, best }
    }
  } catch {
    // Storage can be unavailable or corrupt; progress just won't persist.
  }
  return { level: 0, best: {} }
}

function writeProgress(progress: Progress) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // Ignore storage failures.
  }
}

function Theseus({ at, lost }: { at: Point; lost: boolean }) {
  return (
    <g className="theseus-piece" style={{ transform: `translate(${(at.x + 0.5) * CELL}px, ${(at.y + 0.5) * CELL}px)` }}>
      <circle r="17" fill="#1d8a8c" stroke="#1b0f16" strokeWidth="2.4" />
      <path d="M-12 12 Q-14 5 -6 4 L6 4 Q14 5 12 12 A17 17 0 0 1 -12 12 Z" fill="#f0b93a" stroke="#1b0f16" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M-12 12 Q-13 7 -9 5.5 M12 12 Q13 7 9 5.5" fill="none" stroke="#b57d22" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="-2.6" y="1.5" width="5.2" height="4" fill="#b8744c" />
      <path d="M-6.4 -5 Q-7 3.5 0 6.5 Q7 3.5 6.4 -5 Q6 -11 0 -11 Q-6 -11 -6.4 -5 Z" fill="#dc9a6a" stroke="#1b0f16" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M-6.2 -3 Q-6.5 4 0 6.6 Q6.5 4 6.2 -3 Q4 1.5 0 1.5 Q-4 1.5 -6.2 -3 Z" fill="#4b2a1c" />
      <path d="M-6.6 -6 Q-7 -12 0 -12 Q7 -12 6.6 -6 Q3 -9 0 -8 Q-3 -9 -6.6 -6 Z" fill="#4b2a1c" stroke="#1b0f16" strokeWidth="1.2" />
      <circle cx="-2.6" cy="-4" r="1" fill="#1b0f16" /><circle cx="2.6" cy="-4" r="1" fill="#1b0f16" />
      <path d="M-4.2 -6.2 L-1.4 -5.4 M4.2 -6.2 L1.4 -5.4" stroke="#1b0f16" strokeWidth="1.1" strokeLinecap="round" />
      <ellipse cx="-9.1" cy="-2.6" rx="2.7" ry="1.5" transform="rotate(230 -9.1 -2.6)" fill="#ffe08a" stroke="#b57d22" strokeWidth="0.8" /><ellipse cx="-9.4" cy="-5.8" rx="2.7" ry="1.5" transform="rotate(250 -9.4 -5.8)" fill="#ffe08a" stroke="#b57d22" strokeWidth="0.8" /><ellipse cx="-8.5" cy="-9.0" rx="2.7" ry="1.5" transform="rotate(270 -8.5 -9.0)" fill="#ffe08a" stroke="#b57d22" strokeWidth="0.8" /><ellipse cx="-6.6" cy="-11.6" rx="2.7" ry="1.5" transform="rotate(290 -6.6 -11.6)" fill="#ffe08a" stroke="#b57d22" strokeWidth="0.8" /><ellipse cx="-4.0" cy="-13.5" rx="2.7" ry="1.5" transform="rotate(310 -4.0 -13.5)" fill="#ffe08a" stroke="#b57d22" strokeWidth="0.8" /><ellipse cx="-0.8" cy="-14.4" rx="2.7" ry="1.5" transform="rotate(330 -0.8 -14.4)" fill="#ffe08a" stroke="#b57d22" strokeWidth="0.8" /><ellipse cx="9.1" cy="-2.6" rx="2.7" ry="1.5" transform="rotate(-50 9.1 -2.6)" fill="#ffe08a" stroke="#b57d22" strokeWidth="0.8" /><ellipse cx="9.4" cy="-5.8" rx="2.7" ry="1.5" transform="rotate(-70 9.4 -5.8)" fill="#ffe08a" stroke="#b57d22" strokeWidth="0.8" /><ellipse cx="8.5" cy="-9.0" rx="2.7" ry="1.5" transform="rotate(-90 8.5 -9.0)" fill="#ffe08a" stroke="#b57d22" strokeWidth="0.8" /><ellipse cx="6.6" cy="-11.6" rx="2.7" ry="1.5" transform="rotate(-110 6.6 -11.6)" fill="#ffe08a" stroke="#b57d22" strokeWidth="0.8" /><ellipse cx="4.0" cy="-13.5" rx="2.7" ry="1.5" transform="rotate(-130 4.0 -13.5)" fill="#ffe08a" stroke="#b57d22" strokeWidth="0.8" /><ellipse cx="0.8" cy="-14.4" rx="2.7" ry="1.5" transform="rotate(-150 0.8 -14.4)" fill="#ffe08a" stroke="#b57d22" strokeWidth="0.8" />
      {lost && <circle r="21" fill="none" stroke="var(--destructive)" strokeWidth="3" strokeDasharray="4 3" />}
    </g>
  )
}

function Minotaur({ at }: { at: Point }) {
  return (
    <g className="theseus-piece" style={{ transform: `translate(${(at.x + 0.5) * CELL}px, ${(at.y + 0.5) * CELL}px)` }}>
      <circle r="17" fill="#6c1523" stroke="#1b0f16" strokeWidth="2.4" />
      <path d="M-13 11 Q-15 5 -8 4 L8 4 Q15 5 13 11 A17 17 0 0 1 -13 11 Z" fill="#c0773a" stroke="#1b0f16" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M-13 11 L-15 6 M13 11 L15 6" stroke="#1b0f16" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M-7 -8 C-14 -8 -15 -15 -10.5 -19 C-12 -14 -9 -12 -5 -11 Z" fill="#f1e4be" stroke="#1b0f16" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M7 -8 C14 -8 15 -15 10.5 -19 C12 -14 9 -12 5 -11 Z" fill="#f1e4be" stroke="#1b0f16" strokeWidth="1.6" strokeLinejoin="round" />
      <ellipse cx="-8.6" cy="-5" rx="3" ry="1.8" transform="rotate(25 -8.6 -5)" fill="#8f2d2d" stroke="#1b0f16" strokeWidth="1.4" />
      <ellipse cx="8.6" cy="-5" rx="3" ry="1.8" transform="rotate(-25 8.6 -5)" fill="#8f2d2d" stroke="#1b0f16" strokeWidth="1.4" />
      <path d="M-7.5 -9 Q0 -12.5 7.5 -9 Q8.5 -3 5.8 3 Q0 8 -5.8 3 Q-8.5 -3 -7.5 -9 Z" fill="#8f2d2d" stroke="#1b0f16" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M-3.6 -9.6 Q0 -6.5 3.6 -9.6" fill="none" stroke="#c9694f" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M-5.2 1 Q-5.6 7.4 0 7.6 Q5.6 7.4 5.2 1 Q3 -1 0 -1 Q-3 -1 -5.2 1 Z" fill="#e2a07a" stroke="#1b0f16" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="-2" cy="2.4" r="0.9" fill="#1b0f16" /><circle cx="2" cy="2.4" r="0.9" fill="#1b0f16" />
      <path d="M-2.4 6.6 Q0 9.6 2.4 6.6" fill="none" stroke="#1b0f16" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M-2.4 6.6 Q0 9.6 2.4 6.6" fill="none" stroke="#f0b93a" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M-5.4 -6 L-1.6 -4.2 M5.4 -6 L1.6 -4.2" stroke="#1b0f16" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="-3.2" cy="-3.2" r="1" fill="#ffe08a" /><circle cx="3.2" cy="-3.2" r="1" fill="#ffe08a" />
    </g>
  )
}

function MazeBoard({ maze, positions, outcome, label }: { maze: Maze; positions: Positions; outcome: Outcome; label: string }) {
  const side = exitSide(maze)
  const minX = (side === 'left' ? -1 : 0) * CELL - PAD
  const minY = (side === 'top' ? -1 : 0) * CELL - PAD
  const maxX = (maze.width + (side === 'right' ? 1 : 0)) * CELL + PAD
  const maxY = (maze.height + (side === 'bottom' ? 1 : 0)) * CELL + PAD

  const walls: { x1: number; y1: number; x2: number; y2: number }[] = []
  const line = (x1: number, y1: number, x2: number, y2: number) => walls.push({ x1: x1 * CELL, y1: y1 * CELL, x2: x2 * CELL, y2: y2 * CELL })
  for (let y = 0; y < maze.height; y++) {
    for (let x = 0; x < maze.width; x++) {
      if (x < maze.width - 1 && maze.east[y][x]) line(x + 1, y, x + 1, y + 1)
      if (y < maze.height - 1 && maze.south[y][x]) line(x, y + 1, x + 1, y + 1)
    }
  }
  for (let x = 0; x < maze.width; x++) {
    if (!(maze.exit.x === x && maze.exit.y === -1)) line(x, 0, x + 1, 0)
    if (!(maze.exit.x === x && maze.exit.y === maze.height)) line(x, maze.height, x + 1, maze.height)
  }
  for (let y = 0; y < maze.height; y++) {
    if (!(maze.exit.y === y && maze.exit.x === -1)) line(0, y, 0, y + 1)
    if (!(maze.exit.y === y && maze.exit.x === maze.width)) line(maze.width, y, maze.width, y + 1)
  }

  const exitCenter = { x: (maze.exit.x + 0.5) * CELL, y: (maze.exit.y + 0.5) * CELL }
  const arrowRotation = { top: -90, bottom: 90, left: 180, right: 0 }[side]

  return (
    <svg
      className="theseus-svg"
      viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
      role="img"
      aria-label={label}
      data-outcome={outcome}
    >
      <rect x="0" y="0" width={maze.width * CELL} height={maze.height * CELL} fill="var(--secondary)" />
      {/* Exit: the gap in the outer wall, with a marked doorstep just outside it. */}
      <g transform={`translate(${exitCenter.x} ${exitCenter.y})`}>
        <rect x={-CELL / 2 + 3} y={-CELL / 2 + 3} width={CELL - 6} height={CELL - 6} rx="8" fill="var(--warm)" stroke="var(--sage-deep)" strokeWidth="2" strokeDasharray="5 3" />
        <g transform={`rotate(${arrowRotation})`}>
          <path d="M-8 0 H8 M2 -6 L8 0 L2 6" fill="none" stroke="var(--sage-deep)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>
      <g stroke="var(--foreground)" strokeWidth="4" strokeLinecap="round">
        {walls.map((wall, index) => (
          <line key={index} {...wall} />
        ))}
      </g>
      <Theseus at={positions.theseus} lost={outcome === 'lost'} />
      <Minotaur at={positions.minotaur} />
    </svg>
  )
}

export function TheseusGame() {
  const [progress, setProgress] = useState<Progress>({ level: 0, best: {} })
  const [game, setGame] = useState<Game>(() => startGame(0, parseMaze(THESEUS_LEVELS[0])))
  const [notice, setNotice] = useState('')
  const boardRef = useRef<HTMLDivElement>(null)

  const maze = useMemo(() => parseMaze(THESEUS_LEVELS[game.level]), [game.level])
  const par = useMemo(() => solveMaze(maze).minMoves, [maze])

  // Restore saved progress (and the level last played) once on the client.
  useEffect(() => {
    const saved = readProgress()
    setProgress(saved)
    if (saved.level !== 0) setGame(startGame(saved.level, parseMaze(THESEUS_LEVELS[saved.level])))
    boardRef.current?.focus()
  }, [])

  const selectLevel = useCallback((level: number) => {
    setGame(startGame(level, parseMaze(THESEUS_LEVELS[level])))
    setNotice('')
    setProgress((current) => {
      const next = { ...current, level }
      writeProgress(next)
      return next
    })
    boardRef.current?.focus()
  }, [])

  const play = useCallback(
    (move: Move) => {
      if (game.outcome !== 'playing') return
      const result = takeTurn(maze, game.positions, move)
      if (!result) {
        setNotice('A wall blocks that way.')
        return
      }
      setNotice('')
      const moves = game.history.length + 1
      setGame({ ...game, positions: result.positions, history: [...game.history, game.positions], outcome: result.outcome })
      if (result.outcome === 'won') {
        setProgress((current) => {
          const key = String(game.level)
          if (current.best[key] !== undefined && current.best[key] <= moves) return current
          const next = { ...current, best: { ...current.best, [key]: moves } }
          writeProgress(next)
          return next
        })
      }
    },
    [game, maze],
  )

  const undo = useCallback(() => {
    if (game.history.length === 0) return
    setNotice('')
    setGame({ ...game, positions: game.history[game.history.length - 1], history: game.history.slice(0, -1), outcome: 'playing' })
  }, [game])

  const reset = useCallback(() => {
    setNotice('')
    setGame(startGame(game.level, maze))
  }, [game.level, maze])

  const hasNext = game.level < LEVEL_COUNT - 1

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.ctrlKey || event.metaKey || event.altKey) return
    const move = keyMoves[event.key]
    if (move) {
      event.preventDefault()
      play(move)
    } else if (event.key === ' ' && event.target === event.currentTarget) {
      event.preventDefault()
      play('wait')
    } else if (event.key === 'z' || event.key === 'Z' || event.key === 'Backspace') {
      event.preventDefault()
      undo()
    } else if (event.key === 'r' || event.key === 'R') {
      event.preventDefault()
      reset()
    } else if ((event.key === 'n' || event.key === 'N' || event.key === 'Enter') && game.outcome === 'won' && hasNext && event.target === event.currentTarget) {
      event.preventDefault()
      selectLevel(game.level + 1)
    }
  }

  // Run a button action, then hand focus back to the board so the keyboard keeps working.
  function act(action: () => void) {
    action()
    boardRef.current?.focus()
  }

  const moves = game.history.length
  const best = progress.best[String(game.level)]
  const statusText =
    game.outcome === 'won'
      ? `Escaped in ${moves} ${moves === 1 ? 'move' : 'moves'}!`
      : game.outcome === 'lost'
        ? 'The Minotaur caught you.'
        : `Level ${game.level + 1}. ${moves} ${moves === 1 ? 'move' : 'moves'}.`
  const boardLabel =
    `Maze, ${maze.width} columns by ${maze.height} rows. ` +
    `Theseus is in column ${game.positions.theseus.x + 1}, row ${game.positions.theseus.y + 1}` +
    `${game.outcome === 'won' ? ', at the exit' : ''}. ` +
    `The Minotaur is in column ${game.positions.minotaur.x + 1}, row ${game.positions.minotaur.y + 1}. ` +
    `The exit is on the ${exitSide(maze)} edge.`

  return (
    <section className="theseus-panel" aria-labelledby="theseus-title">
      <div className="theseus-heading">
        <div>
          <span className="eyebrow">JUST FOR FUN</span>
          <h2 id="theseus-title">Theseus &amp; the Minotaur</h2>
        </div>
        <div className="theseus-scores">
          <span className="theseus-score">Level {game.level + 1} of {LEVEL_COUNT} · {moves} {moves === 1 ? 'move' : 'moves'}</span>
          <span className="theseus-best">{best !== undefined ? `Best ${best}` : 'Not yet solved'}{par !== null ? ` · Shortest ${par}` : ''}</span>
        </div>
      </div>
      <p className="theseus-help" id="theseus-help">
        Lead Theseus to the exit. After every move the Minotaur takes two steps toward you, sideways first, then up or down. Use the arrow keys or W A S D to move, Space to wait, Z to undo and R to restart.
      </p>
      <div className="theseus-levels" role="group" aria-label="Levels">
        {THESEUS_LEVELS.map((_, index) => {
          const solved = progress.best[String(index)] !== undefined
          return (
            <button
              key={index}
              type="button"
              className={`theseus-level${index === game.level ? ' is-active' : ''}${solved ? ' is-solved' : ''}`}
              onClick={() => selectLevel(index)}
              aria-current={index === game.level ? 'true' : undefined}
              aria-label={`Level ${index + 1}${solved ? ', solved' : ''}`}
            >
              {solved ? <Check aria-hidden="true" /> : index + 1}
            </button>
          )
        })}
      </div>
      <div className="theseus-board" ref={boardRef} tabIndex={0} onKeyDown={handleKeyDown} aria-describedby="theseus-help">
        <MazeBoard key={game.level} maze={maze} positions={game.positions} outcome={game.outcome} label={boardLabel} />
      </div>
      <div className={`theseus-status is-${game.outcome}`} role="status" aria-live="polite">
        <span>{notice || statusText}</span>
        {game.outcome === 'won' && hasNext && (
          <button className="theseus-action" type="button" onClick={() => selectLevel(game.level + 1)}>
            Next level <ChevronRight aria-hidden="true" />
          </button>
        )}
        {game.outcome === 'won' && !hasNext && <span>You cleared every maze.</span>}
        {game.outcome === 'lost' && (
          <button className="theseus-action" type="button" onClick={() => act(undo)}>
            <Undo2 aria-hidden="true" /> Undo
          </button>
        )}
      </div>
      <div className="theseus-controls">
        <div className="theseus-dpad" role="group" aria-label="Move Theseus">
          {dPad.map(({ move, label, icon: Icon }) => (
            <button key={move} type="button" className={`theseus-dpad-${move}`} onClick={() => act(() => play(move))} aria-label={label} disabled={game.outcome !== 'playing'}>
              <Icon aria-hidden="true" />
            </button>
          ))}
          <button type="button" className="theseus-dpad-wait" onClick={() => act(() => play('wait'))} aria-label="Wait a turn" title="Wait a turn" disabled={game.outcome !== 'playing'}>
            <Hourglass aria-hidden="true" />
          </button>
        </div>
        <div className="theseus-actions">
          <button className="theseus-secondary" type="button" onClick={() => act(undo)} disabled={moves === 0}>
            <Undo2 aria-hidden="true" /> Undo
          </button>
          <button className="theseus-secondary" type="button" onClick={() => act(reset)} disabled={moves === 0}>
            <RotateCcw aria-hidden="true" /> Reset
          </button>
        </div>
      </div>
    </section>
  )
}
