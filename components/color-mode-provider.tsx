'use client'

import { createContext, useContext, useLayoutEffect, useMemo, useSyncExternalStore } from 'react'
import { COLOR_MODE_STORAGE_KEY, isColorMode, type ColorMode } from '@/lib/color-mode'

type ColorModeContextValue = {
  mode: ColorMode
  resolvedMode: 'light' | 'dark'
  setMode: (mode: ColorMode) => void
}

const ColorModeContext = createContext<ColorModeContextValue | null>(null)

const DARK_QUERY = '(prefers-color-scheme: dark)'
const listeners = new Set<() => void>()
// Keeps the choice for this visit if localStorage is unavailable.
let memoryMode: ColorMode | null = null

function readMode(): ColorMode {
  try {
    const saved = window.localStorage.getItem(COLOR_MODE_STORAGE_KEY)
    if (isColorMode(saved)) return saved
  } catch {
    // Storage can be unavailable; fall back to the in-memory choice.
  }
  return memoryMode ?? 'system'
}

function readSystemDark() {
  return window.matchMedia(DARK_QUERY).matches
}

function subscribe(onChange: () => void) {
  const query = window.matchMedia(DARK_QUERY)
  // Keep other open tabs in sync when the mode changes in one of them.
  function handleStorage(event: StorageEvent) {
    if (event.key === null || event.key === COLOR_MODE_STORAGE_KEY) onChange()
  }
  listeners.add(onChange)
  query.addEventListener('change', onChange)
  window.addEventListener('storage', handleStorage)
  return () => {
    listeners.delete(onChange)
    query.removeEventListener('change', onChange)
    window.removeEventListener('storage', handleStorage)
  }
}

function setMode(mode: ColorMode) {
  memoryMode = mode
  try {
    window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode)
  } catch {
    // Storage can be unavailable (private mode, blocked cookies); the mode still applies for this visit.
  }
  listeners.forEach((listener) => listener())
}

export function ColorModeProvider({ children }: { children: React.ReactNode }) {
  // The server can't know either value; the inline script in <head> covers the first paint.
  const mode = useSyncExternalStore(subscribe, readMode, () => 'system' as const)
  const systemDark = useSyncExternalStore(subscribe, readSystemDark, () => false)
  const resolvedMode = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode

  // A layout effect runs before children's effects, so canvases redraw with the new colors.
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedMode === 'dark')
  }, [resolvedMode])

  const value = useMemo(() => ({ mode, resolvedMode, setMode }), [mode, resolvedMode])
  return <ColorModeContext.Provider value={value}>{children}</ColorModeContext.Provider>
}

export function useColorMode() {
  const context = useContext(ColorModeContext)
  if (!context) throw new Error('useColorMode must be used within a ColorModeProvider')
  return context
}
