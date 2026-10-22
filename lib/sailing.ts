import type { Point } from '@/lib/snake'

// Headings and wind directions are compass degrees: 0 = north (screen up), clockwise.
// World units are screen units at 1x zoom; the y axis points south.

export const BOAT_LENGTH = 30
export const NO_GO_ANGLE = 40 // degrees either side of the wind where the boat makes no way
export const MARK_RADIUS = 26
export const MIN_BOOM = 4
export const MAX_BOOM = 90

const KNOT = 4 // world units per second at one knot
const TURN_RATE = 62 // degrees per second at full rudder and speed
const RUDDER_RATE = 3.5 // rudder travel per second
const BOOM_RATE = 40 // degrees per second while trimming
const SPEED_PER_WIND = 0.8 // best speed in knots per knot of true wind
const ACCEL = 0.45 // per second; how quickly speed rises to its target
const DECEL = 0.65 // per second; drag is a bit stronger than acceleration
const MAX_HEEL = 32
export const WAKE_LIFE = 3.5
const WAKE_STEP = 0.05

export const START: Point = { x: 0, y: 260 }
// With the wind near north: a beat, a reach, a run, then a final beat.
export const COURSE: Point[] = [
  { x: 30, y: -330 },
  { x: 430, y: -120 },
  { x: 200, y: 230 },
  { x: -200, y: -260 },
]

export type SailingInput = { turn: number; sheet: number } // turn: -1 left, 1 right; sheet: -1 in, 1 out

export type WakePoint = Point & { age: number }

export type SailingState = {
  time: number
  pos: Point
  heading: number
  speed: number // knots
  rudder: number // -1..1
  boom: number // degrees off the centerline
  heel: number // degrees, positive to starboard
  tack: 1 | -1 // 1 when the wind comes over the starboard side
  windFrom: number
  windSpeed: number // knots
  twa: number // true wind angle, signed, positive = wind from starboard
  awa: number // apparent wind angle, same sign convention
  apparentSpeed: number
  optimalBoom: number
  trim: number // 0..1 sail efficiency
  next: number // index of the next mark
  finished: boolean
  wake: WakePoint[]
  phase: number
  wakeClock: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
export const rad = (deg: number) => (deg * Math.PI) / 180
export const normalize = (deg: number) => ((deg % 360) + 360) % 360
export const wrap180 = (deg: number) => normalize(deg + 180) - 180

// Piecewise linear lookup; `table` is sorted by x.
function lookup(table: [number, number][], x: number) {
  if (x <= table[0][0]) return table[0][1]
  for (let i = 1; i < table.length; i++) {
    const [x1, y1] = table[i]
    if (x <= x1) {
      const [x0, y0] = table[i - 1]
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)
    }
  }
  return table[table.length - 1][1]
}

// Share of full speed by true wind angle: nothing in the no-go zone, best on a broad reach, a bit slower dead downwind.
const POLAR: [number, number][] = [
  [0, 0], [NO_GO_ANGLE, 0], [48, 0.45], [60, 0.68], [80, 0.9], [105, 1], [125, 0.96], [145, 0.85], [165, 0.73], [180, 0.66],
]

// Best boom angle by apparent wind angle: close to centered upwind, fully out running.
const BOOM_CURVE: [number, number][] = [
  [0, MIN_BOOM], [20, MIN_BOOM], [30, 12], [60, 32], [90, 52], [120, 70], [150, 84], [180, MAX_BOOM],
]

export const polar = (twa: number) => lookup(POLAR, Math.abs(twa))
export const optimalBoom = (awa: number) => lookup(BOOM_CURVE, Math.abs(awa))

// A boom eased too far luffs and one sheeted too hard stalls; luffing costs a little more.
export function trimEfficiency(boom: number, optimal: number) {
  const error = boom - optimal
  const miss = Math.min(1, Math.abs(error) / (error > 0 ? 34 : 42))
  return 1 - 0.88 * miss * miss
}

// Slowly shifting wind: two overlapping swings plus a gust cycle, offset by a per-race phase.
export function windAt(time: number, phase: number) {
  return {
    from: normalize(18 * Math.sin(time / 21 + phase) + 8 * Math.sin(time / 8.3 + phase * 2.1)),
    speed: 10 + 2.2 * Math.sin(time / 6.7 + phase * 1.7) + 1.3 * Math.sin(time / 2.9 + phase * 0.6),
  }
}

