import { F1_ENTRIES, findEntry, type GridEntry } from '@/lib/f1-grid'
import type { Point } from '@/lib/snake'

// Arcade top-down F1 race. Everything here is plain data and pure-ish functions (the race is mutated in place for
// speed). The canvas and keyboard handling live in components/f1-game.tsx.

export const WORLD_WIDTH = 960
export const WORLD_HEIGHT = 600

export const STEP = 1 / 60 // fixed simulation step in seconds

const VTOP = 190 // top speed, world px per second
const ACCEL = 150
const BRAKE = 320
const AI_BRAKE = 210
const COAST = 38
const REVERSE_MAX = 45
const CAR_RADIUS = 6.5
const TRACK_SAMPLES = 720
const HALF_WIDTH = 30
const WALL_DISTANCE = HALF_WIDTH + 26
const COUNTDOWN_SECONDS = 3.5
const COUNTDOWN_LIGHTS = 5
const PLAYER_GRID_SLOT = 11 // the player starts P12, so there is something to chase
const SETTLE_LIMIT = 120 // seconds after the player finishes before unfinished cars are classified by distance

// ---------------------------------------------------------------- track

export type Track = {
  count: number
  length: number
  spacing: number
  halfWidth: number
  wallDistance: number
  startIndex: number
  points: Point[]
  heading: number[]
  nx: number[]
  ny: number[]
  speedProfile: number[] // fastest safe speed at each sample, with braking distance baked in
}

// Control points of a closed circuit, clockwise on screen. The start line sits on the long bottom straight.
const CONTROL_POINTS: Point[] = [
  { x: 180, y: 500 },
  { x: 380, y: 515 },
  { x: 600, y: 515 },
  { x: 800, y: 500 },
  { x: 890, y: 430 },
  { x: 860, y: 340 },
  { x: 730, y: 290 },
  { x: 760, y: 200 },
  { x: 860, y: 120 },
  { x: 760, y: 55 },
  { x: 580, y: 80 },
  { x: 500, y: 170 },
  { x: 400, y: 230 },
  { x: 300, y: 120 },
  { x: 150, y: 80 },
  { x: 70, y: 170 },
  { x: 120, y: 270 },
  { x: 275, y: 305 },
  { x: 125, y: 400 },
]

const START_ANCHOR: Point = { x: 720, y: 505 }

export function turnRate(speed: number) {
  const f = Math.min(1, Math.abs(speed) / VTOP)
  return 3.3 - 1.1 * f // rad/s: tighter at low speed
}

function catmullRom(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const t2 = t * t
  const t3 = t2 * t
  const f = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
  return { x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) }
}

