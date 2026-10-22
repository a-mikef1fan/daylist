'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { useColorMode } from '@/components/color-mode-provider'
import type { ColorMode } from '@/lib/color-mode'

const order: ColorMode[] = ['light', 'dark', 'system']
const labels: Record<ColorMode, string> = { light: 'Light', dark: 'Dark', system: 'System' }
const icons = { light: Sun, dark: Moon, system: Monitor }

// One button that cycles light, dark, then system; the icon shows the current choice.
export function ColorModeToggle() {
  const { mode, setMode } = useColorMode()
  const next = order[(order.indexOf(mode) + 1) % order.length]
  const Icon = icons[mode]
  const label = `Appearance: ${labels[mode]}. Switch to ${labels[next].toLowerCase()}.`

  return (
    <button className="color-mode-toggle" type="button" onClick={() => setMode(next)} aria-label={label} title={label}>
      <Icon aria-hidden="true" />
    </button>
  )
}
