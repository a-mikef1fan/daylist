'use client'

import { Check } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { THEMES } from '@/lib/themes'

export function ThemePicker() {
  const { theme, setTheme } = useTheme()

  return (
    <fieldset className="theme-picker">
      <legend>Color theme</legend>
      <div className="theme-options">
        {THEMES.map(({ id, label }) => (
          // data-theme scopes the theme's hues to this swatch so it previews its own colors.
          <label key={id} className="theme-option" data-theme={id}>
            <input type="radio" name="color-theme" value={id} checked={theme === id} onChange={() => setTheme(id)} />
            <span className="theme-swatch" aria-hidden="true"><i /><i /><i /><Check /></span>
            <span className="theme-name">{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
