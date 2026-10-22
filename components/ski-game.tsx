'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, ArrowUp, Download, Pause, Play, RotateCcw } from 'lucide-react'
import { useColorMode } from '@/components/color-mode-provider'
import { useTheme } from '@/components/theme-provider'
import { GameLeaderboard, GameTabs, type GameTab } from '@/components/game-leaderboard'
import { SKI_RULES } from '@/lib/ski-rules'
import { useScoreSync } from '@/lib/use-score-sync'

type Status = 'ready' | 'running' | 'paused' | 'over' | 'won'
type Steer = -1 | 0 | 1
type ModeKey = 'trees' | 'groomed' | 'park'

// Course lengths in distance points (METERS_PER_POINT px each). Tuned against each course's
// speed ramp so a clean run takes roughly 70 to 80 seconds: Trees ~70s, Groomed ~78s, Park ~71s.
// The leaderboard's plausibility checks use the same lengths (lib/ski-rules.ts).
const TREES_FINISH_POINTS = SKI_RULES.trees.finishPoints
const GROOMED_FINISH_POINTS = SKI_RULES.groomed.finishPoints
const PARK_FINISH_POINTS = SKI_RULES.park.finishPoints

const DOWNLOAD_URL = 'https://apps.apple.com/us/app/ski-tree/id1672785739'

type ModeConfig = {
  label: string
  blurb: string
  help: string
  startSpeed: number // px per second
  maxSpeed: number
  accel: number // px/s gained per second
  gateHalf: number
  gateChance: number
  spawnBase: number // slope distance between rows, shrinks as speed grows
  spawnMin: number
  jumps: boolean
  finishPoints: number // distance score (in points) at which the finish line is reached
}

const MODES: Record<ModeKey, ModeConfig> = {
  trees: {
    label: 'Trees',
    blurb: 'The classic slalom. Dodge trees and rocks.',
    help: 'Race down the slope and dodge the trees and rocks. Ski between the flags for bonus points.',
    startSpeed: 170, maxSpeed: 430, accel: 5, gateHalf: 44, gateChance: 0.2, spawnBase: 215, spawnMin: 105, jumps: false, finishPoints: TREES_FINISH_POINTS,
  },
  groomed: {
    label: 'Groomed run',
    blurb: 'Smooth, wide corduroy. Carve through the gates.',
    help: 'A smooth, wide-open groomed run with only the odd obstacle at the edges. Carve through the gates in a row to build a streak bonus.',
    startSpeed: 140, maxSpeed: 330, accel: 3, gateHalf: 56, gateChance: 0.7, spawnBase: 190, spawnMin: 140, jumps: false, finishPoints: GROOMED_FINISH_POINTS,
  },
  park: {
    label: 'Terrain park',
    blurb: 'Hit kickers, grind rails and boxes.',
    help: 'Hit kickers and jump for air, and ease off the steering before you land. Jump onto rails and boxes to grind them, because hitting one from the ground is a wipeout. Bumps slow you down.',
    startSpeed: 185, maxSpeed: 380, accel: 4, gateHalf: 44, gateChance: 0, spawnBase: 270, spawnMin: 190, jumps: true, finishPoints: PARK_FINISH_POINTS,
  },
}
const MODE_ORDER: ModeKey[] = ['trees', 'groomed', 'park']
const DEFAULT_MODE: ModeKey = 'trees'

type Obstacle = { kind: 'tree' | 'rock'; x: number; y: number }
type Gate = { x: number; y: number; passed: boolean }
// Park features. y is the downhill (bottom) edge and len is how far the feature extends uphill.
type Feature = { kind: 'kicker' | 'rail' | 'box' | 'bump'; x: number; y: number; len: number; half: number; used: boolean }
type Speck = { x: number; y: number; size: number }

type SkiState = {
  mode: ModeConfig
  x: number
  vx: number
  z: number // height above the snow
  vz: number
  airTime: number
  kickAge: number
  boosted: boolean
  jumpBuffer: number
  grind: { feature: Feature; points: number } | null
  bounce: number
  speed: number
  distance: number
  bonus: number
  streak: number
  nextSpawn: number
  obstacles: Obstacle[]
  features: Feature[]
  gates: Gate[]
  specks: Speck[]
  popup: { text: string; ttl: number } | null
  crashed: boolean
  finished: boolean
}

const BEST_KEY_PREFIX = 'daylist:ski-best-'

// Logical (CSS-independent) world size. The canvas backing store is scaled to this.
const WIDTH = 360
const HEIGHT = 480
const SKIER_Y = 378
const SKIER_HALF_WIDTH = 6
const SKIER_HEIGHT = 18

