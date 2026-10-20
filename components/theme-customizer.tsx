'use client'

import { useId } from 'react'
import { useCustomTheme } from '@/components/custom-theme-provider'
import { colorHex, EDITABLE_COLORS, patchTheme, setColor } from '@/lib/custom-theme/edit'
import { FONT_IDS, FONTS, isFontId } from '@/lib/custom-theme/fonts'
import { ICON_PACK_IDS, ICON_PACKS, matchingIconPack } from '@/lib/custom-theme/icons'
import { BASE_THEME, PRESET_THEMES } from '@/lib/custom-theme/presets'
import { HEADING_TRANSFORMS, RADIUS_RANGE, STROKE_RANGE, type HeadingTransform, type Theme } from '@/lib/custom-theme/schema'

const FONT_OPTIONS = [...FONT_IDS].sort((a, b) => FONTS[a].family.localeCompare(FONTS[b].family))
const CASE_LABELS: Record<HeadingTransform, string> = { none: 'As written', uppercase: 'UPPERCASE', capitalize: 'Capitalize Each Word' }

export function ThemeCustomizer() {
  const { preview, active, saved, showPreview } = useCustomTheme()
  const id = useId()
  // Edits always start from what is on screen: the pending preview, the saved theme, or the classic look.
  const theme = preview ?? active ?? BASE_THEME
  const pack = matchingIconPack(theme.icons)
  const edit = (patch: Partial<Omit<Theme, 'colors'>>) => showPreview(patchTheme(theme, patch))
  const starts = [...PRESET_THEMES, ...saved.filter((item) => !PRESET_THEMES.some((preset) => preset.name === item.name))]

  return (
    <div className="theme-tab-body theme-customizer">
      <label className="form-field">
        <span>Start from</span>
        <select value="" onChange={(event) => { const start = event.target.value === 'base' ? BASE_THEME : starts.find((item) => item.name === event.target.value); if (start) showPreview(start) }}>
          <option value="">{theme.name} (current)</option>
          <option value="base">{BASE_THEME.name} (classic)</option>
          {starts.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
        </select>
      </label>

      <label className="form-field">
        <span>Theme name</span>
        <input value={theme.name} maxLength={40} onChange={(event) => edit({ name: event.target.value })} />
      </label>

      <fieldset className="theme-fieldset">
        <legend>Colours</legend>
        <div className="theme-color-grid">
          {EDITABLE_COLORS.map(({ key, label }) => (
            <label className="theme-color" key={key}>
              <input type="color" value={colorHex(theme, key)} onChange={(event) => showPreview(setColor(theme, key, event.target.value))} />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <p className="theme-hint">Text colours adjust automatically so they stay readable.</p>
      </fieldset>

      <div className="theme-two-col">
        <label className="form-field">
          <span>Heading font</span>
          <select value={theme.headingFont} onChange={(event) => isFontId(event.target.value) && edit({ headingFont: event.target.value })}>
            {FONT_OPTIONS.map((font) => <option key={font} value={font}>{FONTS[font].family}</option>)}
          </select>
        </label>
        <label className="form-field">
          <span>Body font</span>
          <select value={theme.bodyFont} onChange={(event) => isFontId(event.target.value) && edit({ bodyFont: event.target.value })}>
            {FONT_OPTIONS.map((font) => <option key={font} value={font}>{FONTS[font].family}</option>)}
          </select>
        </label>
      </div>

      <label className="form-field">
        <span>Heading case</span>
        <select value={theme.headingTransform} onChange={(event) => edit({ headingTransform: HEADING_TRANSFORMS.find((value) => value === event.target.value) ?? 'none' })}>
          {HEADING_TRANSFORMS.map((value) => <option key={value} value={value}>{CASE_LABELS[value]}</option>)}
        </select>
      </label>

      <div className="theme-two-col">
        <div className="form-field">
          <label htmlFor={`${id}-radius`}>Corner roundness <output>{theme.radius}</output></label>
          <input id={`${id}-radius`} type="range" min={RADIUS_RANGE.min} max={RADIUS_RANGE.max} step={0.05} value={theme.radius} onChange={(event) => edit({ radius: Number(event.target.value) })} />
        </div>
        <div className="form-field">
          <label htmlFor={`${id}-stroke`}>Icon weight <output>{theme.iconStrokeWidth}</output></label>
          <input id={`${id}-stroke`} type="range" min={STROKE_RANGE.min} max={STROKE_RANGE.max} step={0.25} value={theme.iconStrokeWidth} onChange={(event) => edit({ iconStrokeWidth: Number(event.target.value) })} />
        </div>
      </div>

      <label className="form-field">
        <span>Icon set</span>
        <select value={pack ?? 'custom'} onChange={(event) => { const next = ICON_PACK_IDS.find((value) => value === event.target.value); if (next) edit({ icons: ICON_PACKS[next].slots }) }}>
          {pack === null && <option value="custom" disabled>Custom mix</option>}
          {ICON_PACK_IDS.map((value) => <option key={value} value={value}>{ICON_PACKS[value].label}</option>)}
        </select>
      </label>
    </div>
  )
}
