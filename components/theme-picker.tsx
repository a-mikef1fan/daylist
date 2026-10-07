'use client'

import { useId, useSyncExternalStore } from 'react'
import { Check } from 'lucide-react'
import {
  THEMES,
  getServerThemeSnapshot,
  getThemeSnapshot,
  isThemeId,
  setTheme,
  subscribeTheme,
} from '@/lib/theme'

export function ThemePicker({ className = '' }: { className?: string }) {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerThemeSnapshot)
  const name = useId()

  return (
    <div className={`theme-picker ${className}`.trim()} role="radiogroup" aria-label="Color theme">
      {THEMES.map(({ id, label, swatch }) => (
        <label key={id} className="theme-option" title={label}>
          <input
            className="theme-input"
            type="radio"
            name={name}
            value={id}
            checked={theme === id}
            onChange={(event) => {
              if (isThemeId(event.target.value)) setTheme(event.target.value)
            }}
          />
          <span className="theme-swatch" data-theme-swatch={id} style={{ background: swatch }} aria-hidden="true">
            <Check />
          </span>
          <span className="sr-only">{label}</span>
        </label>
      ))}
    </div>
  )
}
