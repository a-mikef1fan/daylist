// Light or dark appearance, independent of the color theme in lib/themes.ts.
export type ColorMode = 'light' | 'dark' | 'system'

export const COLOR_MODE_STORAGE_KEY = 'daylist-color-mode'

export function isColorMode(value: unknown): value is ColorMode {
  return value === 'light' || value === 'dark' || value === 'system'
}

// Runs in <head> before first paint so dark mode never flashes the light colors.
// It mirrors the resolution logic in components/color-mode-provider.tsx; keep the two in sync.
export const COLOR_MODE_INIT_SCRIPT = `(function(){var m;try{m=localStorage.getItem(${JSON.stringify(COLOR_MODE_STORAGE_KEY)})}catch(e){}var d=m==='dark'||(m!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)})()`
