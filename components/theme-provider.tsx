'use client'

import { createContext, useContext, useMemo, useSyncExternalStore } from 'react'
import { DEFAULT_THEME, THEME_STORAGE_KEY, isThemeId, type ThemeId } from '@/lib/themes'

type ThemeContextValue = { theme: ThemeId; setTheme: (theme: ThemeId) => void }

const ThemeContext = createContext<ThemeContextValue | null>(null)

// The data-theme attribute on <html> is the source of truth. The inline script in the
// root layout sets it before paint, so the server snapshot is only used during hydration.
function readTheme(): ThemeId {
  const value = document.documentElement.getAttribute('data-theme')
  return isThemeId(value) ? value : DEFAULT_THEME
}

function applyTheme(theme: ThemeId) {
  document.documentElement.setAttribute('data-theme', theme)
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  // Keep other open tabs in sync when the theme changes in one of them.
  function handleStorage(event: StorageEvent) {
    if (event.key === THEME_STORAGE_KEY && isThemeId(event.newValue)) applyTheme(event.newValue)
  }
  window.addEventListener('storage', handleStorage)
  return () => {
    observer.disconnect()
    window.removeEventListener('storage', handleStorage)
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, readTheme, () => DEFAULT_THEME)
  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme(next) {
        applyTheme(next)
        try {
          window.localStorage.setItem(THEME_STORAGE_KEY, next)
        } catch {
          // Storage can be unavailable (private mode, blocked cookies); the theme still applies for this visit.
        }
      },
    }),
    [theme],
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}
