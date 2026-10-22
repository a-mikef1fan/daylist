'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Pause, Play, RotateCcw } from 'lucide-react'
import {
  BOAT_LENGTH,
  COURSE,
  MARK_RADIUS,
  MAX_BOOM,
  NO_GO_ANGLE,
  START,
  WAKE_LIFE,
  bearing,
  createSailing,
  distance,
  formatTime,
  rad,
  stepSailing,
  type SailingState,
} from '@/lib/sailing'
import './sailing-game.css'

type Status = 'ready' | 'running' | 'paused' | 'finished'
type Control = 'left' | 'right' | 'in' | 'out'

const BEST_STORAGE_KEY = 'daylist:sailing-best'
const VIEW_WIDTH = 560 // world units visible across a wide canvas
const MIN_SCALE = 0.85 // keeps the boat legible on narrow screens
const TAU = Math.PI * 2

const keyControls: Record<string, Control> = {
  arrowleft: 'left', arrowright: 'right', arrowup: 'in', arrowdown: 'out',
  a: 'left', d: 'right', w: 'in', s: 'out',
}

const holdButtons: { control: Control; label: string; icon: typeof ArrowUp }[] = [
  { control: 'left', label: 'Turn left', icon: ArrowLeft },
  { control: 'right', label: 'Turn right', icon: ArrowRight },
  { control: 'in', label: 'Sheet in', icon: ArrowUp },
  { control: 'out', label: 'Ease sail', icon: ArrowDown },
]

type View = { width: number; height: number; dpr: number }
type Palette = {
  dark: boolean; water: string; ripple: string; ink: string; muted: string
  panel: string; border: string; accent: string; good: string; sail: string
}