const METERS_PER_POINT = 20 // px of slope travelled per point
const GATE_BONUS = 25
const SPAWN_Y = -40
const GRAVITY = 1000
const AIR_SCORE_PER_SECOND = 70
const GRIND_SCORE_PER_SECOND = 90
const BIG_AIR = 0.45 // seconds of air that count as a trick and need a clean landing
const JUMP_BUFFER = 0.18

const leftKeys = new Set(['ArrowLeft', 'a', 'A'])
const rightKeys = new Set(['ArrowRight', 'd', 'D'])
const jumpKeys = new Set(['ArrowUp', 'w', 'W'])

function createSki(modeKey: ModeKey): SkiState {
  const mode = MODES[modeKey]
  const specks: Speck[] = []
  for (let i = 0; i < 36; i++) {
    specks.push({ x: Math.random() * WIDTH, y: Math.random() * HEIGHT, size: 1 + Math.random() * 1.6 })
  }
  return {
    mode,
    x: WIDTH / 2,
    vx: 0,
    z: 0,
    vz: 0,
    airTime: 0,
    kickAge: 99,
    boosted: false,
    jumpBuffer: 0,
    grind: null,
    bounce: 0,
    speed: mode.startSpeed,
    distance: 0,
    bonus: 0,
    streak: 0,
    nextSpawn: 220,
    obstacles: [],
    features: [],
    gates: [],
    specks,
    popup: null,
    crashed: false,
    finished: false,
  }
}

function scoreOf(state: SkiState) {
  return Math.floor(state.distance / METERS_PER_POINT) + state.bonus
}

function finishDistance(state: SkiState) {
  return state.mode.finishPoints * METERS_PER_POINT
}

// Slope position of the finish line. It scrolls down the screen and the run ends when it reaches the skier.
function finishLineY(state: SkiState) {
  return SKIER_Y - (finishDistance(state) - state.distance)
}

function say(state: SkiState, text: string) {
  state.popup = { text, ttl: 1 }
}

function spawnGate(state: SkiState) {
  const half = state.mode.gateHalf
  state.gates.push({ x: half + 24 + Math.random() * (WIDTH - 2 * (half + 24)), y: SPAWN_Y, passed: false })
}

function spawnPark(state: SkiState) {
  const roll = Math.random()
  const x = (half: number) => half + 20 + Math.random() * (WIDTH - 2 * (half + 20))
  if (roll < 0.35) {
    state.features.push({ kind: 'kicker', x: x(24), y: SPAWN_Y, len: 16, half: 24, used: false })
  } else if (roll < 0.55) {
    state.features.push({ kind: 'rail', x: x(8), y: SPAWN_Y, len: 90, half: 8, used: false })
  } else if (roll < 0.7) {
    state.features.push({ kind: 'box', x: x(20), y: SPAWN_Y, len: 80, half: 20, used: false })
  } else {
    const count = 2 + Math.floor(Math.random() * 2)
    for (let i = 0; i < count; i++) {
      state.features.push({ kind: 'bump', x: x(18), y: SPAWN_Y - i * 38, len: 9, half: 18, used: false })
    }
  }
}

function spawnRow(state: SkiState) {
  const { mode } = state
  if (mode.jumps) {
    spawnPark(state)
    return
  }
  if (Math.random() < mode.gateChance) {
    spawnGate(state)
    return
  }
  if (mode === MODES.groomed) {
    // Wide open run: just the occasional tree or rock out at the edges.
    if (Math.random() < 0.4) {
      const edge = 22 + Math.random() * 50
      state.obstacles.push({ kind: Math.random() < 0.7 ? 'tree' : 'rock', x: Math.random() < 0.5 ? edge : WIDTH - edge, y: SPAWN_Y })
    }
    return
  }
  const count = 1 + Math.floor(Math.random() * (state.speed > 300 ? 3 : 2)) + (Math.random() < 0.35 ? 1 : 0)
  const placed: number[] = []
  for (let i = 0; i < count; i++) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const x = 22 + Math.random() * (WIDTH - 44)
      if (placed.every((other) => Math.abs(other - x) > 54)) {
        placed.push(x)
        state.obstacles.push({ kind: Math.random() < 0.7 ? 'tree' : 'rock', x, y: SPAWN_Y })
        break
      }
    }
  }
}

function hitsObstacle(state: SkiState, obstacle: Obstacle) {
  const halfWidth = obstacle.kind === 'tree' ? 9 : 12
  const height = obstacle.kind === 'tree' ? 16 : 12
  return (
    Math.abs(state.x - obstacle.x) < SKIER_HALF_WIDTH + halfWidth &&
    SKIER_Y > obstacle.y - height &&
    SKIER_Y - SKIER_HEIGHT < obstacle.y
  )
}

