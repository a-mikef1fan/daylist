'use client'

import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'

type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'theme'

const options: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light theme', Icon: Sun },
  { value: 'dark', label: 'Dark theme', Icon: Moon },
  { value: 'system', label: 'System theme', Icon: Monitor },
]

function readStoredTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {}
  return 'system'
}

function applyTheme(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

export function ThemeToggle() {
  // Start as "system" on both server and client so hydration matches; the real value is read after mount.
  const [theme, setTheme] = useState<Theme>('system')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setTheme(readStoredTheme())
    setMounted(true)

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => applyTheme(readStoredTheme())
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        setTheme(readStoredTheme())
        sync()
      }
    }
    media.addEventListener('change', sync)
    window.addEventListener('storage', onStorage)
    return () => {
      media.removeEventListener('change', sync)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  function choose(next: Theme) {
    setTheme(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {}
    applyTheme(next)
  }

  return (
    <div className="theme-toggle" role="group" aria-label="Color theme">
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          className="theme-toggle-option"
          aria-label={label}
          aria-pressed={mounted && theme === value}
          title={label}
          onClick={() => choose(value)}
        >
          <Icon aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}
