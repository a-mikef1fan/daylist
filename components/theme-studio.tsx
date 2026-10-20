'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Check, RotateCcw, Sparkles, Undo2 } from 'lucide-react'
import { useCustomTheme } from '@/components/custom-theme-provider'
import { ThemeCustomizer } from '@/components/theme-customizer'
import { ThemePresets } from '@/components/theme-presets'
import { Swatches } from '@/components/theme-swatches'
import { FONTS } from '@/lib/custom-theme/fonts'
import { MAX_DESCRIPTION_LENGTH, sanitizeTheme } from '@/lib/custom-theme/schema'

const EXAMPLES = [
  'Cozy autumn cabin with warm browns and a handwritten feel',
  'Midnight arcade with neon colours and a pixel font',
  'Calm ocean morning: soft blues, round and airy',
  'Elegant old library in deep green and gold',
]

const TABS = [
  { id: 'presets', label: 'Presets' },
  { id: 'customize', label: 'Customize' },
  { id: 'describe', label: 'Describe' },
] as const
type TabId = (typeof TABS)[number]['id']

function DescribeTab() {
  const { showPreview } = useCustomTheme()
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [adjusted, setAdjusted] = useState(false)
  const [pending, setPending] = useState(false)
  const mounted = useRef(true)
  const fieldId = useId()
  const hintId = useId()

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  async function handleGenerate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = description.trim()
    if (text.length < 3) {
      setError('Describe the theme you would like.')
      return
    }
    setError('')
    setPending(true)
    try {
      const response = await fetch('/api/theme/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ description: text }),
      })
      const body: { theme?: unknown; error?: string } = await response.json().catch(() => ({}))
      if (!mounted.current) return
      if (!response.ok) {
        setError(body.error || 'Could not create a theme right now. Please try again.')
        return
      }
      // The server already validated the theme; check again before it touches the page.
      const { theme, warnings } = sanitizeTheme(body.theme)
      setAdjusted(warnings.some((message) => message.startsWith('Adjusted')))
      showPreview(theme)
    } catch {
      if (mounted.current) setError('Something went wrong. Check your connection and try again.')
    } finally {
      if (mounted.current) setPending(false)
    }
  }

  return (
    <form className="auth-form theme-studio-form theme-tab-body" onSubmit={handleGenerate}>
      <label className="form-field" htmlFor={fieldId}>
        <span>Describe your theme</span>
        <textarea
          id={fieldId}
          aria-describedby={hintId}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={MAX_DESCRIPTION_LENGTH}
          rows={3}
          placeholder="e.g. cozy autumn cabin with warm browns and a handwritten feel"
        />
      </label>
      <p className="theme-hint" id={hintId}>{description.length}/{MAX_DESCRIPTION_LENGTH} characters. Claude designs the colours, fonts, corners and icons.</p>
      <div className="theme-examples" role="group" aria-label="Example descriptions">
        {EXAMPLES.map((example) => (
          <button key={example} type="button" className="theme-example" onClick={() => setDescription(example)}>{example}</button>
        ))}
      </div>
      <button className="auth-submit" type="submit" disabled={pending} aria-busy={pending}>
        <Sparkles aria-hidden="true" />{pending ? 'Designing your theme…' : 'Generate theme'}
      </button>
      <p className="form-error theme-error" role="alert">{error}</p>
      {adjusted && <p className="theme-hint">Some colours were adjusted to keep text readable.</p>}
    </form>
  )
}

export function ThemeStudio({ onDone }: { onDone: () => void }) {
  const { active, preview, keepPreview, discardPreview, reset } = useCustomTheme()
  const [tab, setTab] = useState<TabId>('presets')
  const tabsId = useId()

  // An unsaved preview never outlives the dialog.
  useEffect(() => discardPreview, [discardPreview])

  function handleTabKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (!offset) return
    event.preventDefault()
    const next = TABS[(TABS.findIndex((item) => item.id === tab) + offset + TABS.length) % TABS.length]
    setTab(next.id)
    document.getElementById(`${tabsId}-${next.id}`)?.focus()
  }

  return (
    <div className="dialog-body theme-studio-body">
      <div className="theme-tabs" role="tablist" aria-label="Theme options" onKeyDown={handleTabKeyDown}>
        {TABS.map(({ id, label }) => (
          <button key={id} id={`${tabsId}-${id}`} type="button" role="tab" aria-selected={tab === id} aria-controls={`${tabsId}-panel`} tabIndex={tab === id ? 0 : -1} className="theme-tab" onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      <div className="theme-tab-panel" role="tabpanel" id={`${tabsId}-panel`} aria-labelledby={`${tabsId}-${tab}`}>
        {tab === 'presets' && <ThemePresets />}
        {tab === 'customize' && <ThemeCustomizer />}
        {tab === 'describe' && <DescribeTab />}
      </div>

      <div className="theme-studio-footer-stack" aria-live="polite">
        {preview && (
          <section className="theme-preview" aria-label="Theme preview">
            <div className="theme-preview-head">
              <div>
                <strong>{preview.name}</strong>
                <p className="theme-fonts">Previewing, not saved yet · {FONTS[preview.headingFont].family} + {FONTS[preview.bodyFont].family}</p>
              </div>
              <Swatches theme={preview} />
            </div>
            <div className="dialog-actions">
              <button className="dialog-cancel" type="button" onClick={discardPreview}><Undo2 aria-hidden="true" /> Revert</button>
              <button className="auth-submit dialog-submit" type="button" onClick={keepPreview}><Check aria-hidden="true" /> Keep theme</button>
            </div>
          </section>
        )}
        <div className="dialog-actions theme-studio-footer">
          <button className="dialog-cancel" type="button" onClick={reset} disabled={!active && !preview}><RotateCcw aria-hidden="true" /> Reset to default</button>
          <button className="dialog-cancel" type="button" onClick={onDone}>Close</button>
        </div>
      </div>
    </div>
  )
}