function endGrind(state: SkiState, hop: boolean) {
  if (!state.grind) return
  const gained = Math.round(state.airTime * AIR_SCORE_PER_SECOND + state.grind.points) + 25
  state.bonus += gained
  say(state, `Grind +${gained}`)
  state.grind = null
  state.airTime = 0
  state.boosted = false
  if (hop) {
    state.z = 1
    state.vz = 260
  }
}

// Terrain park physics: jumps, kickers, rails, boxes and bumps. Returns true on a wipeout.
function stepPark(state: SkiState, dt: number) {
  state.jumpBuffer = Math.max(0, state.jumpBuffer - dt)
  state.kickAge += dt
  state.bounce = Math.max(0, state.bounce - dt)

  // A pop just after leaving the kicker still counts as a boosted jump.
  if (state.z > 0 && state.kickAge < 0.15 && !state.boosted && state.jumpBuffer > 0) {
    state.vz = 520
    state.boosted = true
    state.jumpBuffer = 0
  }

  const wasAir = state.z > 0
  let landed = false
  if (state.z > 0 || state.vz > 0) {
    state.vz -= GRAVITY * dt
    state.z += state.vz * dt
    if (state.z > 0) {
      state.airTime += dt
    } else {
      state.z = 0
      state.vz = 0
      landed = true
    }
  }

  if (state.grind) {
    const grind = state.grind
    grind.points += GRIND_SCORE_PER_SECOND * dt
    const jumped = state.jumpBuffer > 0
    if (jumped) state.jumpBuffer = 0
    if (jumped || grind.feature.y - grind.feature.len > SKIER_Y) endGrind(state, jumped)
    return false
  }

  const overlaps = (feature: Feature) =>
    feature.y - feature.len <= SKIER_Y &&
    SKIER_Y <= feature.y &&
    Math.abs(state.x - feature.x) < feature.half + SKIER_HALF_WIDTH * 0.6

  const onKicker = state.features.some((feature) => feature.kind === 'kicker' && !feature.used && overlaps(feature))
  if (state.jumpBuffer > 0 && state.z === 0 && state.vz === 0 && !onKicker) {
    // Ollie: a short hop, enough to get onto a rail or box.
    state.jumpBuffer = 0
    state.z = 1
    state.vz = 250
    state.airTime = 0
  }

  for (const feature of state.features) {
    if (!overlaps(feature)) continue
    if (feature.kind === 'kicker') {
      if (feature.used || state.z !== 0) continue
      feature.used = true
      state.boosted = state.jumpBuffer > 0
      state.vz = state.boosted ? 520 : 340
      state.z = 1
      state.airTime = 0
      state.kickAge = 0
      state.jumpBuffer = 0
    } else if (feature.kind === 'bump') {
      if (feature.used || state.z > 4) continue
      feature.used = true
      state.speed = Math.max(state.mode.startSpeed, state.speed - 14)
      state.bounce = 0.18
    } else {
      // Rail or box: clear it from the air to grind, but hitting it on the ground is a wipeout.
      if (state.z > 14) continue
      if (state.z > 0 || landed || wasAir) {
        state.grind = { feature, points: 0 }
        state.z = 0
        state.vz = 0
        state.vx = 0
        landed = false
        return false
      }
      return true
    }
  }

  if (landed) {
    if (state.airTime >= BIG_AIR) {
      if (Math.abs(state.vx) > 130) return true // landed sideways
      // A popped (boosted) jump is worth full points; just rolling off a kicker earns half.
      const gained = Math.round(state.airTime * AIR_SCORE_PER_SECOND * (state.boosted ? 1 : 0.5)) + 20
      state.bonus += gained
      say(state, `Clean landing +${gained}`)
    }
    state.airTime = 0
    state.boosted = false
  }
  return false
}

