'use client'

import { Check } from 'lucide-react'
import { useCustomTheme } from '@/components/custom-theme-provider'
import { Swatches } from '@/components/theme-swatches'
import { FONTS } from '@/lib/custom-theme/fonts'
import { PRESET_THEMES } from '@/lib/custom-theme/presets'

export function ThemePresets() {
  const { shown, saved, showPreview, activate, active, preview } = useCustomTheme()

  return (
    <div className="theme-tab-body">
      <p className="theme-hint">Pick a look to try it on the whole app. Nothing is saved until you keep it.</p>
      <ul className="theme-preset-grid">
        {PRESET_THEMES.map((preset) => {
          const selected = shown?.name === preset.name
          return (
            <li key={preset.name}>
              {/* Inline colours come from the sanitised preset so each card previews its own palette. */}
              <button
                type="button"
                className="theme-preset"
                aria-pressed={selected}
                onClick={() => showPreview(preset)}
                style={{ background: preset.colors.background, color: preset.colors.foreground, borderColor: selected ? preset.colors.primary : preset.colors.border }}
              >
                <span className="theme-preset-top">
                  <strong>{preset.name}</strong>
                  {selected && <Check aria-label="Selected" style={{ color: preset.colors.primary }} />}
                </span>
                <span className="theme-preset-bar" aria-hidden="true">
                  <i style={{ background: preset.colors.primary, flex: 3 }} />
                  <i style={{ background: preset.colors.card, flex: 2, boxShadow: `inset 0 0 0 1px ${preset.colors.border}` }} />
                  <i style={{ background: preset.colors.highlight, flex: 1 }} />
                  <i style={{ background: preset.colors.accent, flex: 1 }} />
                </span>
                <span className="theme-preset-fonts">{FONTS[preset.headingFont].family}</span>
              </button>
            </li>
          )
        })}
      </ul>

      {saved.length > 0 && (
        <section aria-labelledby="theme-saved-title">
          <h3 className="theme-saved-title" id="theme-saved-title">Your themes</h3>
          <ul className="theme-saved">
            {saved.map((theme) => (
              <li key={theme.name}>
                <button type="button" className="theme-saved-item" onClick={() => activate(theme)} aria-pressed={active?.name === theme.name && !preview}>
                  <Swatches theme={theme} />
                  <span>{theme.name}</span>
                  {active?.name === theme.name && !preview && <Check aria-label="Active" />}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
