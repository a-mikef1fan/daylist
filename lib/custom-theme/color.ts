// Colour parsing and contrast helpers. Everything is normalised to OKLCH so generated
// themes can only ever put canonical `oklch(L C H)` strings into CSS variables.

export type Oklch = { l: number; c: number; h: number }

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i
const OKLCH = /^oklch\(\s*(\d*\.?\d+)(%?)\s+(\d*\.?\d+)\s+(\d*\.?\d+)(?:deg)?\s*\)$/i

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
const toGamma = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055)

function linearSrgbToOklch(r: number, g: number, b: number): Oklch {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const c = Math.hypot(a, bb)
  return { l: L, c, h: c < 1e-4 ? 0 : ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360 }
}

function oklchToLinearSrgb({ l: L, c, h }: Oklch): [number, number, number] {
  const a = c * Math.cos((h * Math.PI) / 180)
  const b = c * Math.sin((h * Math.PI) / 180)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

const inGamut = (color: Oklch) => oklchToLinearSrgb(color).every((v) => v >= -0.0005 && v <= 1.0005)

// Reduces chroma until the colour fits in sRGB, so contrast maths matches what is displayed.
function toGamut(color: Oklch): Oklch {
  const base = { l: clamp(color.l, 0, 1), c: Math.max(0, color.c), h: ((color.h % 360) + 360) % 360 }
  if (inGamut(base)) return base
  let lo = 0
  let hi = base.c
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    if (inGamut({ ...base, c: mid })) lo = mid
    else hi = mid
  }
  return { ...base, c: lo }
}

// Accepts #rgb, #rrggbb and oklch(L C H). Returns null for anything else (named colours,
// functions, var(), url() ...), which is what keeps arbitrary CSS out of the theme.
export function parseColor(input: unknown): Oklch | null {
  if (typeof input !== 'string' || input.length > 48) return null
  const value = input.trim()
  if (HEX.test(value)) {
    const digits = value.slice(1)
    const full = digits.length === 3 ? [...digits].map((d) => d + d).join('') : digits
    const [r, g, b] = [0, 2, 4].map((i) => toLinear(parseInt(full.slice(i, i + 2), 16) / 255))
    return linearSrgbToOklch(r, g, b)
  }
  const match = OKLCH.exec(value)
  if (!match) return null
  const lightness = match[2] ? Number(match[1]) / 100 : Number(match[1])
  const chroma = Number(match[3])
  const hue = Number(match[4])
  if (![lightness, chroma, hue].every(Number.isFinite) || lightness > 1 || chroma > 0.5 || hue > 360) return null
  return toGamut({ l: lightness, c: chroma, h: hue })
}

export function formatOklch(color: Oklch): string {
  const { l, c, h } = toGamut(color)
  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`
}

function luminance(color: Oklch): number {
  const [r, g, b] = oklchToLinearSrgb(toGamut(color)).map((v) => clamp(v, 0, 1))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: Oklch, b: Oklch): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const worstContrast = (fg: Oklch, backgrounds: Oklch[]) => Math.min(...backgrounds.map((bg) => contrastRatio(fg, bg)))

// Returns `fg` unchanged when it already reaches `min` against every background; otherwise the
// closest lightness (same hue and chroma) that does, falling back to black or white.
export function ensureContrast(fg: Oklch, backgrounds: Oklch[], min = 4.5): Oklch {
  const start = toGamut(fg)
  if (worstContrast(start, backgrounds) >= min) return start
  let best: Oklch | null = null
  for (const direction of [-1, 1]) {
    for (let step = 1; step <= 100; step++) {
      const candidate = toGamut({ ...start, l: clamp(start.l + (direction * step) / 100, 0, 1) })
      if (worstContrast(candidate, backgrounds) >= min) {
        if (!best || Math.abs(candidate.l - start.l) < Math.abs(best.l - start.l)) best = candidate
        break
      }
    }
  }
  if (best) return best
  const black = { l: 0, c: 0, h: 0 }
  const white = { l: 1, c: 0, h: 0 }
  return worstContrast(black, backgrounds) >= worstContrast(white, backgrounds) ? black : white
}

// #rrggbb for <input type="color">, from a canonical colour string. Falls back to black for unparseable input.
export function toHex(value: string): string {
  const parsed = parseColor(value)
  if (!parsed) return '#000000'
  return `#${oklchToLinearSrgb(toGamut(parsed))
    .map((v) => Math.round(clamp(toGamma(clamp(v, 0, 1)), 0, 1) * 255).toString(16).padStart(2, '0'))
    .join('')}`
}

// `t` of the way from `a` to `b`, mixed in OKLab like color-mix(in oklab).
export function blend(a: Oklch, b: Oklch, t: number): Oklch {
  const lab = (c: Oklch) => ({ l: c.l, a: c.c * Math.cos((c.h * Math.PI) / 180), b: c.c * Math.sin((c.h * Math.PI) / 180) })
  const x = lab(a)
  const y = lab(b)
  const m = { l: x.l + (y.l - x.l) * t, a: x.a + (y.a - x.a) * t, b: x.b + (y.b - x.b) * t }
  return toGamut({ l: m.l, c: Math.hypot(m.a, m.b), h: ((Math.atan2(m.b, m.a) * 180) / Math.PI + 360) % 360 })
}
