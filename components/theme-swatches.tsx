import type { Theme } from '@/lib/custom-theme/schema'

export function Swatches({ theme }: { theme: Theme }) {
  return (
    <div className="theme-swatch-row" aria-hidden="true">
      {(['background', 'card', 'primary', 'highlight'] as const).map((key) => (
        <i key={key} style={{ background: theme.colors[key] }} />
      ))}
    </div>
  )
}
