import { compileTheme, THEME_ATTRIBUTE, THEME_COMPILED_STORAGE_KEY, THEME_FONTS_ID, THEME_SAVED_STORAGE_KEY, THEME_STORAGE_KEY, THEME_STYLE_ID } from './css'
import { sanitizeTheme, type Theme } from './schema'

// Browser-only helpers: apply a theme to <html> and persist it in localStorage.

export const MAX_SAVED_THEMES = 8

export function applyCustomTheme(theme: Theme | null) {
  const root = document.documentElement
  const style = document.getElementById(THEME_STYLE_ID)
  const fonts = document.getElementById(THEME_FONTS_ID)
  if (!theme) {
    style?.remove()
    fonts?.remove()
    root.removeAttribute(THEME_ATTRIBUTE)
    return
  }
  const compiled = compileTheme(theme)
  const styleEl = style ?? Object.assign(document.createElement('style'), { id: THEME_STYLE_ID })
  styleEl.textContent = compiled.css
  if (!styleEl.isConnected) document.head.appendChild(styleEl)
  root.setAttribute(THEME_ATTRIBUTE, 'on')
  if (compiled.fontsHref) {
    const link = (fonts as HTMLLinkElement | null) ?? Object.assign(document.createElement('link'), { id: THEME_FONTS_ID, rel: 'stylesheet' })
    if (link.getAttribute('href') !== compiled.fontsHref) link.href = compiled.fontsHref
    if (!link.isConnected) document.head.appendChild(link)
  } else {
    fonts?.remove()
  }
}

function readTheme(value: unknown): Theme | null {
  try {
    return sanitizeTheme(value).theme
  } catch {
    return null
  }
}

function readJson(key: string): unknown {
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? 'null')
  } catch {
    // Storage can be unavailable (private mode, blocked cookies) or hold invalid JSON; treat as empty.
    return null
  }
}

export function loadActiveTheme(): Theme | null {
  return readTheme(readJson(THEME_STORAGE_KEY))
}

export function loadSavedThemes(): Theme[] {
  const stored = readJson(THEME_SAVED_STORAGE_KEY)
  return Array.isArray(stored) ? stored.map(readTheme).filter((theme): theme is Theme => theme !== null).slice(0, MAX_SAVED_THEMES) : []
}

function write(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, value)
  } catch {
    // Ignore storage failures; the theme still applies for this visit.
  }
}

export function storeActiveTheme(theme: Theme | null) {
  write(THEME_STORAGE_KEY, theme ? JSON.stringify(theme) : null)
  write(THEME_COMPILED_STORAGE_KEY, theme ? JSON.stringify(compileTheme(theme)) : null)
}

export function storeSavedThemes(themes: Theme[]) {
  write(THEME_SAVED_STORAGE_KEY, JSON.stringify(themes.slice(0, MAX_SAVED_THEMES)))
}