export function SailingGame() {
  const [status, setStatus] = useState<Status>('ready')
  const [best, setBest] = useState<number | null>(null)
  const [result, setResult] = useState(0)
  const [marks, setMarks] = useState(0)
  const gameRef = useRef<SailingState | null>(null)
  const heldRef = useRef(new Set<Control>())
  const viewRef = useRef<View>({ width: 0, height: 0, dpr: 1 })
  const paletteRef = useRef<{ at: number; value: Palette } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const boardRef = useRef<HTMLDivElement>(null)

  const getGame = useCallback(() => (gameRef.current ??= createSailing()), [])

  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem(BEST_STORAGE_KEY))
      if (Number.isFinite(saved) && saved > 0) setBest(saved)
    } catch {
      // Storage can be unavailable; the best time just won't persist.
    }
    boardRef.current?.focus()
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context || viewRef.current.width === 0) return
    // Theme colours come from the page's CSS variables; re-read them twice a second so a theme switch is picked up.
    const now = performance.now()
    if (!paletteRef.current || now - paletteRef.current.at > 500) {
      paletteRef.current = { at: now, value: readPalette(canvas) }
    }
    drawScene(context, getGame(), viewRef.current, paletteRef.current.value)
  }, [getGame])

  // Keep the backing store sharp on high-DPI screens and when the board is resized.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 3)
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      viewRef.current = { width, height, dpr }
      paletteRef.current = null
      draw()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    window.addEventListener('resize', resize)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', resize)
    }
  }, [draw])

  const finish = useCallback((time: number) => {
    setResult(time)
    setStatus('finished')
    setBest((current) => {
      if (current !== null && time >= current) return current
      try {
        window.localStorage.setItem(BEST_STORAGE_KEY, String(time))
      } catch {
        // Ignore storage failures.
      }
      return time
    })
  }, [])

  // The frame loop only exists while running, and is cancelled on pause, finish, or unmount.
  useEffect(() => {
    if (status !== 'running') {
      draw()
      return
    }
    const held = heldRef.current
    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const game = getGame()
      const before = game.next
      stepSailing(game, {
        turn: Number(held.has('right')) - Number(held.has('left')),
        sheet: Number(held.has('out')) - Number(held.has('in')),
      }, dt)
      if (game.next !== before) setMarks(game.next)
      draw()
      if (game.finished) finish(game.time)
      else frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [status, draw, finish, getGame])

  // Hidden tabs shouldn't keep racing.
  useEffect(() => {
    const onHide = () => {
      if (document.hidden) setStatus((current) => (current === 'running' ? 'paused' : current))
    }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [])

  function restart() {
    gameRef.current = createSailing()
    heldRef.current.clear()
    setMarks(0)
    setStatus('running')
    boardRef.current?.focus()
  }

  function press(control: Control, down: boolean) {
    if (!down) {
      heldRef.current.delete(control)
      return
    }
    heldRef.current.add(control)
    if (status === 'ready' || status === 'paused') setStatus('running')
  }

  function togglePause() {
    if (status === 'running') setStatus('paused')
    else if (status === 'paused') setStatus('running')
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const key = event.key.toLowerCase()
    const control = keyControls[key]
    if (control) {
      event.preventDefault()
      press(control, true)
    } else if (key === 'p' || (key === ' ' && event.target === event.currentTarget)) {
      event.preventDefault()
      if (status === 'finished') restart()
      else if (status === 'ready') setStatus('running')
      else togglePause()
    } else if (key === 'r') {
      event.preventDefault()
      restart()
    }
  }

  function handleKeyUp(event: React.KeyboardEvent<HTMLDivElement>) {
    const control = keyControls[event.key.toLowerCase()]
    if (control) press(control, false)
  }

  // Leaving the game (not just moving between its own buttons) lets go of the keys and pauses.
  function handleBlur(event: React.FocusEvent<HTMLElement>) {
    if (event.currentTarget.contains(event.relatedTarget)) return
    heldRef.current.clear()
    setStatus((current) => (current === 'running' ? 'paused' : current))
  }

  const statusText = status === 'finished' ? `Finished in ${formatTime(result)}.` : `Mark ${Math.min(marks + 1, COURSE.length)} of ${COURSE.length}`

  return (
    <section className="sailing-panel" aria-labelledby="sailing-title" onBlur={handleBlur}>
      <div className="sailing-heading">
        <div>
          <span className="eyebrow">JUST FOR FUN</span>
          <h2 id="sailing-title">Sailing</h2>
        </div>
        <div className="sailing-scores">
          <span className="sailing-status" aria-live="polite">{statusText}</span>
          <span className="sailing-best">Best {best === null ? '–' : formatTime(best)}</span>
        </div>
      </div>
      <p className="sailing-help" id="sailing-help">
        Sail around marks 1 to {COURSE.length} in order. You can’t sail straight into the wind, so zigzag to beat upwind.
        Steer with Left and Right or A and D, trim the sail with Up and Down or W and S (keep the marker in the green),
        Space or P to pause, R to restart.
      </p>
      <div className="sailing-board" ref={boardRef} tabIndex={0} onKeyDown={handleKeyDown} onKeyUp={handleKeyUp} aria-describedby="sailing-help">
        <canvas ref={canvasRef} className="sailing-canvas" role="img" aria-label={`Sailing course seen from above. ${statusText}`} />
        {status !== 'running' && (
          <div className="sailing-overlay">
            <strong>{status === 'finished' ? 'Race finished' : status === 'paused' ? 'Paused' : 'Ready to race?'}</strong>
            <span>
              {status === 'finished'
                ? `Your time was ${formatTime(result)}.${best === result ? ' A new best!' : ''}`
                : status === 'paused' ? 'Press Space or P to keep going.' : 'Press an arrow key to cast off.'}
            </span>
            {status === 'finished' ? (
              <button className="sailing-action" type="button" onClick={restart}><RotateCcw aria-hidden="true" /> Race again</button>
            ) : (
              <button className="sailing-action" type="button" onClick={() => { setStatus('running'); boardRef.current?.focus() }}>
                <Play aria-hidden="true" /> {status === 'paused' ? 'Resume' : 'Start'}
              </button>
            )}
          </div>
        )}
      </div>
      <div className="sailing-controls">
        <div className="sailing-hold-group" role="group" aria-label="Steering and sail trim">
          {holdButtons.map(({ control, label, icon: Icon }) => (
            <button
              key={control}
              type="button"
              className="sailing-hold"
              aria-label={label}
              title={label}
              onMouseDown={(event) => event.preventDefault()}
              onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); press(control, true) }}
              onPointerUp={() => press(control, false)}
              onPointerCancel={() => press(control, false)}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="sailing-actions">
          <button className="sailing-pause" type="button" onClick={togglePause} disabled={status !== 'running' && status !== 'paused'}>
            {status === 'paused' ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
            {status === 'paused' ? 'Resume' : 'Pause'}
          </button>
          <button className="sailing-pause" type="button" onClick={restart}><RotateCcw aria-hidden="true" /> Restart</button>
        </div>
      </div>
    </section>
  )
}

let probe: CanvasRenderingContext2D | null = null

// Whether a CSS colour is dark, found by painting it and reading the pixel back.
function isDark(color: string) {
  probe ??= Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true })
  if (!probe) return false
  probe.fillStyle = color
  probe.fillRect(0, 0, 1, 1)
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data
  return (r * 299 + g * 587 + b * 114) / 1000 < 128
}

