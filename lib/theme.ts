export type ThemeMode = 'light' | 'dark' | 'system'

export const THEME_MODES: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

// `swatch` previews the accent in the menu; the real palette lives in globals.css under [data-palette].
export const THEME_PALETTES = [
  { value: 'sage', label: 'Sage', swatch: 'oklch(0.62 0.09 157)' },
  { value: 'ocean', label: 'Ocean', swatch: 'oklch(0.62 0.1 235)' },
  { value: 'violet', label: 'Violet', swatch: 'oklch(0.62 0.13 295)' },
  { value: 'rose', label: 'Rose', swatch: 'oklch(0.62 0.14 10)' },
  { value: 'amber', label: 'Amber', swatch: 'oklch(0.62 0.1 65)' },
] as const

export type ThemePalette = (typeof THEME_PALETTES)[number]['value']

export const THEME_MODE_STORAGE_KEY = 'daylist:theme-mode'
export const THEME_PALETTE_STORAGE_KEY = 'daylist:theme-palette'

export const DEFAULT_THEME_MODE: ThemeMode = 'light'
export const DEFAULT_THEME_PALETTE: ThemePalette = 'sage'

export function isThemeMode(value: unknown): value is ThemeMode {
  return THEME_MODES.some((mode) => mode.value === value)
}

export function isThemePalette(value: unknown): value is ThemePalette {
  return THEME_PALETTES.some((palette) => palette.value === value)
}

export function readStoredTheme(): { mode: ThemeMode; palette: ThemePalette } {
  try {
    const mode = window.localStorage.getItem(THEME_MODE_STORAGE_KEY)
    const palette = window.localStorage.getItem(THEME_PALETTE_STORAGE_KEY)
    return {
      mode: isThemeMode(mode) ? mode : DEFAULT_THEME_MODE,
      palette: isThemePalette(palette) ? palette : DEFAULT_THEME_PALETTE,
    }
  } catch {
    // Storage can be unavailable (private mode, blocked cookies); fall back to the defaults.
    return { mode: DEFAULT_THEME_MODE, palette: DEFAULT_THEME_PALETTE }
  }
}

export function applyTheme(mode: ThemeMode, palette: ThemePalette) {
  const root = document.documentElement
  const dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  root.classList.toggle('dark', dark)
  root.dataset.palette = palette
}

export function saveTheme(mode: ThemeMode, palette: ThemePalette) {
  try {
    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, mode)
    window.localStorage.setItem(THEME_PALETTE_STORAGE_KEY, palette)
  } catch {
    // Ignore storage failures; the theme still applies for this visit.
  }
}

// Inline script run in <head> so the saved theme is applied before first paint. Keep in sync with applyTheme.
export const THEME_INIT_SCRIPT = `(function(){var d=document.documentElement,m,p;try{m=localStorage.getItem(${JSON.stringify(THEME_MODE_STORAGE_KEY)});p=localStorage.getItem(${JSON.stringify(THEME_PALETTE_STORAGE_KEY)})}catch(e){}if(m==='dark'||(m==='system'&&matchMedia('(prefers-color-scheme: dark)').matches))d.classList.add('dark');d.dataset.palette=${JSON.stringify(THEME_PALETTES.map((palette) => palette.value))}.indexOf(p)>-1?p:${JSON.stringify(DEFAULT_THEME_PALETTE)}})()`
