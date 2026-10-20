import type { Background } from './background'

// Compiles the CSS-only backgrounds (patterns, scanlines, shifting gradient, retro grid) to rules on the
// root element's ::before / ::after layer, under the app content. Canvas effects are not handled here.
// Every value comes from validated colours and clamped numbers, never from free text.

const n = (value: number) => String(Math.round(value * 100) / 100)

type Layers = { image: string; size?: string; position?: string }

function patternLayers(bg: Background): Layers | null {
  const { color: c, color2: d, size: s, thickness: t, angle: a } = bg
  const half = n(s / 2)
  switch (bg.kind) {
    case 'pinstripes':
      return { image: `repeating-linear-gradient(${a}deg, ${c} 0 ${n(t)}px, transparent ${n(t)}px ${n(s)}px)` }
    case 'stripes':
      return { image: `repeating-linear-gradient(${a}deg, ${c} 0 ${half}px, ${d} ${half}px ${n(s)}px)` }
    case 'grid':
      return {
        image: `linear-gradient(${c} ${n(t)}px, transparent ${n(t)}px), linear-gradient(90deg, ${c} ${n(t)}px, transparent ${n(t)}px)`,
        size: `${n(s)}px ${n(s)}px`,
      }
    case 'dots':
      return { image: `radial-gradient(${c} ${n(t)}px, transparent ${n(t + 0.8)}px)`, size: `${n(s)}px ${n(s)}px` }
    case 'checker':
      return { image: `conic-gradient(${c} 25%, ${d} 0 50%, ${c} 0 75%, ${d} 0)`, size: `${n(s)}px ${n(s)}px` }
    case 'hatch':
      return {
        image: `repeating-linear-gradient(45deg, ${c} 0 ${n(t)}px, transparent ${n(t)}px ${n(s)}px), repeating-linear-gradient(-45deg, ${c} 0 ${n(t)}px, transparent ${n(t)}px ${n(s)}px)`,
      }
    case 'zigzag':
      return {
        image: [135, 225, 315, 45].map((deg) => `linear-gradient(${deg}deg, ${c} 25%, transparent 25%)`).join(', '),
        size: `${n(s)}px ${n(s)}px`,
        position: `-${half}px 0, -${half}px 0, 0 0, 0 0`,
      }
    case 'waves': {
      const r = n(s / 4)
      return {
        image: `radial-gradient(circle at 50% 0, transparent ${r}px, ${c} ${n(s / 4 + 1)}px ${n(s / 4 + t)}px, transparent ${n(s / 4 + t + 1)}px)`,
        size: `${n(s)}px ${half}px`,
      }
    }
    case 'noise': {
      const tiles = [3 * s + 7, 4 * s + 11, 5 * s + 13, 7 * s + 3]
      const offsets = ['13px 29px', '41px 7px', '5px 53px', '31px 19px']
      return {
        image: tiles.map(() => `radial-gradient(${c} ${n(Math.max(1, t / 2))}px, transparent ${n(Math.max(1, t / 2) + 0.8)}px)`).join(', '),
        size: tiles.map((tile) => `${n(tile)}px ${n(tile)}px`).join(', '),
        position: offsets.join(', '),
      }
    }
    case 'gradient':
      return { image: `linear-gradient(${a}deg, ${c}, ${d})` }
    default:
      return null
  }
}

const layer = (root: string, pseudo: '::before' | '::after', body: string) =>
  `${root}${pseudo}{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;${body}}`

export function backgroundCss(bg: Background, root: string): string {
  if (bg.kind === 'none') return ''
  const opacity = `opacity:${n(bg.opacity)}`
  const still = `@media (prefers-reduced-motion: reduce){${root}::before,${root}::after{animation:none !important}}`

  const pattern = patternLayers(bg)
  if (pattern) {
    const extras = `${pattern.size ? `background-size:${pattern.size};` : ''}${pattern.position ? `background-position:${pattern.position};` : ''}`
    return layer(root, '::before', `background-image:${pattern.image};${extras}${opacity}`)
  }

  const speed = Math.max(0.2, bg.speed)
  switch (bg.kind) {
    case 'scanlines': {
      const flicker = `@keyframes daylist-flicker{0%,100%{opacity:${n(bg.opacity)}}45%{opacity:${n(bg.opacity * 0.7)}}50%{opacity:${n(Math.min(0.6, bg.opacity * 1.2))}}55%{opacity:${n(bg.opacity * 0.8)}}}`
      return [
        layer(root, '::before', `background-image:repeating-linear-gradient(0deg, ${bg.color} 0 1px, transparent 1px 3px);${opacity};animation:daylist-flicker ${n(4 / speed)}s steps(24) infinite`),
        flicker,
        still,
      ].join('\n')
    }
    case 'gradientShift': {
      const shift = '@keyframes daylist-shift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}'
      return [
        layer(root, '::before', `background-image:linear-gradient(${bg.angle}deg, ${bg.color}, ${bg.color2}, ${bg.color});background-size:300% 300%;${opacity};animation:daylist-shift ${n(40 / speed)}s ease infinite`),
        shift,
        still,
      ].join('\n')
    }
    case 'retroGrid': {
      const line = `linear-gradient(${bg.color} ${n(bg.thickness)}px, transparent ${n(bg.thickness)}px), linear-gradient(90deg, ${bg.color} ${n(bg.thickness)}px, transparent ${n(bg.thickness)}px)`
      const move = `@keyframes daylist-grid{from{background-position:0 0}to{background-position:0 ${n(bg.size)}px}}`
      return [
        `${root}::before{content:"";position:fixed;left:-50%;right:-50%;bottom:0;height:55vh;z-index:-1;pointer-events:none;transform:perspective(320px) rotateX(58deg);transform-origin:50% 100%;background-image:${line};background-size:${n(bg.size)}px ${n(bg.size)}px;-webkit-mask-image:linear-gradient(transparent, black);mask-image:linear-gradient(transparent, black);${opacity};animation:daylist-grid ${n(3 / speed)}s linear infinite}`,
        move,
        still,
      ].join('\n')
    }
    default:
      return ''
  }
}