function readPalette(canvas: HTMLCanvasElement): Palette {
  const styles = window.getComputedStyle(canvas)
  const color = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback
  const dark = isDark(color('--background', '#fbfbf7'))
  return {
    dark,
    water: dark ? '#0e2c38' : '#bfe0e6',
    ripple: dark ? '#7fc4d4' : '#ffffff',
    ink: color('--foreground', '#1f2d25'),
    muted: color('--muted-foreground', '#667a6e'),
    panel: color('--card', '#ffffff'),
    border: color('--border', '#e3e6dc'),
    accent: color('--coral', '#d9774f'),
    good: color('--primary', '#3d6b52'),
    sail: dark ? '#f1ecdc' : '#ffffff',
  }
}

const font = (size: number, weight = 600) => `${weight} ${size}px system-ui, -apple-system, 'Segoe UI', sans-serif`

function hash(x: number, y: number, k: number) {
  const n = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453
  return n - Math.floor(n)
}

function drawScene(ctx: CanvasRenderingContext2D, g: SailingState, view: View, pal: Palette) {
  const { width, height, dpr } = view
  const scale = Math.max(width / VIEW_WIDTH, MIN_SCALE)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = pal.water
  ctx.fillRect(0, 0, width, height)

  ctx.save()
  ctx.translate(width / 2, height / 2)
  ctx.scale(scale, scale)
  ctx.translate(-g.pos.x, -g.pos.y)
  drawRipples(ctx, g, pal, width / scale, height / scale)
  drawCourse(ctx, g, pal)
  drawWake(ctx, g, pal)
  drawBoat(ctx, g, pal)
  ctx.restore()

  drawMarkPointer(ctx, g, view, pal, scale)
  drawHud(ctx, g, view, pal)
}

// Wave crests sit across the wind and drift downwind, fading in and out as they go.
function drawRipples(ctx: CanvasRenderingContext2D, g: SailingState, pal: Palette, viewW: number, viewH: number) {
  const cell = 70
  const to = rad(g.windFrom + 180)
  const dx = Math.sin(to)
  const dy = -Math.cos(to)
  ctx.strokeStyle = pal.ripple
  ctx.lineWidth = 1.4
  ctx.lineCap = 'round'
  const cx0 = Math.floor((g.pos.x - viewW / 2 - 50) / cell)
  const cx1 = Math.ceil((g.pos.x + viewW / 2 + 50) / cell)
  const cy0 = Math.floor((g.pos.y - viewH / 2 - 50) / cell)
  const cy1 = Math.ceil((g.pos.y + viewH / 2 + 50) / cell)
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let k = 0; k < 2; k++) {
        const phase = (g.time * 0.12 + hash(cy, cx, k + 3)) % 1
        const px = (cx + hash(cx, cy, k + 1)) * cell + dx * phase * 45
        const py = (cy + hash(cx, cy, k + 2)) * cell + dy * phase * 45
        const half = 8 + hash(cx, cy, k) * 8
        ctx.globalAlpha = Math.sin(phase * Math.PI) * (pal.dark ? 0.32 : 0.55)
        ctx.beginPath()
        ctx.moveTo(px + dy * half, py - dx * half)
        ctx.quadraticCurveTo(px + dx * 3, py + dy * 3, px - dy * half, py + dx * half)
        ctx.stroke()
      }
    }
  }
  ctx.globalAlpha = 1
}

