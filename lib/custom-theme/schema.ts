import { z } from 'zod'
import { ensureContrast, formatOklch, parseColor, type Oklch } from './color'
import { FONT_IDS, isFontId, type FontId } from './fonts'
import { ICON_NAMES, ICON_SLOTS, ICON_SLOT_KEYS, isIconName, type IconName, type IconSlot } from './icons'

// A theme is plain data: validated colour strings, allow-listed font and icon ids, and a few numbers.
// `sanitizeTheme` is the single gate every theme (model output or stored) must pass before it is used.

export const MIN_DESCRIPTION_LENGTH = 3
export const MAX_DESCRIPTION_LENGTH = 300

// WCAG AA text contrast is 4.5; aim slightly higher so rounding the stored colours cannot dip below it.
const TARGET_CONTRAST = 4.55

export const COLOR_KEYS = [
  'background',
  'foreground',
  'card',
  'primary',
  'primaryForeground',
  'secondary',
  'muted',
  'mutedForeground',
  'accent',
  'border',
  'destructive',
  'highlight',
] as const
export type ColorKey = (typeof COLOR_KEYS)[number]
export type ThemeColors = Record<ColorKey, string>

export const HEADING_TRANSFORMS = ['none', 'uppercase', 'capitalize'] as const
export type HeadingTransform = (typeof HEADING_TRANSFORMS)[number]

export type Theme = {
  name: string
  description: string
  colors: ThemeColors
  radius: number
  headingFont: FontId
  bodyFont: FontId
  headingTransform: HeadingTransform
  iconStrokeWidth: number
  icons: Partial<Record<IconSlot, IconName>>
}

export const RADIUS_RANGE = { min: 0, max: 1.75, fallback: 0.75 }
export const STROKE_RANGE = { min: 1, max: 3, fallback: 2 }

// The app's built-in look (sage), used to fill any colour a generated theme gets wrong.
const DEFAULT_COLORS: ThemeColors = {
  background: 'oklch(0.982 0.006 100)',
  foreground: 'oklch(0.24 0.025 158)',
  card: 'oklch(1 0 0)',
  primary: 'oklch(0.43 0.09 157)',
  primaryForeground: 'oklch(0.985 0.004 100)',
  secondary: 'oklch(0.95 0.018 100)',
  muted: 'oklch(0.955 0.01 100)',
  mutedForeground: 'oklch(0.53 0.025 157)',
  accent: 'oklch(0.94 0.025 91)',
  border: 'oklch(0.91 0.014 100)',
  destructive: 'oklch(0.58 0.19 27)',
  highlight: 'oklch(0.65 0.14 39)',
}
const COLOR_HELP: Record<ColorKey, string> = {
  background: 'page background',
  foreground: 'main text colour; must be readable on background, card, secondary and muted',
  card: 'raised surfaces such as task cards, menus and dialogs',
  primary: 'brand colour for buttons, links and the active sidebar item; also used as text so keep it dark on a light palette and light on a dark one',
  primaryForeground: 'text on top of primary',
  secondary: 'subtle surface for chips and the sidebar tint',
  muted: 'quiet surface for inputs and hover states',
  mutedForeground: 'secondary text such as captions',
  accent: 'soft highlight surface',
  border: 'hairline borders and dividers',
  destructive: 'errors and delete actions',
  highlight: 'warm accent for urgent items and the tip card',
}

const colorSetSchema = z.object(
  Object.fromEntries(COLOR_KEYS.map((key) => [key, z.string().describe(COLOR_HELP[key])])) as Record<ColorKey, z.ZodString>,
)

// Shape requested from the model. Constraints that the structured-output feature cannot express
// (colour syntax, ranges, lengths) are re-checked by `sanitizeTheme`.
export const ModelThemeSchema = z.object({
  name: z.string().describe('Short evocative theme name, 2-4 words'),
  description: z.string().describe('One sentence describing the mood, under 120 characters'),
  colors: colorSetSchema.describe('The palette. Light or dark, whichever suits the mood'),
  radius: z.number().describe('Base corner radius in rem, 0 (sharp) to 1.75 (very round)'),
  headingFont: z.enum(FONT_IDS).describe('Font for headings and the app name'),
  bodyFont: z.enum(FONT_IDS).describe('Font for body text; keep it legible'),
  headingTransform: z.enum(HEADING_TRANSFORMS).describe('Case of headings'),
  iconStrokeWidth: z.number().describe('Icon line weight from 1 (delicate) to 3 (bold), 2 is normal'),
  icons: z.object(
    Object.fromEntries(
      ICON_SLOT_KEYS.map((slot) => [slot, z.enum(ICON_NAMES).describe(`Icon for: ${ICON_SLOTS[slot].hint}`)]),
    ) as Record<IconSlot, z.ZodEnum<{ [K in IconName]: K }>>,
  ),
})

