'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Flag, Pause, Play, RotateCcw, Users } from 'lucide-react'
import {
  NO_INPUT,
  STEP,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  classify,
  createRace,
  formatGap,
  formatLap,
  lightsLit,
  positionOf,
  stepRace,
  type Classified,
  type Input,
  type Race,
  type RacePhase,
} from '@/lib/f1'
import { DEFAULT_DRIVER_ID, F1_ENTRIES, F1_SEASON, F1_TEAMS, findEntry, type F1Team } from '@/lib/f1-grid'
import { DEFAULT_RENDER_COLORS, drawRace, drawTrackLayer, type RenderColors } from '@/lib/f1-render'
import './f1-game.css'

const DRIVER_STORAGE_KEY = 'daylist:f1-driver'
const LAPS_STORAGE_KEY = 'daylist:f1-laps'
const BEST_STORAGE_KEY = 'daylist:f1-best-lap'
const LAP_OPTIONS = [3, 5, 8]
const DEFAULT_LAPS = 5
const FAST_FORWARD = 8 // sim steps per frame once the player has taken the flag
const HUD_EVERY = 6 // frames between HUD refreshes
const GAP_SPEED = 145 // rough average speed (world px per second) used to show gaps in seconds

const keyMap: Record<string, keyof Input> = {
  arrowup: 'throttle', w: 'throttle',
  arrowdown: 'brake', s: 'brake',
  arrowleft: 'left', a: 'left',
  arrowright: 'right', d: 'right',
}

type Row = { carIndex: number; code: string; color: string; accent: string; isPlayer: boolean; gap: string }

type Hud = {
  phase: RacePhase
  lights: number
  lap: number
  laps: number
  position: number
  lapTime: number
  lastLap: number | null
  bestLap: number | null
  rows: Row[]
  results: Classified[] | null
}

function readStored(key: string) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStored(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Storage can be unavailable; the choice just won't be remembered.
  }
}

