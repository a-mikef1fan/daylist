import { formatOklch, parseColor, type Oklch } from './color'

// Page backgrounds a theme can choose. Everything is picked from fixed lists and numeric ranges: the model
// never supplies CSS, SVG or image data. Patterns and the CSS effects compile to gradients on the root
// element (lib/custom-theme/css.ts); the canvas effects are drawn by components/theme-background.tsx.

export const PATTERN_KINDS = ['pinstripes', 'stripes', 'grid', 'dots', 'checker', 'hatch', 'zigzag', 'waves', 'noise', 'gradient'] as const
export const CSS_EFFECT_KINDS = ['scanlines', 'gradientShift', 'retroGrid'] as const
export const CANVAS_EFFECT_KINDS = ['matrix', 'stars', 'emoji', 'snow', 'confetti', 'rain'] as const
export const BACKGROUND_KINDS = ['none', ...PATTERN_KINDS, ...CSS_EFFECT_KINDS, ...CANVAS_EFFECT_KINDS] as const
export type BackgroundKind = (typeof BACKGROUND_KINDS)[number]

export const KIND_LABELS: Record<BackgroundKind, string> = {
  none: 'None',
  pinstripes: 'Pinstripes',
  stripes: 'Stripes',
  grid: 'Grid',
  dots: 'Polka dots',
  checker: 'Checkerboard',
  hatch: 'Crosshatch',
  zigzag: 'Zigzag',
  waves: 'Waves',
  noise: 'Speckle',
  gradient: 'Gradient',
  scanlines: 'CRT scanlines (animated)',
  gradientShift: 'Shifting gradient (animated)',
  retroGrid: 'Retro grid (animated)',
  matrix: 'Matrix rain (animated)',
  stars: 'Starfield (animated)',
  emoji: 'Floating emoji (animated)',
  snow: 'Snow (animated)',
  confetti: 'Confetti (animated)',
  rain: 'Rain (animated)',
}

export const GLYPH_SETS = ['katakana', 'binary', 'hex', 'code'] as const
export type GlyphSet = (typeof GLYPH_SETS)[number]

export const ANGLES = [0, 45, 90, 135] as const
// Text shapes allowed besides any single emoji.
export const SHAPES = ['●', '■', '▲', '◆', '★', '♥'] as const

export type Background = {
  kind: BackgroundKind
  color: string
  color2: string
  size: number
  thickness: number
  angle: number
  opacity: number
  speed: number
  density: number
  glyphs: GlyphSet
  emoji: string
}

export const RANGES = {
  size: { min: 4, max: 120, fallback: 14 },
  thickness: { min: 1, max: 40, fallback: 1 },
  opacity: { min: 0.03, max: 0.5, fallback: 0.2 },
  speed: { min: 0.2, max: 3, fallback: 1 },
  density: { min: 0.2, max: 2, fallback: 1 },
}

export const isBackgroundKind = (value: unknown): value is BackgroundKind => BACKGROUND_KINDS.some((kind) => kind === value)
export const isCanvasEffect = (kind: BackgroundKind) => CANVAS_EFFECT_KINDS.some((effect) => effect === kind)

const clamp = (value: unknown, range: { min: number; max: number; fallback: number }) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.round(Math.min(range.max, Math.max(range.min, value)) * 100) / 100 : range.fallback

// One emoji (a single grapheme) or one of the allowed shapes; anything else becomes a sparkle.
export function cleanGlyph(value: unknown): string {
  const fallback = '✨'
  if (typeof value !== 'string') return fallback
  const text = value.trim()
  if (SHAPES.some((shape) => shape === text)) return text
  if (!text || text.length > 16) return fallback
  // Built at runtime so the property escape does not depend on the TypeScript target.
  const pictographic = new RegExp('\\p{Extended_Pictographic}', 'u')
  const graphemes = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)]
  return graphemes.length === 1 && pictographic.test(text) ? text : fallback
}

export const NO_BACKGROUND: Omit<Background, 'color' | 'color2'> = {
  kind: 'none',
  size: RANGES.size.fallback,
  thickness: RANGES.thickness.fallback,
  angle: 90,
  opacity: RANGES.opacity.fallback,
  speed: RANGES.speed.fallback,
  density: RANGES.density.fallback,
  glyphs: 'katakana',
  emoji: '✨',
}

// `fallbackColors` fill in any colour the input lacks or gets wrong (the theme's primary and highlight).
export function sanitizeBackground(raw: unknown, fallbackColors: { color: Oklch; color2: Oklch }): Background {
  const source = typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const size = clamp(source.size, RANGES.size)
  const angle = typeof source.angle === 'number' ? ANGLES.reduce((best, a) => (Math.abs(a - (source.angle as number)) < Math.abs(best - (source.angle as number)) ? a : best), 90 as number) : 90
  return {
    kind: isBackgroundKind(source.kind) ? source.kind : 'none',
    color: formatOklch(parseColor(source.color) ?? fallbackColors.color),
    color2: formatOklch(parseColor(source.color2) ?? fallbackColors.color2),
    size,
    thickness: Math.min(clamp(source.thickness, RANGES.thickness), Math.max(1, size - 1)),
    angle,
    opacity: clamp(source.opacity, RANGES.opacity),
    speed: clamp(source.speed, RANGES.speed),
    density: clamp(source.density, RANGES.density),
    glyphs: GLYPH_SETS.find((set) => set === source.glyphs) ?? 'katakana',
    emoji: cleanGlyph(source.emoji),
  }
}