function drawCourse(ctx: CanvasRenderingContext2D, g: SailingState, pal: Palette) {
  ctx.save()
  ctx.strokeStyle = pal.ink
  ctx.globalAlpha = 0.25
  ctx.lineWidth = 1.5
  ctx.setLineDash([6, 8])
  ctx.beginPath()
  ctx.moveTo(START.x, START.y)
  COURSE.forEach((mark) => ctx.lineTo(mark.x, mark.y))
  ctx.stroke()
  ctx.restore()

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = font(12, 700)
  COURSE.forEach((mark, index) => {
    const done = index < g.next
    const isNext = index === g.next && !g.finished
    if (isNext) {
      ctx.save()
      ctx.strokeStyle = pal.accent
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 5])
      ctx.beginPath()
      ctx.arc(mark.x, mark.y, MARK_RADIUS * (1 + 0.08 * Math.sin(g.time * 4)), 0, TAU)
      ctx.stroke()
      ctx.restore()
    }
    ctx.globalAlpha = done ? 0.4 : 1
    ctx.fillStyle = done ? pal.good : pal.accent
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(mark.x, mark.y, 11, 0, TAU)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#ffffff'
    ctx.fillText(String(index + 1), mark.x, mark.y + 0.5)
    ctx.globalAlpha = 1
  })
}

