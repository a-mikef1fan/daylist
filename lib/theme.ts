export const THEME_STORAGE_KEY = 'daylist:theme'
export const DEFAULT_THEME = 'sage'

// `swatch` is only used to paint the picker buttons; the real palette lives in app/themes.css.
export const THEMES = [
  { id: 'sage', label: 'Sage', swatch: 'oklch(0.43 0.09 157)' },
  { id: 'ocean', label: 'Ocean', swatch: 'oklch(0.46 0.12 240)' },
  { id: 'sunset', label: 'Sunset', swatch: 'oklch(0.53 0.15 45)' },
  { id: 'lavender', label: 'Lavender', swatch: 'oklch(0.46 0.13 295)' },
  { id: 'midnight', label: 'Midnight', swatch: 'oklch(0.2 0.03 260)' },
] as const

export type ThemeId = (typeof THEMES)[number]['id']

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((theme) => theme.id === value)
}

/**
 * Runs in <head> before first paint so the saved theme is applied without a flash.
 * The default theme is the absence of `data-theme`, so nothing is set for it.
 */
export const themeInitScript = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(/^(${THEMES.filter((theme) => theme.id !== DEFAULT_THEME)
  .map((theme) => theme.id)
  .join('|')})$/.test(t))document.documentElement.setAttribute('data-theme',t)}catch(e){}`

// A tiny external store over <html data-theme>, so every picker instance stays in sync
// and server rendering (which always sees the default theme) hydrates without mismatches.
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

function applyTheme(theme: ThemeId) {
  if (theme === DEFAULT_THEME) document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', theme)
}

export function getThemeSnapshot(): ThemeId {
  const current = document.documentElement.getAttribute('data-theme')
  return isThemeId(current) ? current : DEFAULT_THEME
}

export function getServerThemeSnapshot(): ThemeId {
  return DEFAULT_THEME
}

export function subscribeTheme(listener: () => void) {
  listeners.add(listener)
  // Keep other open tabs in sync.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return
    applyTheme(isThemeId(event.newValue) ? event.newValue : DEFAULT_THEME)
    emit()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function setTheme(theme: ThemeId) {
  applyTheme(theme)
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Storage can be unavailable (private mode, blocked cookies); the theme still applies for this visit.
  }
  emit()
}