export function buildTrack(controls: Point[] = CONTROL_POINTS, count: number = TRACK_SAMPLES): Track {
  const dense: Point[] = []
  const n = controls.length
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 40; k++) {
      dense.push(catmullRom(controls[(i + n - 1) % n], controls[i], controls[(i + 1) % n], controls[(i + 2) % n], k / 40))
    }
  }
  // Resample to evenly spaced points so an index step is a fixed distance.
  const cumulative = [0]
  for (let i = 1; i <= dense.length; i++) {
    const a = dense[i - 1]
    const b = dense[i % dense.length]
    cumulative.push(cumulative[i - 1] + Math.hypot(b.x - a.x, b.y - a.y))
  }
  const length = cumulative[cumulative.length - 1]
  const spacing = length / count
  const points: Point[] = []
  let seg = 0
  for (let i = 0; i < count; i++) {
    const target = i * spacing
    while (cumulative[seg + 1] < target) seg++
    const a = dense[seg]
    const b = dense[(seg + 1) % dense.length]
    const span = cumulative[seg + 1] - cumulative[seg] || 1
    const u = (target - cumulative[seg]) / span
    points.push({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u })
  }

  const heading: number[] = []
  const nx: number[] = []
  const ny: number[] = []
  for (let i = 0; i < count; i++) {
    const prev = points[(i + count - 1) % count]
    const next = points[(i + 1) % count]
    const h = Math.atan2(next.y - prev.y, next.x - prev.x)
    heading.push(h)
    nx.push(-Math.sin(h))
    ny.push(Math.cos(h))
  }

  // Corner speed: the fastest speed whose required turn rate stays inside what a car can do.
  const window = 7
  const speedProfile: number[] = []
  for (let i = 0; i < count; i++) {
    const turn = Math.abs(angleDiff(heading[(i + window) % count], heading[(i + count - window) % count]))
    const curvature = turn / (2 * window * spacing)
    let v = VTOP
    while (v > 40 && v * curvature > 0.78 * turnRate(v)) v -= 2
    speedProfile.push(v)
  }
  // Braking: a corner limits the approach to it. Two passes around the loop settle the wrap-around.
  for (let pass = 0; pass < 2; pass++) {
    for (let i = count - 1; i >= 0; i--) {
      const ahead = speedProfile[(i + 1) % count]
      speedProfile[i] = Math.min(speedProfile[i], Math.sqrt(ahead * ahead + 2 * AI_BRAKE * 0.8 * spacing))
    }
  }

  let startIndex = 0
  let bestDist = Infinity
  points.forEach((p, i) => {
    const d = Math.hypot(p.x - START_ANCHOR.x, p.y - START_ANCHOR.y)
    if (d < bestDist) {
      bestDist = d
      startIndex = i
    }
  })

  return { count, length, spacing, halfWidth: HALF_WIDTH, wallDistance: WALL_DISTANCE, startIndex, points, heading, nx, ny, speedProfile }
}

export const TRACK: Track = buildTrack()

export function angleDiff(a: number, b: number) {
  let d = a - b
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return d
}

function wrapIndex(i: number, count: number) {
  return ((i % count) + count) % count
}

// Nearest track sample to (x, y). With a hint it only searches near it, which keeps tracking cheap and stops a car
// that cuts across the infield from jumping to a far part of the circuit.
export function locate(track: Track, x: number, y: number, hint = -1) {
  const { count, points } = track
  let best = 0
  let bestD = Infinity
  const consider = (i: number) => {
    const p = points[i]
    const d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y)
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  if (hint < 0) {
    for (let i = 0; i < count; i++) consider(i)
  } else {
    for (let k = -16; k <= 16; k++) consider(wrapIndex(hint + k, count))
  }
  const c = points[best]
  const lateral = (x - c.x) * track.nx[best] + (y - c.y) * track.ny[best]
  return { index: best, lateral }
}

// ---------------------------------------------------------------- cars and race

export type Car = {
  entry: GridEntry
  isPlayer: boolean
  gridSlot: number
  x: number
  y: number
  heading: number
  speed: number
  index: number // nearest track sample
  unwrapped: number // sample index counted from the start line without wrapping, so it grows across laps
  lateral: number // signed distance from the centerline
  progress: number // distance driven along the circuit; 0 is the start line, negative on the grid
  completed: number // laps completed
  lapStart: number // race time the current lap began
  lapTimes: number[]
  bestLap: number | null
  finished: boolean
  finishTime: number | null
  skill: number // AI pace, a fraction of the track's safe speed
  baseOffset: number
  offset: number
  hitWall: boolean
}

export type RacePhase = 'countdown' | 'racing' | 'cooldown' | 'finished'

export type Race = {
  track: Track
  laps: number
  cars: Car[]
  playerIndex: number
  phase: RacePhase
  countdown: number
  time: number
  settleTime: number
  order: number[] // car indices, leader first
}

export type Input = { throttle: boolean; brake: boolean; left: boolean; right: boolean }
export const NO_INPUT: Input = { throttle: false, brake: false, left: false, right: false }

