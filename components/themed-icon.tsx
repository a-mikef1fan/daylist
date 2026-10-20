'use client'

import type { LucideProps } from 'lucide-react'
import { useCustomTheme } from '@/components/custom-theme-provider'
import { ICON_REGISTRY, ICON_SLOTS, type IconSlot } from '@/lib/custom-theme/icons'
import { STROKE_RANGE } from '@/lib/custom-theme/schema'

// Renders the icon the active theme chose for a slot, or the slot's default icon.
export function ThemedIcon({ slot, ...props }: { slot: IconSlot } & LucideProps) {
  const { shown } = useCustomTheme()
  const Icon = ICON_REGISTRY[shown?.icons[slot] ?? ICON_SLOTS[slot].fallback]
  const strokeWidth = shown && shown.iconStrokeWidth !== STROKE_RANGE.fallback ? shown.iconStrokeWidth : undefined
  return <Icon strokeWidth={strokeWidth} {...props} />
}