function drawWake(ctx: CanvasRenderingContext2D, g: SailingState, pal: Palette) {
  ctx.fillStyle = pal.dark ? '#cfeaf0' : '#ffffff'
  for (const point of g.wake) {
    const life = 1 - point.age / WAKE_LIFE
    ctx.globalAlpha = life * 0.5
    ctx.beginPath()
    ctx.arc(point.x, point.y, 1.2 + point.age * 1.6, 0, TAU)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

function drawBoat(ctx: CanvasRenderingContext2D, g: SailingState, pal: Palette) {
  const half = BOAT_LENGTH / 2
  ctx.save()
  ctx.translate(g.pos.x, g.pos.y)
  ctx.rotate(rad(g.heading))
  // Heeling narrows the hull seen from above and shifts it toward the low side.
  ctx.translate(Math.sin(rad(g.heel)) * 3, 0)
  ctx.scale(Math.cos(rad(g.heel)), 1)

  ctx.lineJoin = 'round'
  ctx.lineWidth = 1.6
  ctx.strokeStyle = pal.ink
  ctx.fillStyle = pal.good
  ctx.beginPath()
  ctx.moveTo(0, -half)
  ctx.bezierCurveTo(9, -half * 0.4, 8, half * 0.6, 4.5, half)
  ctx.lineTo(-4.5, half)
  ctx.bezierCurveTo(-8, half * 0.6, -9, -half * 0.4, 0, -half)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // Rudder.
  ctx.save()
  ctx.translate(0, half)
  ctx.rotate(rad(-g.rudder * 30))
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(0, 7)
  ctx.stroke()
  ctx.restore()

  // Boom swings out to leeward; an over-eased sail flutters.
  const luffing = g.boom - g.optimalBoom > 10 && g.speed > 0.2
  const boom = rad(g.boom + (luffing ? Math.sin(g.time * 28) * 3 : 0))
  const mastY = -half * 0.2
  const length = 19
  const sideways = -g.tack * Math.sin(boom) * length
  const aft = Math.cos(boom) * length
  const endY = mastY + aft
  ctx.fillStyle = pal.sail
  ctx.globalAlpha = 0.95
  ctx.beginPath()
  ctx.moveTo(0, mastY)
  ctx.quadraticCurveTo(sideways / 2 - g.tack * 7, mastY + aft / 2, sideways, endY)
  ctx.closePath()
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.lineWidth = 1.4
  ctx.stroke()
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, mastY)
  ctx.lineTo(sideways, endY)
  ctx.stroke()
  ctx.fillStyle = pal.ink
  ctx.beginPath()
  ctx.arc(0, mastY, 2, 0, TAU)
  ctx.fill()
  ctx.restore()
}

// An arrow at the screen edge pointing to the next mark when it is out of view.
function drawMarkPointer(ctx: CanvasRenderingContext2D, g: SailingState, view: View, pal: Palette, scale: number) {
  if (g.finished) return
  const mark = COURSE[g.next]
  const dx = (mark.x - g.pos.x) * scale
  const dy = (mark.y - g.pos.y) * scale
  // Keep the arrow clear of the HUD rows along the top and bottom edges.
  const hud = Math.min(1, view.width / 520)
  const top = 56 * hud
  const bottom = view.height - 76 * hud
  const cx = view.width / 2
  const cy = view.height / 2
  const limitX = cx - 20
  const limitUp = cy - top
  const limitDown = bottom - cy
  const limitY = dy < 0 ? limitUp : limitDown
  if (Math.abs(dx) <= limitX && Math.abs(dy) <= limitY) return
  const t = Math.min(limitX / Math.abs(dx), limitY / Math.abs(dy))
  ctx.save()
  ctx.translate(cx + dx * t, cy + dy * t)
  ctx.rotate(Math.atan2(dx, -dy))
  ctx.fillStyle = pal.accent
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(0, -11)
  ctx.lineTo(9, 7)
  ctx.lineTo(0, 3)
  ctx.lineTo(-9, 7)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

function drawHud(ctx: CanvasRenderingContext2D, g: SailingState, view: View, pal: Palette) {
  const { width, height } = view
  const u = Math.min(1, width / 520) // shrink the HUD on narrow boards
  const text = (value: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'left', weight = 600) => {
    ctx.font = font(size, weight)
    ctx.fillStyle = color
    ctx.textAlign = align
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(value, x, y)
  }
  const panel = (x: number, y: number, w: number, h: number) => {
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, 10)
    ctx.globalAlpha = 0.88
    ctx.fillStyle = pal.panel
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.lineWidth = 1
    ctx.strokeStyle = pal.border
    ctx.stroke()
  }
  const anchor = (x: number, y: number, draw: () => void) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(u, u)
    draw()
    ctx.restore()
  }

  // Speed and heading.
  anchor(0, 0, () => {
    panel(10, 10, 118, 64)
    text('SPEED', 20, 25, 9, pal.muted)
    text(g.speed.toFixed(1), 20, 50, 22, pal.ink, 'left', 700)
    text('kn', 20 + ctx.measureText(g.speed.toFixed(1)).width + 4, 50, 11, pal.muted)
    text(`HDG ${String(Math.round(g.heading) % 360).padStart(3, '0')}°`, 20, 66, 10, pal.muted)
  })

  // Timer, and a warning while pointing into the no-go zone.
  anchor(width / 2, 0, () => {
    panel(-50, 10, 100, 32)
    text(formatTime(g.time), 0, 32, 18, pal.ink, 'center', 700)
    if (Math.abs(g.twa) < NO_GO_ANGLE && !g.finished) {
      ctx.beginPath()
      ctx.roundRect(-36, 48, 72, 20, 10)
      ctx.fillStyle = pal.accent
      ctx.fill()
      text('In irons', 0, 62, 11, '#ffffff', 'center', 700)
    }
  })

  // Compass with the wind arrow, the no-go wedge and the boat's heading.
  anchor(width, 0, () => {
    panel(-94, 10, 84, 108)
    const cx = -52
    const cy = 54
    const r = 32
    const at = (deg: number, radius: number) => ({ x: cx + Math.sin(rad(deg)) * radius, y: cy - Math.cos(rad(deg)) * radius })
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, TAU)
    ctx.strokeStyle = pal.border
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, r, rad(g.windFrom - NO_GO_ANGLE - 90), rad(g.windFrom + NO_GO_ANGLE - 90))
    ctx.closePath()
    ctx.globalAlpha = 0.28
    ctx.fillStyle = pal.accent
    ctx.fill()
    ctx.globalAlpha = 1
    ;(['N', 'E', 'S', 'W'] as const).forEach((label, i) => {
      const p = at(i * 90, r - 7)
      text(label, p.x, p.y + 3, 8, label === 'N' ? pal.accent : pal.muted, 'center', 700)
    })
    // Wind arrow points the way the wind blows, from its source on the rim toward the middle.
    const tail = at(g.windFrom, r - 2)
    const tip = at(g.windFrom + 180, r * 0.15)
    ctx.strokeStyle = pal.ink
    ctx.fillStyle = pal.ink
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(tail.x, tail.y)
    ctx.lineTo(tip.x, tip.y)
    ctx.stroke()
    ctx.save()
    ctx.translate(tip.x, tip.y)
    ctx.rotate(rad(g.windFrom + 180))
    ctx.beginPath()
    ctx.moveTo(0, -5)
    ctx.lineTo(4.5, 3)
    ctx.lineTo(-4.5, 3)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
    // Boat marker.
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(rad(g.heading))
    ctx.fillStyle = pal.good
    ctx.beginPath()
    ctx.moveTo(0, -9)
    ctx.lineTo(4.5, 6)
    ctx.lineTo(-4.5, 6)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
    text(`Wind ${Math.round(g.windSpeed)} kn`, -52, 108, 10, pal.ink, 'center')
  })

  // Sail trim gauge and heel indicator.
  anchor(0, height, () => {
    const x = 10
    const y = -66
    panel(x, y, 172, 56)
    const err = g.boom - g.optimalBoom
    const hint = Math.abs(err) < 9 ? 'Good trim' : err > 0 ? 'Sheet in' : 'Ease sail'
    text(`SAIL ${Math.round(g.boom)}°`, x + 10, y + 17, 9, pal.muted)
    text(hint, x + 104, y + 17, 10, Math.abs(err) < 9 ? pal.good : pal.accent, 'right', 700)
    const gx = x + 10
    const gw = 94
    const px = (deg: number) => gx + (deg / MAX_BOOM) * gw
    ctx.lineCap = 'round'
    ctx.lineWidth = 4
    ctx.strokeStyle = pal.border
    ctx.beginPath()
    ctx.moveTo(gx, y + 34)
    ctx.lineTo(gx + gw, y + 34)
    ctx.stroke()
    ctx.strokeStyle = pal.good
    ctx.globalAlpha = 0.55
    ctx.beginPath()
    ctx.moveTo(px(Math.max(0, g.optimalBoom - 8)), y + 34)
    ctx.lineTo(px(Math.min(MAX_BOOM, g.optimalBoom + 8)), y + 34)
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.fillStyle = pal.ink
    ctx.beginPath()
    ctx.arc(px(g.boom), y + 34, 4.5, 0, TAU)
    ctx.fill()
    text('0°', gx, y + 50, 8, pal.muted)
    text('90°', gx + gw, y + 50, 8, pal.muted, 'right')

    ctx.strokeStyle = pal.border
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x + 118, y + 10)
    ctx.lineTo(x + 118, y + 46)
    ctx.stroke()
    const hx = x + 145
    text('HEEL', hx, y + 17, 9, pal.muted, 'center')
    ctx.save()
    ctx.translate(hx, y + 38)
    ctx.rotate(rad(g.heel))
    ctx.fillStyle = pal.ink
    ctx.strokeStyle = pal.ink
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(0, 0, 8, 0, Math.PI)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(0, -17)
    ctx.stroke()
    ctx.restore()
    text(`${Math.round(Math.abs(g.heel))}°`, hx + 17, y + 46, 9, pal.muted, 'left')
  })

  // Next mark with a bearing arrow.
  anchor(width, height, () => {
    const x = -172
    const y = -66
    panel(x, y, 162, 56)
    if (g.finished) {
      text('Course complete', x + 81, y + 33, 12, pal.ink, 'center', 700)
      return
    }
    const mark = COURSE[g.next]
    const toMark = bearing(g.pos, mark)
    ctx.save()
    ctx.translate(x + 30, y + 28)
    ctx.beginPath()
    ctx.arc(0, 0, 20, 0, TAU)
    ctx.strokeStyle = pal.border
    ctx.stroke()
    ctx.rotate(rad(toMark))
    ctx.fillStyle = pal.accent
    ctx.beginPath()
    ctx.moveTo(0, -15)
    ctx.lineTo(8, 9)
    ctx.lineTo(0, 4)
    ctx.lineTo(-8, 9)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
    text(`NEXT MARK ${g.next + 1}`, x + 60, y + 19, 9, pal.muted)
    text(`${Math.round(distance(g.pos, mark))} m`, x + 60, y + 40, 17, pal.ink, 'left', 700)
    text(`BRG ${String(Math.round(toMark) % 360).padStart(3, '0')}°`, x + 60, y + 52, 9, pal.muted)
  })
}
