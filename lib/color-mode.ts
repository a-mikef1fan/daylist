// Light / dark / system mode. The accent palette is separate: it lives in lib/themes.ts and
// app/themes.css and is applied through `data-theme`, so any palette works in either mode.
export type ThemeMode = 'light' | 'dark' | 'system'

export const THEME_MODES: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

export const THEME_MODE_STORAGE_KEY = 'daylist:theme-mode'

export const DEFAULT_THEME_MODE: ThemeMode = 'light'

export function isThemeMode(value: unknown): value is ThemeMode {
  return THEME_MODES.some((mode) => mode.value === value)
}

export function readStoredMode(): ThemeMode {
  try {
    const mode = window.localStorage.getItem(THEME_MODE_STORAGE_KEY)
    return isThemeMode(mode) ? mode : DEFAULT_THEME_MODE
  } catch {
    // Storage can be unavailable (private mode, blocked cookies); fall back to the default.
    return DEFAULT_THEME_MODE
  }
}

export function applyMode(mode: ThemeMode) {
  const dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

export function saveMode(mode: ThemeMode) {
  try {
    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, mode)
  } catch {
    // Ignore storage failures; the mode still applies for this visit.
  }
}

// Inline script run in <head> so the saved mode is applied before first paint. Keep in sync with applyMode.
export const MODE_INIT_SCRIPT = `(function(){var m;try{m=localStorage.getItem(${JSON.stringify(THEME_MODE_STORAGE_KEY)})}catch(e){}if(m==='dark'||(m==='system'&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')})()`
