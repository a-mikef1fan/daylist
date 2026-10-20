'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Check, RotateCcw, Sparkles, Undo2 } from 'lucide-react'
import { useCustomTheme } from '@/components/custom-theme-provider'
import { FONTS } from '@/lib/custom-theme/fonts'
import { MAX_DESCRIPTION_LENGTH, sanitizeTheme, type Theme } from '@/lib/custom-theme/schema'

const EXAMPLES = [
  'Cozy autumn cabin with warm browns and a handwritten feel',
  'Midnight arcade with neon colours and a pixel font',
  'Calm ocean morning: soft blues, round and airy',
  'Elegant old library in deep green and gold',
]

function Swatches({ theme }: { theme: Theme }) {
  return (
    <div className="theme-swatch-row" aria-hidden="true">
      {(['background', 'card', 'primary', 'highlight'] as const).map((key) => (
        <i key={key} style={{ background: theme.colors[key] }} />
      ))}
    </div>
  )
}

export function ThemeStudio({ onDone }: { onDone: () => void }) {
  const { active, preview, saved, showPreview, keepPreview, discardPreview, activate, reset } = useCustomTheme()
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [adjusted, setAdjusted] = useState(false)
  const [pending, setPending] = useState(false)
  const mounted = useRef(true)
  const fieldId = useId()
  const hintId = useId()

  // An unsaved preview never outlives the dialog.
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      discardPreview()
    }
  }, [discardPreview])

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
      const body: { theme?: unknown; warnings?: unknown; error?: string } = await response.json().catch(() => ({}))
      if (!mounted.current) return
      if (!response.ok) {
        setError(body.error || 'Could not create a theme right now. Please try again.')
        return
      }
      // The server already validated the theme; check again before it touches the page.
      const { theme, warnings: found } = sanitizeTheme(body.theme)
      setAdjusted(found.some((message) => message.startsWith('Adjusted')))
      showPreview(theme)
    } catch {
      if (mounted.current) setError('Something went wrong. Check your connection and try again.')
    } finally {
      if (mounted.current) setPending(false)
    }
  }

  return (
    <div className="dialog-body theme-studio-body">
      <form className="auth-form theme-studio-form" onSubmit={handleGenerate}>
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
        <p className="theme-hint" id={hintId}>{description.length}/{MAX_DESCRIPTION_LENGTH} characters. Colours, fonts, corners and icons all change.</p>
        <div className="theme-examples" role="group" aria-label="Example descriptions">
          {EXAMPLES.map((example) => (
            <button key={example} type="button" className="theme-example" onClick={() => setDescription(example)}>{example}</button>
          ))}
        </div>
        <button className="auth-submit" type="submit" disabled={pending} aria-busy={pending}>
          <Sparkles aria-hidden="true" />{pending ? 'Designing your theme…' : 'Generate theme'}
        </button>
        <p className="form-error theme-error" role="alert">{error}</p>
      </form>

      <div aria-live="polite">
        {preview && (
          <section className="theme-preview" aria-label="Theme preview">
            <div>
              <strong>{preview.name}</strong>
              {preview.description && <p>{preview.description}</p>}
              <p className="theme-fonts">{FONTS[preview.headingFont].family} + {FONTS[preview.bodyFont].family}</p>
              {adjusted && <p className="theme-fonts">Some colours were adjusted to keep text readable.</p>}
            </div>
            <Swatches theme={preview} />
            <div className="dialog-actions">
              <button className="dialog-cancel" type="button" onClick={discardPreview}><Undo2 aria-hidden="true" /> Revert</button>
              <button className="auth-submit dialog-submit" type="button" onClick={keepPreview}><Check aria-hidden="true" /> Keep theme</button>
            </div>
          </section>
        )}
      </div>

      {saved.length > 0 && (
        <section aria-labelledby={`${fieldId}-saved`}>
          <h3 className="theme-saved-title" id={`${fieldId}-saved`}>Your themes</h3>
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

      <div className="dialog-actions theme-studio-footer">
        <button className="dialog-cancel" type="button" onClick={reset} disabled={!active && !preview}><RotateCcw aria-hidden="true" /> Reset to default</button>
        <button className="dialog-cancel" type="button" onClick={onDone}>Close</button>
      </div>
    </div>
  )
}
