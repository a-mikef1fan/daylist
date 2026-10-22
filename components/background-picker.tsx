'use client'

import { Check, ImageOff } from 'lucide-react'
import { useBackground } from '@/components/background-provider'
import { BACKGROUNDS } from '@/lib/backgrounds'

export function BackgroundPicker() {
  const { background, setBackground } = useBackground()

  return (
    <fieldset className="background-picker">
      <legend>Background</legend>
      <div className="background-options">
        {BACKGROUNDS.map(({ id, label }) => (
          // data-background scopes the scene to this swatch so it previews its own art.
          <label key={id} className="background-option" data-background={id}>
            <input type="radio" name="background" value={id} checked={background === id} onChange={() => setBackground(id)} />
            <span className="background-swatch" aria-hidden="true">{id === 'none' && <ImageOff />}<Check className="background-check" /></span>
            <span className="background-name">{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
