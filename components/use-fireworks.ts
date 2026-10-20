'use client'

import { useCallback, useEffect, useRef } from 'react'

// Background fireworks for celebrating a completed task.
//
// `useFireworks()` returns a stable `burst()` function. The first call lazily appends a fixed,
// full-viewport, click-through <canvas> to <body> at z-index -1: that paints above the page
// background (the body background propagates to the viewport) but behind all app content, so
// the sparks show in the gaps around cards. The requestAnimationFrame loop only runs while there
// is something to draw, and the canvas is removed on unmount. Nothing runs when the user prefers
// reduced motion.

type Rocket = { x: number; y: number; targetY: number; vx: number; vy: number; hue: number; trail: [number, number][] }
type Spark = { x: number; y: number; px: number; py: number; vx: number; vy: number; life: number; decay: number; size: number; color: string }

const ROCKETS_PER_BURST = 4
const ROCKET_STAGGER_MS = 260
const SPARKS_PER_ROCKET = 80
const GRAVITY = 140 // px/s^2
const DRAG = 0.985 // per-frame at 60fps, scaled by dt
const MAX_SPARKS = 900

// Saturated mid-lightness hues stay visible on both light and dark backgrounds.
const HUES = [8, 28, 48, 150, 190, 215, 265, 300, 335]

function prefersReducedMotion() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const rand = (min: number, max: number) => min + Math.random() * (max - min)

function createEngine() {
  const canvas = document.createElement('canvas')
  canvas.setAttribute('aria-hidden', 'true')
  canvas.dataset.fireworks = 'true'
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:-1;pointer-events:none;'
  const ctx = canvas.getContext('2d')

  let width = 0
  let height = 0
  let dpr = 1
  let raf = 0
  let last = 0
  let attached = false
  let destroyed = false
  const rockets: Rocket[] = []
  let sparks: Spark[] = []
  const timers = new Set<number>()

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    width = window.innerWidth
    height = window.innerHeight
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  function attach() {
    if (attached) return
    resize()
    document.body.appendChild(canvas)
    window.addEventListener('resize', resize)
    attached = true
  }

  function detach() {
    if (!attached) return
    window.removeEventListener('resize', resize)
    canvas.remove()
    attached = false
  }

  function explode(rocket: Rocket) {
    const color = (hue: number) => `hsl(${hue % 360} 95% ${Math.round(rand(52, 62))}%)`
    const speed = rand(150, 260)
    const secondHue = rocket.hue + rand(30, 140)
    const dualTone = Math.random() < 0.5
    for (let i = 0; i < SPARKS_PER_ROCKET && sparks.length < MAX_SPARKS; i++) {
      const angle = (Math.PI * 2 * i) / SPARKS_PER_ROCKET + rand(-0.04, 0.04)
      const velocity = speed * rand(0.55, 1)
      sparks.push({
        x: rocket.x,
        y: rocket.y,
        px: rocket.x,
        py: rocket.y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: 1,
        decay: rand(0.5, 0.85),
        size: rand(1.6, 2.6),
        color: color(dualTone && i % 2 ? secondHue : rocket.hue),
      })
    }
  }

  function launch() {
    if (destroyed || !ctx) return
    const x = rand(width * 0.12, width * 0.88)
    rockets.push({
      x,
      y: height + 10,
      targetY: rand(height * 0.15, height * 0.5),
      vx: rand(-30, 30),
      vy: -rand(520, 700),
      hue: HUES[Math.floor(Math.random() * HUES.length)],
      trail: [],
    })
    start()
  }

  function start() {
    if (!raf) {
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }
  }

  function frame(now: number) {
    raf = 0
    if (destroyed || !ctx) return
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    const drag = Math.pow(DRAG, dt * 60)

    // Fade what is already on the canvas instead of clearing it, which leaves glowing trails.
    // destination-out keeps the canvas transparent so the page background stays visible.
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)'
    ctx.fillRect(0, 0, width, height)
    ctx.globalCompositeOperation = 'source-over'
    ctx.lineCap = 'round'

    for (let i = rockets.length - 1; i >= 0; i--) {
      const rocket = rockets[i]
      rocket.trail.push([rocket.x, rocket.y])
      if (rocket.trail.length > 8) rocket.trail.shift()
      rocket.x += rocket.vx * dt
      rocket.y += rocket.vy * dt
      rocket.vy += 260 * dt // slow down as it climbs so it peaks near the target
      ctx.strokeStyle = `hsl(${rocket.hue} 95% 58%)`
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(rocket.trail[0][0], rocket.trail[0][1])
      for (const [tx, ty] of rocket.trail) ctx.lineTo(tx, ty)
      ctx.lineTo(rocket.x, rocket.y)
      ctx.stroke()
      if (rocket.y <= rocket.targetY || rocket.vy >= -40) {
        explode(rocket)
        rockets.splice(i, 1)
      }
    }

    sparks = sparks.filter((spark) => spark.life > 0)
    for (const spark of sparks) {
      spark.px = spark.x
      spark.py = spark.y
      spark.vx *= drag
      spark.vy = spark.vy * drag + GRAVITY * dt
      spark.x += spark.vx * dt
      spark.y += spark.vy * dt
      spark.life -= spark.decay * dt
      if (spark.life <= 0) continue
      ctx.globalAlpha = Math.max(0, Math.min(1, spark.life * 1.2))
      ctx.strokeStyle = spark.color
      ctx.lineWidth = spark.size * (0.5 + spark.life * 0.5)
      ctx.beginPath()
      ctx.moveTo(spark.px, spark.py)
      ctx.lineTo(spark.x, spark.y)
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    if (rockets.length || sparks.length || timers.size) {
      raf = requestAnimationFrame(frame)
    } else {
      // Idle: wipe any residue and stop the loop and the canvas until the next burst.
      ctx.clearRect(0, 0, width, height)
      detach()
    }
  }

  return {
    burst() {
      if (destroyed || !ctx || prefersReducedMotion()) return
      attach()
      for (let i = 0; i < ROCKETS_PER_BURST; i++) {
        if (i === 0) {
          launch()
          continue
        }
        const id = window.setTimeout(() => {
          timers.delete(id)
          launch()
        }, i * ROCKET_STAGGER_MS + rand(0, 120))
        timers.add(id)
      }
    },
    destroy() {
      destroyed = true
      cancelAnimationFrame(raf)
      raf = 0
      timers.forEach((id) => window.clearTimeout(id))
      timers.clear()
      detach()
    },
  }
}

export function useFireworks() {
  const engineRef = useRef<ReturnType<typeof createEngine> | null>(null)

  useEffect(() => {
    return () => {
      engineRef.current?.destroy()
      engineRef.current = null
    }
  }, [])

  return useCallback(() => {
    try {
      engineRef.current ??= createEngine()
      engineRef.current.burst()
    } catch {
      // Canvas can be unavailable; the fireworks are a nicety, so fail silently.
    }
  }, [])
}
