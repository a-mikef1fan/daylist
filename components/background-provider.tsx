'use client'

import { createContext, useContext, useMemo, useSyncExternalStore } from 'react'
import { BACKGROUND_STORAGE_KEY, NO_BACKGROUND, isBackgroundId, type BackgroundId } from '@/lib/backgrounds'

type BackgroundContextValue = { background: BackgroundId; setBackground: (background: BackgroundId) => void }

const BackgroundContext = createContext<BackgroundContextValue | null>(null)

// The data-background attribute on <html> is the source of truth, and it is absent for "none". The
// inline script in the root layout sets it before paint (including the random first-visit pick), so the
// server snapshot is only used during hydration.
function readBackground(): BackgroundId {
  const value = document.documentElement.getAttribute('data-background')
  return isBackgroundId(value) ? value : NO_BACKGROUND
}

function applyBackground(background: BackgroundId) {
  if (background === NO_BACKGROUND) document.documentElement.removeAttribute('data-background')
  else document.documentElement.setAttribute('data-background', background)
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-background'] })
  // Keep other open tabs in sync when the background changes in one of them.
  function handleStorage(event: StorageEvent) {
    if (event.key === BACKGROUND_STORAGE_KEY && isBackgroundId(event.newValue)) applyBackground(event.newValue)
  }
  window.addEventListener('storage', handleStorage)
  return () => {
    observer.disconnect()
    window.removeEventListener('storage', handleStorage)
  }
}

export function BackgroundProvider({ children }: { children: React.ReactNode }) {
  const background = useSyncExternalStore(subscribe, readBackground, () => NO_BACKGROUND)
  const value = useMemo<BackgroundContextValue>(
    () => ({
      background,
      setBackground(next) {
        applyBackground(next)
        try {
          window.localStorage.setItem(BACKGROUND_STORAGE_KEY, next)
        } catch {
          // Storage can be unavailable (private mode, blocked cookies); the background still applies for this visit.
        }
      },
    }),
    [background],
  )
  return <BackgroundContext.Provider value={value}>{children}</BackgroundContext.Provider>
}

export function useBackground() {
  const context = useContext(BackgroundContext)
  if (!context) throw new Error('useBackground must be used within a BackgroundProvider')
  return context
}