// Advances the simulation by dt seconds. Returns 'crashed' on a wipeout, 'finished' on crossing the line.
function stepSki(state: SkiState, steer: Steer, dt: number): 'crashed' | 'finished' | null {
  const { mode } = state
  state.speed = Math.min(mode.maxSpeed, state.speed + mode.accel * dt)
  const advance = state.speed * dt
  state.distance += advance

  if (state.grind) {
    // Locked onto the rail until the end or until you hop off.
    state.vx += (0 - state.vx) * Math.min(1, dt * 12)
    state.x += (state.grind.feature.x - state.x) * Math.min(1, dt * 12)
  } else {
    // Ease toward the requested direction so turning feels like carving rather than snapping.
    const maxLateral = 190 + (state.speed - mode.startSpeed) * 0.35
    state.vx += (steer * maxLateral - state.vx) * Math.min(1, dt * 9)
    state.x = Math.max(SKIER_HALF_WIDTH + 4, Math.min(WIDTH - SKIER_HALF_WIDTH - 4, state.x + state.vx * dt))
  }

  state.nextSpawn -= advance
  // Keep the run-out to the finish line clear of new obstacles.
  if (state.nextSpawn <= 0 && finishLineY(state) < SPAWN_Y - 60) {
    spawnRow(state)
    state.nextSpawn = Math.max(mode.spawnMin, mode.spawnBase - state.speed * 0.25) + Math.random() * 60
  }

  for (const obstacle of state.obstacles) obstacle.y += advance
  state.obstacles = state.obstacles.filter((obstacle) => obstacle.y < HEIGHT + 50)
  for (const feature of state.features) feature.y += advance
  state.features = state.features.filter((feature) => feature.y - feature.len < HEIGHT + 20)

  for (const gate of state.gates) {
    const before = gate.y
    gate.y += advance
    if (!gate.passed && before < SKIER_Y && gate.y >= SKIER_Y) {
      gate.passed = true
      if (Math.abs(state.x - gate.x) < mode.gateHalf - 4) {
        const gained = GATE_BONUS + Math.min(state.streak, 4) * 5
        state.streak += 1
        state.bonus += gained
        say(state, state.streak > 1 ? `Gate x${state.streak} +${gained}` : `Gate +${gained}`)
      } else {
        state.streak = 0
      }
    }
  }
  state.gates = state.gates.filter((gate) => gate.y < HEIGHT + 50)

  for (const speck of state.specks) {
    speck.y += advance
    if (speck.y > HEIGHT) {
      speck.y -= HEIGHT
      speck.x = Math.random() * WIDTH
    }
  }

  if (state.popup) {
    state.popup.ttl -= dt
    if (state.popup.ttl <= 0) state.popup = null
  }

  if (state.obstacles.some((obstacle) => hitsObstacle(state, obstacle)) || (mode.jumps && stepPark(state, dt))) {
    state.crashed = true
    return 'crashed'
  }
  if (state.distance >= finishDistance(state)) {
    state.finished = true
    return 'finished'
  }
  return null
}

type Palette = {
  snow: string; speck: string; stripe: string; tree: string; trunk: string; rock: string
  flagA: string; flagB: string; skier: string; ink: string; ramp: string; rail: string
}

function readPalette(canvas: HTMLCanvasElement): Palette {
  const styles = window.getComputedStyle(canvas)
  const color = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback
  return {
    snow: color('--secondary', '#f1f1ea'),
    speck: color('--border', '#dcdcd2'),
    stripe: color('--muted', '#ebebe4'),
    tree: color('--sage-deep', '#2f5d46'),
    trunk: color('--ink-soft', '#5b6b60'),
    rock: color('--muted-foreground', '#7a857d'),
    flagA: color('--coral', '#d9774f'),
    flagB: color('--primary', '#3d6b52'),
    skier: color('--coral', '#d9774f'),
    ink: color('--foreground', '#243329'),
    ramp: color('--sage', '#d6e8dc'),
    rail: color('--accent-foreground', '#3a4d40'),
  }
}

