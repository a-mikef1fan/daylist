'use client'

import { useId } from 'react'
import { useCustomTheme } from '@/components/custom-theme-provider'
import { ANGLES, CANVAS_EFFECT_KINDS, CSS_EFFECT_KINDS, GLYPH_SETS, KIND_LABELS, PATTERN_KINDS, RANGES, SHAPES, cleanGlyph, isBackgroundKind, type Background, type BackgroundKind } from '@/lib/custom-theme/background'
import { toHex } from '@/lib/custom-theme/color'
import { colorHex, EDITABLE_COLORS, patchTheme, setColor } from '@/lib/custom-theme/edit'
import { FONT_IDS, FONTS, isFontId } from '@/lib/custom-theme/fonts'
import { ICON_PACK_IDS, ICON_PACKS, matchingIconPack } from '@/lib/custom-theme/icons'
import { BASE_THEME, PRESET_THEMES } from '@/lib/custom-theme/presets'
import { HEADING_TRANSFORMS, RADIUS_RANGE, STROKE_RANGE, type HeadingTransform, type Theme } from '@/lib/custom-theme/schema'

const FONT_OPTIONS = [...FONT_IDS].sort((a, b) => FONTS[a].family.localeCompare(FONTS[b].family))
const has = (kinds: readonly BackgroundKind[], kind: BackgroundKind) => kinds.includes(kind)
const SECOND_COLOR: BackgroundKind[] = ['stripes', 'checker', 'gradient', 'gradientShift', 'matrix', 'stars']
const USES_SIZE: BackgroundKind[] = [...PATTERN_KINDS, 'retroGrid']
const USES_THICKNESS: BackgroundKind[] = ['pinstripes', 'grid', 'dots', 'hatch', 'waves', 'noise', 'retroGrid']
const USES_ANGLE: BackgroundKind[] = ['pinstripes', 'stripes', 'gradient', 'gradientShift']
const ANIMATED: BackgroundKind[] = [...CSS_EFFECT_KINDS, ...CANVAS_EFFECT_KINDS]
const CASE_LABELS: Record<HeadingTransform, string> = { none: 'As written', uppercase: 'UPPERCASE', capitalize: 'Capitalize Each Word' }

export function ThemeCustomizer() {
  const { preview, active, saved, showPreview } = useCustomTheme()
  const id = useId()
  // Edits always start from what is on screen: the pending preview, the saved theme, or the classic look.
  const theme = preview ?? active ?? BASE_THEME
  const pack = matchingIconPack(theme.icons)
  const edit = (patch: Partial<Omit<Theme, 'colors'>>) => showPreview(patchTheme(theme, patch))
  const bg = theme.background
  const editBackground = (patch: Partial<Background>) => edit({ background: { ...bg, ...patch } })
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

      <fieldset className="theme-fieldset theme-background-controls">
        <legend>Background</legend>
        <label className="form-field">
          <span>Pattern or effect</span>
          <select value={bg.kind} onChange={(event) => isBackgroundKind(event.target.value) && editBackground({ kind: event.target.value })}>
            <option value="none">{KIND_LABELS.none}</option>
            <optgroup label="Patterns">
              {PATTERN_KINDS.map((kind) => <option key={kind} value={kind}>{KIND_LABELS[kind]}</option>)}
            </optgroup>
            <optgroup label="Animated">
              {ANIMATED.map((kind) => <option key={kind} value={kind}>{KIND_LABELS[kind]}</option>)}
            </optgroup>
          </select>
        </label>
        {bg.kind !== 'none' && (
          <>
            <div className="theme-color-grid">
              <label className="theme-color">
                <input type="color" value={toHex(bg.color)} onChange={(event) => editBackground({ color: event.target.value })} />
                <span>Colour</span>
              </label>
              {has(SECOND_COLOR, bg.kind) && (
                <label className="theme-color">
                  <input type="color" value={toHex(bg.color2)} onChange={(event) => editBackground({ color2: event.target.value })} />
                  <span>Second colour</span>
                </label>
              )}
            </div>
            <Slider label="Strength" value={bg.opacity} range={RANGES.opacity} step={0.01} onChange={(opacity) => editBackground({ opacity })} />
            {has(USES_SIZE, bg.kind) && <Slider label="Spacing" value={bg.size} range={RANGES.size} step={1} onChange={(size) => editBackground({ size })} />}
            {has(USES_THICKNESS, bg.kind) && <Slider label="Line or dot size" value={bg.thickness} range={RANGES.thickness} step={0.5} onChange={(thickness) => editBackground({ thickness })} />}
            {has(USES_ANGLE, bg.kind) && (
              <label className="form-field">
                <span>Direction</span>
                <select value={bg.angle} onChange={(event) => editBackground({ angle: Number(event.target.value) })}>
                  {ANGLES.map((angle) => <option key={angle} value={angle}>{angle === 90 ? 'Vertical' : angle === 0 ? 'Horizontal' : `Diagonal ${angle}°`}</option>)}
                </select>
              </label>
            )}
            {has(ANIMATED, bg.kind) && <Slider label="Speed" value={bg.speed} range={RANGES.speed} step={0.1} onChange={(speed) => editBackground({ speed })} />}
            {has(CANVAS_EFFECT_KINDS, bg.kind) && <Slider label="Amount" value={bg.density} range={RANGES.density} step={0.1} onChange={(density) => editBackground({ density })} />}
            {bg.kind === 'matrix' && (
              <label className="form-field">
                <span>Characters</span>
                <select value={bg.glyphs} onChange={(event) => editBackground({ glyphs: GLYPH_SETS.find((set) => set === event.target.value) ?? 'katakana' })}>
                  {GLYPH_SETS.map((set) => <option key={set} value={set}>{set}</option>)}
                </select>
              </label>
            )}
            {bg.kind === 'emoji' && (
              <div className="form-field">
                <label htmlFor={`${id}-emoji`}>Emoji or shape</label>
                <div className="theme-emoji-row">
                  <input id={`${id}-emoji`} value={bg.emoji} maxLength={8} onChange={(event) => editBackground({ emoji: cleanGlyph(event.target.value) })} />
                  {SHAPES.map((shape) => <button key={shape} type="button" className="theme-example" aria-label={`Use ${shape}`} onClick={() => editBackground({ emoji: shape })}>{shape}</button>)}
                </div>
              </div>
            )}
            <p className="theme-hint">Text colours adjust so they stay readable over the background. Animation pauses for visitors who prefer reduced motion.</p>
          </>
        )}
      </fieldset>
    </div>
  )
}

function Slider({ label, value, range, step, onChange }: { label: string; value: number; range: { min: number; max: number }; step: number; onChange: (value: number) => void }) {
  const id = useId()
  return (
    <div className="form-field">
      <label htmlFor={id}>{label} <output>{value}</output></label>
      <input id={id} type="range" min={range.min} max={range.max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  )
}
