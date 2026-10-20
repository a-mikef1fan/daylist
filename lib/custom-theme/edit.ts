import { formatOklch, parseColor, toHex, type Oklch } from './color'
import { sanitizeTheme, type ColorKey, type Theme, type ThemeColors } from './schema'

// Helpers for the Customize tab. Every edit goes back through sanitizeTheme, so contrast repair still applies.

// Colours the user edits directly. Changing one of RETUNING also re-derives the quiet surfaces.
export const EDITABLE_COLORS: { key: ColorKey; label: string }[] = [
  { key: 'background', label: 'Background' },
  { key: 'card', label: 'Cards' },
  { key: 'foreground', label: 'Text' },
  { key: 'primary', label: 'Primary' },
  { key: 'primaryForeground', label: 'Text on primary' },
  { key: 'highlight', label: 'Highlight' },
]
const RETUNING: ColorKey[] = ['background', 'foreground', 'primary']

// Secondary, muted, accent, border and caption text follow the main colours so edits stay coherent.
function quietSurfaces(colors: ThemeColors): Partial<ThemeColors> {
  const bg = parseColor(colors.background) as Oklch
  const fg = parseColor(colors.foreground) as Oklch
  const primary = parseColor(colors.primary) as Oklch
  const step = bg.l > 0.5 ? -1 : 1
  const surface = (distance: number, chroma: number, hue = bg.h): string =>
    formatOklch({ l: bg.l + step * distance, c: Math.max(bg.c, chroma), h: hue })
  return {
    secondary: surface(0.035, 0.02),
    muted: surface(0.03, 0.012),
    accent: surface(0.065, 0.045, primary.h),
    border: surface(0.075, 0.025),
    mutedForeground: formatOklch({ l: fg.l - step * 0.24, c: Math.max(0.02, fg.c), h: fg.h }),
  }
}

export function setColor(theme: Theme, key: ColorKey, hex: string): Theme {
  const colors: ThemeColors = { ...theme.colors, [key]: hex }
  const next = RETUNING.includes(key) ? { ...colors, ...quietSurfaces(colors) } : colors
  return sanitizeTheme({ ...theme, colors: next }).theme
}

export function patchTheme(theme: Theme, patch: Partial<Omit<Theme, 'colors'>>): Theme {
  return sanitizeTheme({ ...theme, ...patch }).theme
}

export const colorHex = (theme: Theme, key: ColorKey) => toHex(theme.colors[key])