function drawSki(context: CanvasRenderingContext2D, state: SkiState, palette: Palette, scale: number) {
  context.setTransform(scale, 0, 0, scale, 0, 0)
  context.fillStyle = palette.snow
  context.fillRect(0, 0, WIDTH, HEIGHT)

  if (state.mode === MODES.groomed) {
    // Corduroy: faint stripes running downhill.
    context.fillStyle = palette.stripe
    for (let x = 0; x < WIDTH; x += 24) context.fillRect(x, 0, 12, HEIGHT)
  }

  context.fillStyle = palette.speck
  for (const speck of state.specks) context.fillRect(speck.x, speck.y, speck.size, speck.size)

  // Ski tracks behind the skier.
  const carve = state.vx / 220
  context.strokeStyle = palette.speck
  context.lineWidth = 2
  context.lineCap = 'round'
  context.beginPath()
  context.moveTo(state.x - 3 - carve * 8, HEIGHT)
  context.lineTo(state.x - 3, SKIER_Y)
  context.moveTo(state.x + 3 - carve * 8, HEIGHT)
  context.lineTo(state.x + 3, SKIER_Y)
  context.stroke()

  const finishY = finishLineY(state)
  if (finishY > -24) {
    const cell = 12
    context.fillStyle = palette.ink
    for (let row = 0; row < 2; row++) {
      for (let x = 0; x * cell < WIDTH; x++) {
        if ((x + row) % 2 === 0) context.fillRect(x * cell, finishY - (row + 1) * cell, cell, cell)
      }
    }
    context.fillStyle = palette.flagA
    context.fillRect(0, finishY - 2 * cell - 3, WIDTH, 3)
  }

  for (const feature of state.features) {
    const top = feature.y - feature.len
    if (feature.kind === 'kicker') {
      context.fillStyle = palette.ramp
      context.strokeStyle = palette.rail
      context.lineWidth = 1.5
      context.beginPath()
      context.moveTo(feature.x - feature.half, feature.y)
      context.lineTo(feature.x + feature.half, feature.y)
      context.lineTo(feature.x + feature.half - 4, top)
      context.lineTo(feature.x - feature.half + 4, top)
      context.closePath()
      context.fill()
      context.stroke()
    } else if (feature.kind === 'bump') {
      context.fillStyle = palette.speck
      context.beginPath()
      context.ellipse(feature.x, feature.y - 4, feature.half, 6, 0, 0, Math.PI * 2)
      context.fill()
    } else if (feature.kind === 'rail') {
      context.strokeStyle = palette.rail
      context.lineWidth = 4
      context.lineCap = 'butt'
      context.beginPath()
      context.moveTo(feature.x, top)
      context.lineTo(feature.x, feature.y)
      context.stroke()
      context.lineWidth = 2
      for (const legY of [top + 4, feature.y - 4]) {
        context.beginPath()
        context.moveTo(feature.x - 6, legY)
        context.lineTo(feature.x + 6, legY)
        context.stroke()
      }
      context.lineCap = 'round'
    } else {
      context.fillStyle = palette.rail
      context.beginPath()
      context.roundRect(feature.x - feature.half, top, feature.half * 2, feature.len, 4)
      context.fill()
      context.fillStyle = palette.ramp
      context.fillRect(feature.x - feature.half + 3, top + 3, feature.half * 2 - 6, feature.len - 6)
    }
  }

  for (const gate of state.gates) {
    for (const side of [-1, 1]) {
      const poleX = gate.x + side * state.mode.gateHalf
      context.strokeStyle = palette.ink
      context.lineWidth = 2
      context.beginPath()
      context.moveTo(poleX, gate.y)
      context.lineTo(poleX, gate.y - 26)
      context.stroke()
      context.fillStyle = side < 0 ? palette.flagA : palette.flagB
      context.beginPath()
      context.moveTo(poleX, gate.y - 26)
      context.lineTo(poleX + 13, gate.y - 21)
      context.lineTo(poleX, gate.y - 16)
      context.closePath()
      context.fill()
    }
  }

  for (const obstacle of state.obstacles) {
    if (obstacle.kind === 'tree') {
      context.fillStyle = palette.trunk
      context.fillRect(obstacle.x - 2, obstacle.y - 6, 4, 6)
      context.fillStyle = palette.tree
      context.beginPath()
      context.moveTo(obstacle.x, obstacle.y - 36)
      context.lineTo(obstacle.x + 11, obstacle.y - 17)
      context.lineTo(obstacle.x - 11, obstacle.y - 17)
      context.closePath()
      context.fill()
      context.beginPath()
      context.moveTo(obstacle.x, obstacle.y - 26)
      context.lineTo(obstacle.x + 14, obstacle.y - 5)
      context.lineTo(obstacle.x - 14, obstacle.y - 5)
      context.closePath()
      context.fill()
    } else {
      context.fillStyle = palette.rock
      context.beginPath()
      context.ellipse(obstacle.x, obstacle.y - 6, 13, 8, 0, 0, Math.PI * 2)
      context.fill()
    }
  }

  // Shadow stays on the snow while the skier is airborne.
  if (state.z > 0) {
    context.fillStyle = palette.speck
    context.beginPath()
    context.ellipse(state.x, SKIER_Y, 9 - Math.min(4, state.z / 30), 3, 0, 0, Math.PI * 2)
    context.fill()
  }

  // Skier, seen from behind. Skis splay out slightly with the current turn.
  const lean = carve * 4
  const lift = state.z * 0.6 + (state.grind ? 4 : 0) + Math.sin((state.bounce / 0.18) * Math.PI) * 4
  const spin = state.z > 0 && state.airTime >= 0.15 ? Math.cos(state.airTime * 9) : 1
  context.save()
  context.translate(state.x, SKIER_Y - lift)
  if (state.crashed) context.rotate(0.9)
  context.scale(spin, 1)
  context.strokeStyle = palette.ink
  context.lineWidth = 2.5
  context.lineCap = 'round'
  context.beginPath()
  context.moveTo(-4 - lean, 2)
  context.lineTo(-3, -10)
  context.moveTo(4 - lean, 2)
  context.lineTo(3, -10)
  context.stroke()
  context.fillStyle = palette.skier
  context.beginPath()
  context.roundRect(-5.5, -19, 11, 12, 3)
  context.fill()
  context.fillStyle = palette.ink
  context.beginPath()
  context.arc(0, -22, 4.2, 0, Math.PI * 2)
  context.fill()
  context.restore()

  context.fillStyle = palette.flagB
  context.font = '700 14px system-ui, sans-serif'
  context.textAlign = 'center'
  if (state.popup) {
    context.globalAlpha = Math.min(1, state.popup.ttl * 2)
    context.fillText(state.popup.text, Math.max(70, Math.min(WIDTH - 70, state.x)), SKIER_Y - 52 - (1 - state.popup.ttl) * 22)
    context.globalAlpha = 1
  } else if (state.airTime >= 0.2 && state.z > 0) {
    context.fillText(`Air +${Math.round(state.airTime * AIR_SCORE_PER_SECOND)}`, Math.max(50, Math.min(WIDTH - 50, state.x)), SKIER_Y - lift - 34)
  }
}

