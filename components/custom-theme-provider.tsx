'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ThemeBackground } from '@/components/theme-background'
import { applyCustomTheme, loadActiveTheme, loadSavedThemes, MAX_SAVED_THEMES, storeActiveTheme, storeSavedThemes } from '@/lib/custom-theme/browser'
import type { Theme } from '@/lib/custom-theme/schema'

type CustomThemeContextValue = {
  /** The saved theme, or null when the built-in look (plus any colour theme from User preferences) is in use. */
  active: Theme | null
  /** An unsaved candidate that is applied to the whole app until it is kept or discarded. */
  preview: Theme | null
  /** Whatever is currently on screen: the preview if there is one, otherwise the active theme. */
  shown: Theme | null
  saved: Theme[]
  showPreview: (theme: Theme) => void
  keepPreview: () => void
  discardPreview: () => void
  activate: (theme: Theme) => void
  reset: () => void
}

const noop = () => {}
const CustomThemeContext = createContext<CustomThemeContextValue>({
  active: null,
  preview: null,
  shown: null,
  saved: [],
  showPreview: noop,
  keepPreview: noop,
  discardPreview: noop,
  activate: noop,
  reset: noop,
})

export const useCustomTheme = () => useContext(CustomThemeContext)

export function CustomThemeProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<Theme | null>(null)
  const [preview, setPreview] = useState<Theme | null>(null)
  const [saved, setSaved] = useState<Theme[]>([])
  const [ready, setReady] = useState(false)

  // Restore after mount so server and client markup match on hydration. The inline script in layout.tsx has
  // already painted the stored theme; this re-validates it and recompiles from the sanitised data.
  useEffect(() => {
    setActive(loadActiveTheme())
    setSaved(loadSavedThemes())
    setReady(true)
  }, [])

  const shown = preview ?? active

  useEffect(() => {
    if (ready) applyCustomTheme(shown)
  }, [ready, shown])

  const remember = useCallback((theme: Theme) => {
    setSaved((current) => {
      const next = [theme, ...current.filter((item) => item.name !== theme.name)].slice(0, MAX_SAVED_THEMES)
      storeSavedThemes(next)
      return next
    })
  }, [])

  const activate = useCallback((theme: Theme) => {
    setActive(theme)
    setPreview(null)
    storeActiveTheme(theme)
    remember(theme)
  }, [remember])

  const discardPreview = useCallback(() => setPreview(null), [])

  const reset = useCallback(() => {
    setActive(null)
    setPreview(null)
    storeActiveTheme(null)
  }, [])

  // Choosing a colour theme in User preferences (data-theme on <html>) replaces the custom theme.
  useEffect(() => {
    const observer = new MutationObserver(reset)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [reset])

  const value = useMemo<CustomThemeContextValue>(
    () => ({
      active,
      preview,
      shown,
      saved,
      showPreview: setPreview,
      keepPreview: () => preview && activate(preview),
      discardPreview,
      activate,
      reset,
    }),
    [active, preview, shown, saved, activate, discardPreview, reset],
  )

  return (
    <CustomThemeContext.Provider value={value}>
      <ThemeBackground />
      {children}
    </CustomThemeContext.Provider>
  )
}