export function bearing(from: Point, to: Point) {
  return normalize((Math.atan2(to.x - from.x, from.y - to.y) * 180) / Math.PI)
}

export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

function vector(deg: number, length: number): Point {
  return { x: Math.sin(rad(deg)) * length, y: -Math.cos(rad(deg)) * length }
}

export function createSailing(phase = Math.random() * Math.PI * 2): SailingState {
  const state: SailingState = {
    time: 0, pos: { ...START }, heading: 90, speed: 0, rudder: 0, boom: 45, heel: 0, tack: 1,
    windFrom: 0, windSpeed: 10, twa: 0, awa: 0, apparentSpeed: 10, optimalBoom: MIN_BOOM, trim: 1,
    next: 0, finished: false, wake: [], phase, wakeClock: 0,
  }
  stepSailing(state, { turn: 0, sheet: 0 }, 0) // fill in the derived wind values
  return state
}

// Advances the race by `dt` seconds. Mutates `s` in place because it runs every frame.
export function stepSailing(s: SailingState, input: SailingInput, dt: number) {
  s.time += dt
  const wind = windAt(s.time, s.phase)
  s.windFrom = wind.from
  s.windSpeed = wind.speed

  s.rudder += clamp(input.turn - s.rudder, -RUDDER_RATE * dt, RUDDER_RATE * dt)
  s.boom = clamp(s.boom + input.sheet * BOOM_RATE * dt, MIN_BOOM, MAX_BOOM)
  // A moving boat steers far better than one drifting head to wind.
  const authority = 0.2 + 0.8 * Math.min(1, s.speed / 5)
  s.heading = normalize(s.heading + s.rudder * TURN_RATE * authority * dt)

  // Apparent wind: the wind we feel is the true wind minus our own motion.
  const wm = vector(wind.from + 180, wind.speed)
  const bm = vector(s.heading, s.speed)
  const ax = wm.x - bm.x
  const ay = wm.y - bm.y
  s.apparentSpeed = Math.hypot(ax, ay)
  s.twa = wrap180(wind.from - s.heading)
  s.awa = wrap180((Math.atan2(-ax, ay) * 180) / Math.PI - s.heading)
  if (Math.abs(s.awa) > 5) s.tack = s.awa > 0 ? 1 : -1

  s.optimalBoom = optimalBoom(s.awa)
  s.trim = trimEfficiency(s.boom, s.optimalBoom)

  // An eased sail spills wind, so it heels less; heeling hard costs speed.
  const spill = clamp((s.boom - s.optimalBoom) / 45, 0, 1)
  const force = Math.min(1.4, (s.apparentSpeed / 15) ** 2) * Math.sin(rad(Math.abs(s.awa)))
  const heelTarget = -s.tack * MAX_HEEL * Math.min(1, force) * (1 - 0.75 * spill)
  s.heel += (heelTarget - s.heel) * (1 - Math.exp(-2 * dt))
  const heelDrag = Math.max(0, Math.abs(s.heel) - 18) * 0.012

  const target = polar(s.twa) * wind.speed * SPEED_PER_WIND * s.trim * (1 - heelDrag) * (1 - 0.15 * Math.abs(s.rudder))
  s.speed += (target - s.speed) * (1 - Math.exp(-(target > s.speed ? ACCEL : DECEL) * dt))

  const move = vector(s.heading, s.speed * KNOT * dt)
  s.pos.x += move.x
  s.pos.y += move.y

  s.wakeClock += dt
  for (const point of s.wake) point.age += dt
  while (s.wake.length > 0 && s.wake[0].age > WAKE_LIFE) s.wake.shift()
  if (s.speed > 0.3 && s.wakeClock >= WAKE_STEP) {
    s.wakeClock = 0
    const stern = vector(s.heading, -BOAT_LENGTH / 2)
    s.wake.push({ x: s.pos.x + stern.x, y: s.pos.y + stern.y, age: 0 })
  }

  if (!s.finished && distance(s.pos, COURSE[s.next]) < MARK_RADIUS) {
    s.next++
    if (s.next >= COURSE.length) s.finished = true
  }
}

export function formatTime(seconds: number) {
  const tenths = Math.floor(seconds * 10)
  const minutes = Math.floor(tenths / 600)
  const rest = (tenths % 600) / 10
  return `${minutes}:${rest.toFixed(1).padStart(4, '0')}`
}