export function SkiGame() {
  const [status, setStatus] = useState<Status>('ready')
  const [modeKey, setModeKey] = useState<ModeKey>(DEFAULT_MODE)
  const [score, setScore] = useState(0)
  const [tab, setTab] = useState<GameTab>('play')
  // The course the leaderboard shows; it starts on the one being played and can be changed there.
  const [boardCourse, setBoardCourse] = useState<ModeKey>(DEFAULT_MODE)
  const scores = useScoreSync('skiing')
  const [bests, setBests] = useState<Record<ModeKey, number>>({ trees: 0, groomed: 0, park: 0 })
  const stateRef = useRef<SkiState>(createSki(DEFAULT_MODE))
  const statusRef = useRef<Status>('ready')
  const modeRef = useRef<ModeKey>(DEFAULT_MODE)
  const bestsRef = useRef<Record<ModeKey, number>>({ trees: 0, groomed: 0, park: 0 })
  const scoreRef = useRef(0)
  // Seconds the current run has been in play (simulated time, so paused time does not count).
  const playedRef = useRef(0)
  const scaleRef = useRef(1)
  const paletteRef = useRef<Palette | null>(null)
  const keysRef = useRef({ left: false, right: false })
  const touchRef = useRef<Steer>(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const boardRef = useRef<HTMLDivElement>(null)

  const mode = MODES[modeKey]
  const best = bests[modeKey]
  const { resolvedMode } = useColorMode()
  const { theme } = useTheme()

  const changeStatus = useCallback((next: Status) => {
    statusRef.current = next
    setStatus(next)
  }, [])

  const render = useCallback(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    paletteRef.current ??= readPalette(canvas)
    drawSki(context, stateRef.current, paletteRef.current, scaleRef.current)
  }, [])

  useEffect(() => {
    const loaded = { ...bestsRef.current }
    try {
      for (const key of MODE_ORDER) {
        const saved = Number(window.localStorage.getItem(BEST_KEY_PREFIX + key))
        if (Number.isFinite(saved) && saved > 0) loaded[key] = saved
      }
    } catch {
      // Storage can be unavailable; the best score just won't persist.
    }
    bestsRef.current = loaded
    setBests(loaded)
    boardRef.current?.focus()
  }, [])

  // Keep the backing store matched to the displayed size and device pixel ratio so the slope stays sharp.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const cssWidth = canvas.clientWidth || WIDTH
      const scale = (cssWidth * (window.devicePixelRatio || 1)) / WIDTH
      scaleRef.current = scale
      canvas.width = Math.round(WIDTH * scale)
      canvas.height = Math.round(HEIGHT * scale)
      paletteRef.current = readPalette(canvas)
      render()
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [render])

  // The palette is cached from the theme tokens, so re-read it when the light/dark mode or color theme changes.
  useEffect(() => {
    paletteRef.current = null
    render()
  }, [resolvedMode, theme, render])

  // The animation loop only exists while running, and is cancelled on pause, game over, or unmount.
  useEffect(() => {
    if (status !== 'running') {
      render()
      return
    }
    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const state = stateRef.current
      const keys = keysRef.current
      const steer = Math.max(-1, Math.min(1, (keys.right ? 1 : 0) - (keys.left ? 1 : 0) + touchRef.current)) as Steer
      playedRef.current += dt
      const outcome = stepSki(state, steer, dt)
      const next = scoreOf(state)
      if (next !== scoreRef.current) {
        scoreRef.current = next
        setScore(next)
      }
      render()
      if (outcome) {
        const key = modeRef.current
        if (next > bestsRef.current[key]) {
          bestsRef.current = { ...bestsRef.current, [key]: next }
          setBests(bestsRef.current)
          try {
            window.localStorage.setItem(BEST_KEY_PREFIX + key, String(next))
          } catch {
            // Ignore storage failures.
          }
        }
        // The server keeps the player's best for the course; a score that cannot be sent now is kept on this device and
        // sent later. A win records the score just like a wipeout does.
        if (next > 0) {
          scores.submit(key, {
            course: key,
            score: next,
            distance: Math.min(MODES[key].finishPoints, Math.floor(state.distance / METERS_PER_POINT)),
            durationMs: Math.round(playedRef.current * 1000),
          })
        }
        changeStatus(outcome === 'finished' ? 'won' : 'over')
        return
      }
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [status, render, changeStatus, scores.submit])

  // Pause automatically if the tab is hidden so the skier never crashes while you are away.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && statusRef.current === 'running') changeStatus('paused')
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [changeStatus])

  function clearInput() {
    keysRef.current = { left: false, right: false }
    touchRef.current = 0
  }

  function restart() {
    clearInput()
    stateRef.current = createSki(modeRef.current)
    playedRef.current = 0
    scoreRef.current = 0
    setScore(0)
    changeStatus('running')
    boardRef.current?.focus()
  }

  function selectMode(next: ModeKey) {
    if (statusRef.current === 'running' || statusRef.current === 'paused') return
    clearInput()
    modeRef.current = next
    setModeKey(next)
    setBoardCourse(next)
    stateRef.current = createSki(next)
    playedRef.current = 0
    scoreRef.current = 0
    setScore(0)
    changeStatus('ready')
    render()
    boardRef.current?.focus()
  }

  // The board is hidden on the leaderboard tab, so pause a run in progress, and hand the board keyboard focus again only
  // once it is back on screen.
  function showTab(next: GameTab) {
    setTab(next)
    if (next === 'leaderboard') {
      if (statusRef.current === 'running') changeStatus('paused')
      setBoardCourse(modeRef.current)
      void scores.flush()
    }
  }

  useEffect(() => {
    if (tab === 'play') boardRef.current?.focus()
  }, [tab])

  function begin() {
    if (statusRef.current === 'over' || statusRef.current === 'won') restart()
    else if (statusRef.current !== 'running') {
      changeStatus('running')
      boardRef.current?.focus()
    }
  }

  function togglePause() {
    if (statusRef.current === 'running') changeStatus('paused')
    else if (statusRef.current === 'paused') changeStatus('running')
  }

  function jump() {
    if (statusRef.current === 'running' && stateRef.current.mode.jumps) stateRef.current.jumpBuffer = JUMP_BUFFER
  }

  // Key handling is scoped to the focused board, so it never intercepts typing in task inputs
  // and arrow keys, Space and Enter keep working normally everywhere else in the app.
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.metaKey || event.ctrlKey || event.altKey) return
    // Keys pressed on the course selector or overlay buttons keep their native behavior.
    const onBoard = event.target === event.currentTarget
    const key = event.key
    const parkJump = mode.jumps && jumpKeys.has(key)
    if (leftKeys.has(key) || rightKeys.has(key)) {
      if (!onBoard) return
      event.preventDefault()
      if (statusRef.current === 'over' || statusRef.current === 'won') return
      keysRef.current[leftKeys.has(key) ? 'left' : 'right'] = true
      if (statusRef.current !== 'running') begin()
    } else if (parkJump && onBoard) {
      event.preventDefault()
      if (event.repeat || statusRef.current === 'over' || statusRef.current === 'won') return
      if (statusRef.current === 'running') jump()
      else begin()
    } else if (key === 'p' || key === 'P') {
      if (!onBoard) return
      event.preventDefault()
      if (statusRef.current === 'over' || statusRef.current === 'won') restart()
      else if (statusRef.current === 'ready') begin()
      else togglePause()
    } else if ((key === ' ' || key === 'Enter') && onBoard) {
      event.preventDefault()
      if (event.repeat) return
      if (statusRef.current === 'running') {
        if (key === ' ') jump()
      } else begin()
    }
  }

  function handleKeyUp(event: React.KeyboardEvent<HTMLDivElement>) {
    if (leftKeys.has(event.key)) keysRef.current.left = false
    else if (rightKeys.has(event.key)) keysRef.current.right = false
  }

  function holdProps(side: 'left' | 'right') {
    const value: Steer = side === 'left' ? -1 : 1
    const release = () => { if (touchRef.current === value) touchRef.current = 0 }
    return {
      onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
        event.preventDefault()
        event.currentTarget.setPointerCapture?.(event.pointerId)
        touchRef.current = value
        if (statusRef.current === 'ready' || statusRef.current === 'paused') begin()
        else if (statusRef.current === 'over' || statusRef.current === 'won') restart()
      },
      onPointerUp: release,
      onPointerCancel: release,
      onLostPointerCapture: release,
      onContextMenu: (event: React.MouseEvent) => event.preventDefault(),
    }
  }

  const statusText = status === 'over' ? `Wipeout. Final score ${score}.` : status === 'won' ? `You made it down the mountain. Final score ${score}.` : `Score ${score}`

  return (
    <section className="snake-panel" aria-labelledby="ski-title">
      <div className="snake-heading">
        <div>
          <span className="eyebrow">JUST FOR FUN</span>
          <h2 id="ski-title">Downhill Skiing</h2>
        </div>
        <div className="snake-scores">
          <span className="snake-score" aria-live="polite">{statusText}</span>
          <span className="snake-best">{mode.label} best {best}</span>
        </div>
      </div>
      <GameTabs tab={tab} onChange={showTab} />
      {tab === 'leaderboard' && (
        <GameLeaderboard
          game="skiing"
          board={boardCourse}
          refreshKey={scores.version}
          help="Ranked per course by the highest score in one run (distance plus bonus points), best first. If two players have the same score, whoever got there first ranks higher. Scores are reported by your browser, so they are checked for plausibility, not replayed."
          controls={
            <div className="ski-modes ski-board-courses" role="group" aria-label="Course">
              {MODE_ORDER.map((key) => (
                <button key={key} type="button" className="ski-mode" aria-pressed={boardCourse === key} onClick={() => setBoardCourse(key)}>{MODES[key].label}</button>
              ))}
            </div>
          }
        />
      )}
      <div hidden={tab !== 'play'}>
      <p className="snake-help" id="ski-help">
        {mode.help} Steer with the left and right arrow keys or A and D{mode.jumps ? ', jump with Up, W or Space' : ''}. Press Space to start and P to pause.
      </p>
      <div
        className="snake-board"
        ref={boardRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onBlur={clearInput}
        aria-describedby="ski-help"
      >
        <canvas ref={canvasRef} className="ski-canvas" width={WIDTH} height={HEIGHT} role="img" aria-label={`${mode.label} slope. Score ${score}.`} />
        {status !== 'running' && (
          <div className="snake-overlay">
            <strong>{status === 'won' ? 'You made it down the mountain!' : status === 'over' ? 'Wipeout' : status === 'paused' ? 'Paused' : 'Ready?'}</strong>
            <span>{status === 'won' ? `Score ${score} · ${mode.label} best ${best}` : status === 'over' ? `You scored ${score}.` : status === 'paused' ? 'Press Space or P to keep going.' : 'Press Space or an arrow key to start.'}</span>
            {status === 'won' && (
              <a className="snake-action ski-download" href={DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">
                <Download aria-hidden="true" /> Download Ski Tree on iOS
              </a>
            )}
            {status !== 'paused' && (
              <div className="ski-modes" role="group" aria-label="Course">
                {MODE_ORDER.map((key) => (
                  <button key={key} type="button" className="ski-mode" aria-pressed={modeKey === key} onClick={() => selectMode(key)}>{MODES[key].label}</button>
                ))}
              </div>
            )}
            {status !== 'paused' && <span className="ski-mode-blurb">{mode.blurb}</span>}
            {status === 'over' || status === 'won' ? (
              <button className={status === 'won' ? 'snake-action ski-again' : 'snake-action'} type="button" onClick={restart}><RotateCcw aria-hidden="true" /> Play again</button>
            ) : (
              <button className="snake-action" type="button" onClick={begin}><Play aria-hidden="true" /> {status === 'paused' ? 'Resume' : 'Start'}</button>
            )}
          </div>
        )}
      </div>
      <div className="ski-controls">
        <button className="ski-steer" type="button" aria-label="Steer left" {...holdProps('left')}><ArrowLeft aria-hidden="true" /></button>
        <div className="ski-center">
          {mode.jumps && (
            <button
              className="ski-steer ski-jump"
              type="button"
              aria-label="Jump"
              onPointerDown={(event) => {
                event.preventDefault()
                if (statusRef.current === 'running') jump()
                else begin()
              }}
              onContextMenu={(event) => event.preventDefault()}
            >
              <ArrowUp aria-hidden="true" />
            </button>
          )}
          <button className="snake-pause" type="button" onClick={togglePause} disabled={status !== 'running' && status !== 'paused'}>
            {status === 'paused' ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
            {status === 'paused' ? 'Resume' : 'Pause'}
          </button>
        </div>
        <button className="ski-steer" type="button" aria-label="Steer right" {...holdProps('right')}><ArrowRight aria-hidden="true" /></button>
      </div>
      </div>
    </section>
  )
}