function ordinal(n: number) {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`
}

function snapshot(race: Race, results: Classified[] | null): Hud {
  const player = race.cars[race.playerIndex]
  const leader = race.cars[race.order[0]]
  const rows = race.order.map((carIndex, i): Row => {
    const car = race.cars[carIndex]
    let gap = ''
    if (i === 0) gap = car.finished ? 'Winner' : 'Leader'
    else if (car.finished && car.finishTime !== null && leader.finishTime !== null) gap = formatGap(car.finishTime - leader.finishTime)
    else if (!car.finished) {
      const behind = leader.progress - car.progress
      gap = behind >= race.track.length ? `+${Math.floor(behind / race.track.length)} lap` : `+${(behind / GAP_SPEED).toFixed(1)}s`
    }
    return { carIndex, code: car.entry.driver.code, color: car.entry.team.color, accent: car.entry.team.accent, isPlayer: car.isPlayer, gap }
  })
  return {
    phase: race.phase,
    lights: lightsLit(race),
    lap: Math.min(race.laps, player.completed + 1),
    laps: race.laps,
    position: positionOf(race, race.playerIndex),
    lapTime: race.phase === 'countdown' ? 0 : player.finished ? (player.lapTimes[player.lapTimes.length - 1] ?? 0) : race.time - player.lapStart,
    lastLap: player.lapTimes.length ? player.lapTimes[player.lapTimes.length - 1] : null,
    bestLap: player.bestLap,
    rows,
    results,
  }
}

function CarIcon({ team }: { team: F1Team }) {
  return (
    <svg className="f1-car-icon" viewBox="0 0 40 20" aria-hidden="true" focusable="false">
      <rect x="5" y="1.5" width="9" height="4" rx="1" fill="#16181b" />
      <rect x="5" y="14.5" width="9" height="4" rx="1" fill="#16181b" />
      <rect x="25" y="2.5" width="7" height="3.6" rx="1" fill="#16181b" />
      <rect x="25" y="13.9" width="7" height="3.6" rx="1" fill="#16181b" />
      <rect x="1" y="3.5" width="4" height="13" rx="1" fill={team.accent} stroke="rgba(0,0,0,.35)" strokeWidth=".6" />
      <rect x="35" y="3.5" width="4" height="13" rx="1" fill={team.accent} stroke="rgba(0,0,0,.35)" strokeWidth=".6" />
      <path d="M4 7.5 L22 6 L36 8.6 L36 11.4 L22 14 L4 12.5 Z" fill={team.color} stroke="rgba(0,0,0,.4)" strokeWidth=".7" />
      <circle cx="16" cy="10" r="2.6" fill={team.accent} stroke="rgba(0,0,0,.3)" strokeWidth=".5" />
    </svg>
  )
}

export function F1Game() {
  const [stage, setStage] = useState<'select' | 'race'>('select')
  const [driverId, setDriverId] = useState(DEFAULT_DRIVER_ID)
  const [laps, setLaps] = useState(DEFAULT_LAPS)
  const [bestLap, setBestLap] = useState<number | null>(null)
  const [paused, setPaused] = useState(false)
  const [hud, setHud] = useState<Hud | null>(null)

  const raceRef = useRef<Race | null>(null)
  const pausedRef = useRef(false)
  const keysRef = useRef<Input>({ ...NO_INPUT })
  const touchRef = useRef<Input>({ ...NO_INPUT })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const layerRef = useRef<HTMLCanvasElement | null>(null)
  const colorsRef = useRef<RenderColors>(DEFAULT_RENDER_COLORS)
  const boardRef = useRef<HTMLDivElement>(null)
  const bestRef = useRef<number | null>(null)

  useEffect(() => {
    const savedDriver = readStored(DRIVER_STORAGE_KEY)
    if (savedDriver && findEntry(savedDriver)) setDriverId(savedDriver)
    const savedLaps = Number(readStored(LAPS_STORAGE_KEY))
    if (LAP_OPTIONS.includes(savedLaps)) setLaps(savedLaps)
    const savedBest = Number(readStored(BEST_STORAGE_KEY))
    if (Number.isFinite(savedBest) && savedBest > 0) {
      bestRef.current = savedBest
      setBestLap(savedBest)
    }
  }, [])

  const entry = findEntry(driverId) ?? F1_ENTRIES[0]

  const setPausedBoth = useCallback((value: boolean) => {
    pausedRef.current = value
    setPaused(value)
  }, [])

  const startRace = useCallback(() => {
    writeStored(DRIVER_STORAGE_KEY, driverId)
    writeStored(LAPS_STORAGE_KEY, String(laps))
    keysRef.current = { ...NO_INPUT }
    touchRef.current = { ...NO_INPUT }
    const race = createRace(driverId, laps)
    raceRef.current = race
    setPausedBoth(false)
    setHud(snapshot(race, null))
    setStage('race')
  }, [driverId, laps, setPausedBoth])

  // Draw loop and fixed-step simulation. The timer only exists on the race screen and is cleared on exit.
  useEffect(() => {
    if (stage !== 'race') return
    boardRef.current?.focus()

    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const ctx = context
    const styles = window.getComputedStyle(canvas)
    colorsRef.current = {
      ground: styles.getPropertyValue('--sage').trim() || DEFAULT_RENDER_COLORS.ground,
      asphalt: DEFAULT_RENDER_COLORS.asphalt,
      line: DEFAULT_RENDER_COLORS.line,
    }
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.round(WORLD_WIDTH * dpr)
    canvas.height = Math.round(WORLD_HEIGHT * dpr)

    const layer = document.createElement('canvas')
    layer.width = canvas.width
    layer.height = canvas.height
    const layerCtx = layer.getContext('2d')
    if (layerCtx && raceRef.current) {
      layerCtx.scale(dpr, dpr)
      drawTrackLayer(layerCtx, raceRef.current.track, colorsRef.current)
      layerRef.current = layer
    }

    let raf = 0
    let last = performance.now()
    let accumulator = 0
    let frame = 0
    let announced = false

    const tick = (now: number) => {
      const race = raceRef.current
      const elapsed = Math.min(0.1, (now - last) / 1000)
      last = now
      if (race) {
        if (!pausedRef.current) {
          accumulator += elapsed
          const fast = race.phase === 'cooldown' ? FAST_FORWARD : 1
          let steps = 0
          while (accumulator >= STEP && steps < 12) {
            const keys = keysRef.current
            const touch = touchRef.current
            const input: Input = {
              throttle: keys.throttle || touch.throttle,
              brake: keys.brake || touch.brake,
              left: keys.left || touch.left,
              right: keys.right || touch.right,
            }
            for (let k = 0; k < fast; k++) stepRace(race, input, STEP)
            accumulator -= STEP
            steps++
          }
          if (steps === 12) accumulator = 0
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        drawRace(ctx, race, layerRef.current, colorsRef.current, now)

        const finishedNow = race.phase === 'finished' && !announced
        if (finishedNow) announced = true
        if (frame++ % HUD_EVERY === 0 || finishedNow) {
          const next = snapshot(race, race.phase === 'finished' ? classify(race) : null)
          setHud(next)
          const best = race.cars[race.playerIndex].bestLap
          if (best !== null && (bestRef.current === null || best < bestRef.current)) {
            bestRef.current = best
            setBestLap(best)
            writeStored(BEST_STORAGE_KEY, String(best))
          }
        }
      }
      raf = window.requestAnimationFrame(tick)
    }
    raf = window.requestAnimationFrame(tick)

    const onVisibility = () => {
      if (document.hidden && raceRef.current && raceRef.current.phase !== 'finished') setPausedBoth(true)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [stage, setPausedBoth])

  function togglePause() {
    const race = raceRef.current
    if (!race || race.phase === 'finished') return
    setPausedBoth(!pausedRef.current)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const key = event.key.toLowerCase()
    const control = keyMap[key]
    if (control) {
      event.preventDefault()
      keysRef.current[control] = true
      if (pausedRef.current) setPausedBoth(false)
    } else if (key === 'p' || key === 'escape' || (key === ' ' && event.target === event.currentTarget)) {
      event.preventDefault()
      if (raceRef.current?.phase === 'finished') startRace()
      else togglePause()
    } else if (key === 'r') {
      event.preventDefault()
      startRace()
    }
  }

  function handleKeyUp(event: React.KeyboardEvent<HTMLDivElement>) {
    const control = keyMap[event.key.toLowerCase()]
    if (control) {
      event.preventDefault()
      keysRef.current[control] = false
    }
  }

  function press(control: keyof Input, down: boolean) {
    touchRef.current[control] = down
    if (down && pausedRef.current) setPausedBoth(false)
  }

  function touchProps(control: keyof Input, label: string) {
    return {
      'aria-label': label,
      onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
        event.preventDefault()
        event.currentTarget.setPointerCapture?.(event.pointerId)
        press(control, true)
      },
      onPointerUp: () => press(control, false),
      onPointerCancel: () => press(control, false),
      onLostPointerCapture: () => press(control, false),
    }
  }

  function leaveRace() {
    keysRef.current = { ...NO_INPUT }
    touchRef.current = { ...NO_INPUT }
    raceRef.current = null
    setPausedBoth(false)
    setStage('select')
  }

  const heading = (
    <div className="f1-heading">
      <div>
        <span className="eyebrow">JUST FOR FUN</span>
        <h2 id="f1-title">F1 Grand Prix</h2>
      </div>
      <div className="f1-scores">
        {stage === 'race' && hud ? (
          <span className="f1-score" aria-live="polite">
            {hud.phase === 'finished' || hud.phase === 'cooldown'
              ? `Chequered flag. You finished ${ordinal(hud.position)}.`
              : `P${hud.position} of ${F1_ENTRIES.length}, lap ${hud.lap} of ${hud.laps}`}
          </span>
        ) : (
          <span className="f1-score">{F1_SEASON} grid</span>
        )}
        <span className="f1-best">Best lap {formatLap(bestLap)}</span>
      </div>
    </div>
  )

  if (stage === 'select' || !hud) {
    return (
      <section className="f1-panel" aria-labelledby="f1-title">
        {heading}
        <p className="f1-help">
          Pick a driver from the {F1_SEASON} grid and race all {F1_ENTRIES.length - 1} other cars. You start 12th. Steer with the arrow keys or W A S D
          (up is throttle, down is brake), P or Space pauses, R restarts.
        </p>
        <div className="f1-teams" role="group" aria-label="Choose your driver">
          {F1_TEAMS.map((team) => (
            <div key={team.id} className="f1-team" style={{ '--team': team.color } as React.CSSProperties}>
              <div className="f1-team-head">
                <CarIcon team={team} />
                <span className="f1-team-name">{team.name}</span>
                <span className="f1-team-car">{team.carName}</span>
              </div>
              <div className="f1-team-drivers">
                {team.drivers.map((driver) => (
                  <button
                    key={driver.id}
                    type="button"
                    className={`f1-driver${driver.id === driverId ? ' is-selected' : ''}`}
                    aria-pressed={driver.id === driverId}
                    onClick={() => setDriverId(driver.id)}
                  >
                    <span className="f1-driver-number">{driver.number}</span>
                    <span className="f1-driver-name">{driver.name}</span>
                    <span className="f1-driver-meta">{driver.code} · {driver.country}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="f1-start-bar">
          <div className="f1-chosen" style={{ '--team': entry.team.color } as React.CSSProperties}>
            <CarIcon team={entry.team} />
            <span><strong>{entry.driver.name}</strong> · {entry.team.name} {entry.team.carName}</span>
          </div>
          <label className="f1-laps">
            <span>Laps</span>
            <select value={laps} onChange={(event) => setLaps(Number(event.target.value))}>
              {LAP_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <button className="f1-action" type="button" onClick={startRace}><Flag aria-hidden="true" /> Start race</button>
        </div>
      </section>
    )
  }

  const player = entry
  const results = hud.results
  const raceOver = hud.phase === 'finished'
  const flagged = hud.phase === 'cooldown' || raceOver
  const showGo = hud.phase === 'racing' && hud.lap === 1 && hud.lapTime < 1.2

  return (
    <section className="f1-panel" aria-labelledby="f1-title">
      {heading}
      <div className="f1-race">
        <div className="f1-stage">
          <div className="f1-board" ref={boardRef} tabIndex={0} onKeyDown={handleKeyDown} onKeyUp={handleKeyUp} onBlur={() => { keysRef.current = { ...NO_INPUT } }} aria-describedby="f1-race-help">
            <canvas
              ref={canvasRef}
              className="f1-canvas"
              width={WORLD_WIDTH}
              height={WORLD_HEIGHT}
              role="img"
              aria-label={`Race track. ${player.driver.name} is in position ${hud.position}, lap ${hud.lap} of ${hud.laps}.`}
            />
            {hud.phase === 'countdown' && (
              <div className="f1-lights" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((i) => <span key={i} className={i < hud.lights ? 'is-lit' : ''} />)}
              </div>
            )}
            {showGo && <div className="f1-go" aria-hidden="true">GO!</div>}
            {paused && !raceOver && (
              <div className="f1-overlay">
                <strong>Paused</strong>
                <span>Press any driving key or P to keep racing.</span>
                <button className="f1-action" type="button" onClick={togglePause}><Play aria-hidden="true" /> Resume</button>
              </div>
            )}
            {flagged && (
              <div className={`f1-overlay${raceOver ? '' : ' is-banner'}`}>
                <strong>{raceOver ? `${ordinal(hud.position)} place` : 'Chequered flag'}</strong>
                <span>{raceOver ? `${player.driver.name}, ${player.team.name}. Your best lap ${formatLap(hud.bestLap)}.` : 'Waiting for the rest of the field.'}</span>
                {raceOver && (
                  <div className="f1-overlay-actions">
                    <button className="f1-action" type="button" onClick={startRace}><RotateCcw aria-hidden="true" /> Race again</button>
                    <button className="f1-secondary" type="button" onClick={leaveRace}><Users aria-hidden="true" /> Change driver</button>
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="f1-help" id="f1-race-help">
            Up or W is throttle, down or S is brake, left and right steer. Stay on the asphalt: the grass is slow. P or Space pauses, R restarts.
          </p>
          <div className="f1-controls">
            <div className="f1-pedals" role="group" aria-label="Steering and pedals">
              <button type="button" className="f1-pad" {...touchProps('left', 'Steer left')}><ArrowLeft aria-hidden="true" /></button>
              <button type="button" className="f1-pad" {...touchProps('right', 'Steer right')}><ArrowRight aria-hidden="true" /></button>
              <button type="button" className="f1-pad f1-pad-text" {...touchProps('brake', 'Brake')}>Brake</button>
              <button type="button" className="f1-pad f1-pad-text f1-pad-gas" {...touchProps('throttle', 'Throttle')}>Gas</button>
            </div>
            <div className="f1-buttons">
              <button className="f1-secondary" type="button" onClick={togglePause} disabled={raceOver}>
                {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
                {paused ? 'Resume' : 'Pause'}
              </button>
              <button className="f1-secondary" type="button" onClick={startRace}><RotateCcw aria-hidden="true" /> Restart</button>
              <button className="f1-secondary" type="button" onClick={leaveRace}><Users aria-hidden="true" /> Driver</button>
            </div>
          </div>
        </div>

        <aside className="f1-side" aria-label={raceOver ? 'Final classification' : 'Race order'}>
          <dl className="f1-stats">
            <div><dt>Lap</dt><dd>{hud.lap}/{hud.laps}</dd></div>
            <div><dt>Time</dt><dd>{formatLap(hud.lapTime)}</dd></div>
            <div><dt>Last</dt><dd>{formatLap(hud.lastLap)}</dd></div>
            <div><dt>Best</dt><dd>{formatLap(hud.bestLap)}</dd></div>
          </dl>
          {raceOver && results ? (
            <ol className="f1-order is-final">
              {results.map((row) => (
                <li key={row.car.entry.driver.id} className={row.car.isPlayer ? 'is-player' : undefined} style={{ '--team': row.car.entry.team.color } as React.CSSProperties}>
                  <span className="f1-pos">{row.position}</span>
                  <span className="f1-chip" />
                  <span className="f1-code" title={row.car.entry.driver.name}>{row.car.entry.driver.code}</span>
                  <span className="f1-gap">
                    {row.finished ? (row.position === 1 ? formatLap(row.time) : row.gap !== null ? formatGap(row.gap) : '') : `+${row.lapsDown} lap`}
                    {row.fastest && <span className="f1-fastest" title="Fastest lap"> FL</span>}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <ol className="f1-order">
              {hud.rows.map((row, i) => (
                <li key={row.carIndex} className={row.isPlayer ? 'is-player' : undefined} style={{ '--team': row.color } as React.CSSProperties}>
                  <span className="f1-pos">{i + 1}</span>
                  <span className="f1-chip" />
                  <span className="f1-code">{row.code}</span>
                  <span className="f1-gap">{row.gap}</span>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </section>
  )
}
