'use client'

import { useEffect, useRef } from 'react'
import { useCustomTheme } from '@/components/custom-theme-provider'
import { isCanvasEffect, type Background } from '@/lib/custom-theme/background'
import { toHex } from '@/lib/custom-theme/color'

// Animated page backgrounds drawn on a canvas behind the app. The canvas ignores the pointer, runs at about
// 30 fps, stops while the tab is hidden, and draws one still frame when the user prefers reduced motion.

const GLYPHS = {
  katakana: 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ',
  binary: '01',
  hex: '0123456789ABCDEF',
  code: '{}[]()<>/\\;=+*#$&|~',
}
const CONFETTI = ['#ff4d6d', '#ffd23f', '#3bceac', '#4d9de0', '#9b5de5']

type Step = (width: number, height: number, frame: number) => void

function createEffect(ctx: CanvasRenderingContext2D, bg: Background, width: number, height: number): Step {
  const color = toHex(bg.color)
  const color2 = toHex(bg.color2)
  const rand = Math.random
  const count = (base: number) => Math.max(4, Math.round(base * bg.density))

  if (bg.kind === 'matrix') {
    const size = 16
    const chars = GLYPHS[bg.glyphs]
    const drops = Array.from({ length: Math.ceil(width / (size * Math.min(1, 0.6 + bg.density * 0.4))) }, () => rand() * -(height / size))
    return () => {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillStyle = 'rgba(0,0,0,0.12)'
      ctx.fillRect(0, 0, width, height)
      ctx.globalCompositeOperation = 'source-over'
      ctx.font = `${size}px ui-monospace, monospace`
      drops.forEach((row, column) => {
        const y = row * size
        if (y > 0) {
          ctx.fillStyle = rand() < 0.15 ? color2 : color
          ctx.fillText(chars[Math.floor(rand() * chars.length)], column * size, y)
        }
        drops[column] = y > height && rand() > 0.975 ? 0 : row + bg.speed * 0.5
      })
    }
  }

  if (bg.kind === 'stars') {
    const stars = Array.from({ length: count(160) }, () => ({ x: rand() * width, y: rand() * height, r: rand() * 1.6 + 0.4, p: rand() * 6.28, v: rand() * 0.25 + 0.05 }))
    return (_w, _h, frame) => {
      ctx.clearRect(0, 0, width, height)
      for (const star of stars) {
        star.y += star.v * bg.speed
        if (star.y > height) star.y = 0
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(star.p + frame * 0.05 * bg.speed)
        ctx.fillStyle = star.r > 1.4 ? color2 : color
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.r, 0, 6.283)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }
  }

  if (bg.kind === 'emoji') {
    const items = Array.from({ length: count(16) }, () => ({ x: rand() * width, y: rand() * height, size: 18 + rand() * 28, v: 0.25 + rand() * 0.5, p: rand() * 6.28 }))
    return (_w, _h, frame) => {
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = color
      ctx.textBaseline = 'middle'
      for (const item of items) {
        item.y -= item.v * bg.speed
        if (item.y < -item.size) item.y = height + item.size
        ctx.font = `${item.size}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`
        ctx.fillText(bg.emoji, item.x + Math.sin(item.p + frame * 0.02 * bg.speed) * 14, item.y)
      }
    }
  }

  if (bg.kind === 'snow' || bg.kind === 'confetti' || bg.kind === 'rain') {
    const rain = bg.kind === 'rain'
    const items = Array.from({ length: count(rain ? 140 : 90) }, (_, index) => ({
      x: rand() * width,
      y: rand() * height,
      r: rain ? 8 + rand() * 12 : bg.kind === 'snow' ? 1.5 + rand() * 2.5 : 5 + rand() * 5,
      v: rain ? 8 + rand() * 6 : 0.6 + rand() * 1.2,
      p: rand() * 6.28,
      tint: CONFETTI[index % CONFETTI.length],
    }))
    return (_w, _h, frame) => {
      ctx.clearRect(0, 0, width, height)
      for (const item of items) {
        item.y += item.v * bg.speed
        if (rain) item.x -= 1.5 * bg.speed
        else item.x += Math.sin(item.p + frame * 0.02) * 0.6
        if (item.y > height + 20) { item.y = -20; item.x = rand() * width }
        if (item.x < -20) item.x = width + 10
        if (rain) {
          ctx.strokeStyle = color
          ctx.lineWidth = 1.2
          ctx.beginPath()
          ctx.moveTo(item.x, item.y)
          ctx.lineTo(item.x - 2, item.y + item.r)
          ctx.stroke()
        } else if (bg.kind === 'snow') {
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.arc(item.x, item.y, item.r, 0, 6.283)
          ctx.fill()
        } else {
          ctx.save()
          ctx.translate(item.x, item.y)
          ctx.rotate(item.p + frame * 0.05 * bg.speed)
          ctx.fillStyle = item.tint
          ctx.fillRect(-item.r / 2, -item.r / 4, item.r, item.r / 2)
          ctx.restore()
        }
      }
    }
  }

  return () => {}
}

function EffectCanvas({ background }: { background: Background }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5)
    let width = 0
    let height = 0
    let step: Step = () => {}
    let frame = 0
    let timer = 0
    let last = 0

    const setup = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * ratio
      canvas.height = height * ratio
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      step = createEffect(ctx, background, width, height)
      // A still frame for reduced motion: run the effect long enough to look populated, then stop.
      if (still) for (let i = 0; i < 90; i++) step(width, height, frame++)
    }

    const tick = (time: number) => {
      timer = requestAnimationFrame(tick)
      if (document.hidden || time - last < 33) return
      last = time
      step(width, height, frame++)
    }
    const handleVisibility = () => {
      cancelAnimationFrame(timer)
      if (!document.hidden && !still) timer = requestAnimationFrame(tick)
    }

    setup()
    if (!still) timer = requestAnimationFrame(tick)
    window.addEventListener('resize', setup)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      cancelAnimationFrame(timer)
      window.removeEventListener('resize', setup)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [background])

  return <canvas ref={ref} aria-hidden="true" className="theme-effect-canvas" style={{ opacity: background.opacity }} />
}

export function ThemeBackground() {
  const { shown } = useCustomTheme()
  const background = shown?.background
  if (!background || !isCanvasEffect(background.kind)) return null
  return <EffectCanvas background={background} />
}