export class ThemeValidationError extends Error {}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null

function cleanText(value: unknown, max: number, fallback: string): string {
  if (typeof value !== 'string') return fallback
  // Keep printable text only; the result is rendered as React text, never as markup.
  const text = value.replace(/[\u0000-\u001f\u007f<>`]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
  return text || fallback
}

function clampNumber(value: unknown, range: { min: number; max: number; fallback: number }): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return range.fallback
  return Math.round(Math.min(range.max, Math.max(range.min, value)) * 100) / 100
}

type ParsedColors = Record<ColorKey, Oklch>

function parseColors(raw: unknown, defaults: ThemeColors, warnings: string[]): { colors: ParsedColors; invalid: number } {
  const source = asRecord(raw)
  if (!source) throw new ThemeValidationError('Missing colours')
  let invalid = 0
  const colors = {} as ParsedColors
  for (const key of COLOR_KEYS) {
    const parsed = parseColor(source[key])
    if (!parsed) {
      invalid++
      warnings.push(`Used the default ${key} colour`)
    }
    colors[key] = parsed ?? (parseColor(defaults[key]) as Oklch)
  }
  return { colors, invalid }
}

function enforceReadability(colors: ParsedColors, warnings: string[]): ThemeColors {
  const surfaces = [colors.background, colors.card]
  const adjust = (key: ColorKey, against: Oklch[]) => {
    const fixed = ensureContrast(colors[key], against, TARGET_CONTRAST)
    if (formatOklch(fixed) !== formatOklch(colors[key])) warnings.push(`Adjusted ${key} for readability`)
    colors[key] = fixed
  }
  adjust('foreground', [...surfaces, colors.secondary, colors.muted])
  adjust('mutedForeground', [...surfaces, colors.muted])
  adjust('primary', surfaces)
  adjust('primaryForeground', [colors.primary])
  adjust('destructive', surfaces)
  return Object.fromEntries(COLOR_KEYS.map((key) => [key, formatOklch(colors[key])])) as ThemeColors
}

// Validates untrusted input (model output or stored JSON) and returns a safe, readable theme.
// Fixable problems (unknown icon or font, out-of-range number, low contrast) are repaired and reported
// as warnings; structurally unusable input throws ThemeValidationError.
export function sanitizeTheme(raw: unknown): { theme: Theme; warnings: string[] } {
  const source = asRecord(raw)
  if (!source) throw new ThemeValidationError('Theme must be an object')
  const warnings: string[] = []

  const palette = parseColors(source.colors, DEFAULT_COLORS, warnings)
  if (palette.invalid > 3) throw new ThemeValidationError('Too many invalid colours')

  const iconSource = asRecord(source.icons) ?? {}
  const icons: Partial<Record<IconSlot, IconName>> = {}
  for (const slot of ICON_SLOT_KEYS) {
    const name = iconSource[slot]
    if (isIconName(name)) icons[slot] = name
    else if (name !== undefined) warnings.push(`Used the default icon for ${slot}`)
  }

  const theme: Theme = {
    name: cleanText(source.name, 40, 'Custom theme'),
    description: cleanText(source.description, 140, ''),
    colors: enforceReadability(palette.colors, warnings),
    radius: clampNumber(source.radius, RADIUS_RANGE),
    headingFont: isFontId(source.headingFont) ? source.headingFont : 'fraunces',
    bodyFont: isFontId(source.bodyFont) ? source.bodyFont : 'inter',
    headingTransform: HEADING_TRANSFORMS.find((value) => value === source.headingTransform) ?? 'none',
    iconStrokeWidth: clampNumber(source.iconStrokeWidth, STROKE_RANGE),
    icons,
  }
  return { theme, warnings }
}