export type Classified = {
  position: number
  car: Car
  finished: boolean
  time: number | null // total race time for cars that finished
  gap: number | null // seconds behind the winner
  lapsDown: number
  fastest: boolean
}

export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(items: T[], rng: () => number) {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function createRace(playerDriverId: string, laps: number, rng: () => number = Math.random, track: Track = TRACK): Race {
  const playerEntry = findEntry(playerDriverId) ?? F1_ENTRIES[0]
  const others = shuffle(F1_ENTRIES.filter((entry) => entry.driver.id !== playerEntry.driver.id), rng)
  const slotCount = others.length + 1
  const playerSlot = Math.min(PLAYER_GRID_SLOT, slotCount - 1)
  const lineup = [...others.slice(0, playerSlot), playerEntry, ...others.slice(playerSlot)]

  const cars = lineup.map((entry, slot): Car => {
    const row = Math.floor(slot / 2)
    const side = slot % 2 === 0 ? -1 : 1
    const behind = 16 + row * 24 + (side > 0 ? 10 : 0) // staggered, like a real grid
    const index = wrapIndex(track.startIndex - Math.round(behind / track.spacing), track.count)
    const lateral = side * 12
    const p = track.points[index]
    const isPlayer = entry.driver.id === playerEntry.driver.id
    return {
      entry,
      isPlayer,
      gridSlot: slot,
      x: p.x + track.nx[index] * lateral,
      y: p.y + track.ny[index] * lateral,
      heading: track.heading[index],
      speed: 0,
      index,
      lateral,
      unwrapped: -Math.round(behind / track.spacing),
      progress: -Math.round(behind / track.spacing) * track.spacing,
      completed: 0,
      lapStart: 0,
      lapTimes: [],
      bestLap: null,
      finished: false,
      finishTime: null,
      skill: 0.9 + rng() * 0.1,
      baseOffset: (rng() - 0.5) * 20,
      offset: lateral,
      hitWall: false,
    }
  })

  const race: Race = {
    track,
    laps,
    cars,
    playerIndex: cars.findIndex((car) => car.isPlayer),
    phase: 'countdown',
    countdown: COUNTDOWN_SECONDS,
    time: 0,
    settleTime: 0,
    order: [],
  }
  race.order = computeOrder(race)
  return race
}

// Red lights lit during the countdown (0 to 5). All out means go.
export function lightsLit(race: Race) {
  if (race.phase !== 'countdown') return 0
  const elapsed = COUNTDOWN_SECONDS - race.countdown
  return Math.min(COUNTDOWN_LIGHTS, Math.max(0, Math.ceil(elapsed / (COUNTDOWN_SECONDS / COUNTDOWN_LIGHTS))))
}

function computeOrder(race: Race) {
  return race.cars
    .map((_, i) => i)
    .sort((a, b) => {
      const ca = race.cars[a]
      const cb = race.cars[b]
      if (ca.finished && cb.finished) return (ca.finishTime ?? 0) - (cb.finishTime ?? 0)
      if (ca.finished) return -1
      if (cb.finished) return 1
      return cb.progress - ca.progress
    })
}

function accelerate(car: Car, dt: number, topSpeed: number) {
  const ratio = Math.max(0, car.speed / topSpeed)
  car.speed += ACCEL * (1 - ratio * ratio * 0.92) * dt
}

function steerCar(car: Car, steer: number, dt: number) {
  const authority = Math.min(1, Math.abs(car.speed) / 45)
  const direction = car.speed < 0 ? -1 : 1
  car.heading += steer * turnRate(car.speed) * authority * direction * dt
}

function driveByInput(car: Car, input: Input, dt: number) {
  if (input.throttle && !input.brake) accelerate(car, dt, VTOP)
  else if (input.brake) {
    car.speed = Math.max(-REVERSE_MAX, car.speed - (car.speed > 0 ? BRAKE : 90) * dt)
  } else if (car.speed > 0) car.speed = Math.max(0, car.speed - COAST * dt)
  else if (car.speed < 0) car.speed = Math.min(0, car.speed + COAST * dt)
  steerCar(car, (input.right ? 1 : 0) - (input.left ? 1 : 0), dt)
}

function driveByAI(race: Race, car: Car, dt: number, rubberBand: number) {
  const track = race.track
  const { count } = track
  const lookahead = Math.round(7 + Math.max(0, car.speed) * 0.075)

  // Look for a slower car ahead in the same lane; slow behind it and swing to the open side to pass.
  let blockerSpeed = Infinity
  let desiredOffset = car.baseOffset
  for (const other of race.cars) {
    if (other === car) continue
    const gap = other.progress - car.progress
    if (gap > 0 && gap < 30 && Math.abs(other.lateral - car.lateral) < 12) {
      if (other.speed < car.speed + 5) {
        blockerSpeed = Math.min(blockerSpeed, other.speed)
        desiredOffset = other.lateral > 0 ? -18 : 18
      }
    }
  }
  car.offset += (desiredOffset - car.offset) * Math.min(1, dt * 2.5)

  const target = wrapIndex(car.index + lookahead, count)
  const tx = track.points[target].x + track.nx[target] * car.offset
  const ty = track.points[target].y + track.ny[target] * car.offset
  const wanted = Math.atan2(ty - car.y, tx - car.x)
  const error = angleDiff(wanted, car.heading)
  const maxTurn = turnRate(car.speed)
  const omega = Math.max(-maxTurn, Math.min(maxTurn, error * 4.2))
  car.heading += omega * dt

  const pace = car.finished ? 0.55 : car.skill * (1 + rubberBand)
  let targetSpeed = track.speedProfile[wrapIndex(car.index + 4, count)] * pace
  if (blockerSpeed !== Infinity) targetSpeed = Math.min(targetSpeed, blockerSpeed * 0.98)
  if (car.speed < targetSpeed) accelerate(car, dt, VTOP)
  else car.speed = Math.max(targetSpeed, car.speed - AI_BRAKE * dt)
}

function recordLap(race: Race, car: Car, crossTime: number) {
  car.completed += 1
  const lap = crossTime - car.lapStart
  car.lapStart = crossTime
  car.lapTimes.push(lap)
  if (car.bestLap === null || lap < car.bestLap) car.bestLap = lap
  if (car.completed >= race.laps && !car.finished) {
    car.finished = true
    car.finishTime = crossTime
  }
}

function moveCar(race: Race, car: Car, dt: number) {
  const track = race.track
  car.x += Math.cos(car.heading) * car.speed * dt
  car.y += Math.sin(car.heading) * car.speed * dt

  const before = car.index
  const spot = locate(track, car.x, car.y, car.index)
  car.index = spot.index
  car.lateral = spot.lateral

  // Off the asphalt the car is slow; past the barrier it is held back and loses speed.
  const offTrack = Math.abs(car.lateral) > track.halfWidth + 3
  const cap = offTrack ? VTOP * 0.4 : VTOP
  if (car.speed > cap) car.speed = Math.max(cap, car.speed - 240 * dt)
  if (Math.abs(car.lateral) > track.wallDistance) {
    const side = Math.sign(car.lateral)
    const c = track.points[car.index]
    car.x = c.x + track.nx[car.index] * track.wallDistance * side
    car.y = c.y + track.ny[car.index] * track.wallDistance * side
    car.lateral = track.wallDistance * side
    if (!car.hitWall) car.speed *= 0.55
    car.hitWall = true
  } else car.hitWall = false

  let delta = car.index - before
  if (delta > track.count / 2) delta -= track.count
  if (delta < -track.count / 2) delta += track.count
  const previous = car.progress
  car.unwrapped += delta
  // Whole samples plus how far past the nearest sample the car is, so lap times are not quantized to a sample.
  const c = track.points[car.index]
  const along = (car.x - c.x) * Math.cos(track.heading[car.index]) + (car.y - c.y) * Math.sin(track.heading[car.index])
  car.progress = car.unwrapped * track.spacing + along

  const nextLine = (car.completed + 1) * track.length
  if (car.progress >= nextLine && previous < nextLine) {
    const fraction = (nextLine - previous) / (car.progress - previous)
    recordLap(race, car, race.time - dt + dt * fraction)
  }
}

function resolveContacts(race: Race) {
  const cars = race.cars
  const minDistance = CAR_RADIUS * 2
  for (let i = 0; i < cars.length; i++) {
    for (let j = i + 1; j < cars.length; j++) {
      const a = cars[i]
      const b = cars[j]
      const dx = b.x - a.x
      const dy = b.y - a.y
      if (Math.abs(dx) > minDistance || Math.abs(dy) > minDistance) continue
      const distance = Math.hypot(dx, dy)
      if (distance >= minDistance || distance === 0) continue
      const push = (minDistance - distance) / 2
      const ux = dx / distance
      const uy = dy / distance
      a.x -= ux * push
      a.y -= uy * push
      b.x += ux * push
      b.y += uy * push
      // The car behind gives up speed to the car in front.
      const [rear, front] = a.progress < b.progress ? [a, b] : [b, a]
      if (rear.speed > front.speed) rear.speed = front.speed + (rear.speed - front.speed) * 0.85
    }
  }
}

// Advance the race by dt seconds. `input` drives the player's car until it finishes.
export function stepRace(race: Race, input: Input, dt: number = STEP) {
  if (race.phase === 'finished') return

  if (race.phase === 'countdown') {
    race.countdown -= dt
    if (race.countdown <= 0) {
      race.countdown = 0
      race.phase = 'racing'
    }
    return
  }

  race.time += dt
  const player = race.cars[race.playerIndex]
  for (const car of race.cars) {
    if (car.isPlayer && !car.finished) driveByInput(car, input, dt)
    else {
      const gap = player.progress - car.progress
      const rubberBand = car.isPlayer ? 0 : Math.max(-0.03, Math.min(0.03, gap / race.track.length / 0.5 * 0.03))
      driveByAI(race, car, dt, rubberBand)
    }
  }
  for (const car of race.cars) moveCar(race, car, dt)
  resolveContacts(race)
  race.order = computeOrder(race)

  if (race.phase === 'racing' && player.finished) race.phase = 'cooldown'
  if (race.phase === 'cooldown') {
    race.settleTime += dt
    if (race.cars.every((car) => car.finished) || race.settleTime >= SETTLE_LIMIT) race.phase = 'finished'
  }
}

export function classify(race: Race): Classified[] {
  const order = computeOrder(race)
  const winner = race.cars[order[0]]
  const fastestLap = Math.min(...race.cars.map((car) => car.bestLap ?? Infinity))
  return order.map((carIndex, i) => {
    const car = race.cars[carIndex]
    return {
      position: i + 1,
      car,
      finished: car.finished,
      time: car.finishTime,
      gap: car.finished && winner.finishTime !== null && car.finishTime !== null ? car.finishTime - winner.finishTime : null,
      lapsDown: car.finished ? 0 : Math.max(1, race.laps - car.completed),
      fastest: car.bestLap !== null && car.bestLap === fastestLap,
    }
  })
}

export function positionOf(race: Race, carIndex: number) {
  return race.order.indexOf(carIndex) + 1
}

export function formatLap(seconds: number | null) {
  if (seconds === null || !Number.isFinite(seconds)) return '--:--.---'
  const total = Math.max(0, seconds)
  const minutes = Math.floor(total / 60)
  const rest = total - minutes * 60
  return `${minutes}:${rest.toFixed(3).padStart(6, '0')}`
}

export function formatGap(seconds: number) {
  return `+${seconds.toFixed(3)}s`
}
