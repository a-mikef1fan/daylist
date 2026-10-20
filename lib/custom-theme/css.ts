import { ensureContrast, formatOklch, parseColor, type Oklch } from './color'
import { fontStack, fontsHref } from './fonts'
import { COLOR_KEYS, type Theme, type ThemeColors } from './schema'

// Turns a validated theme into CSS. Only canonical colour strings, numbers and allow-listed font stacks
// from this module end up in the output, so no model-supplied text is ever interpolated into CSS.

export const THEME_ATTRIBUTE = 'data-custom-theme'
export const THEME_STYLE_ID = 'daylist-custom-theme'
export const THEME_FONTS_ID = 'daylist-custom-theme-fonts'
export const THEME_STORAGE_KEY = 'daylist:custom-theme'
export const THEME_SAVED_STORAGE_KEY = 'daylist:custom-theme-saved'
// Precompiled output read by the inline script in <head>, so the theme paints before React hydrates.
export const THEME_COMPILED_STORAGE_KEY = 'daylist:custom-theme-compiled'

const mix = (a: string, percent: number, b: string) => `color-mix(in oklch, ${a} ${percent}%, ${b})`

function colorVariables(colors: ThemeColors): Record<string, string> {
  const parsed = Object.fromEntries(COLOR_KEYS.map((key) => [key, parseColor(colors[key]) as Oklch])) as Record<keyof ThemeColors, Oklch>
  // Warm accent used as text must stay readable, so derive a text-safe variant of the highlight colour.
  const highlightText = formatOklch(ensureContrast(parsed.highlight, [parsed.background, parsed.card], 4.5))
  const v = (name: string) => `var(--${name})`
  return {
    // Dark palettes need native controls (date picker, select, scrollbars) to render dark too.
    'color-scheme': parsed.background.l < 0.5 ? 'dark' : 'light',
    // Any rule that still derives colour from the colour-theme picker's hues follows the palette.
    '--hue': parsed.primary.h.toFixed(1),
    '--surface-hue': parsed.background.h.toFixed(1),
    '--background': colors.background,
    '--foreground': colors.foreground,
    '--card': colors.card,
    '--card-foreground': colors.foreground,
    '--popover': colors.card,
    '--popover-foreground': colors.foreground,
    '--primary': colors.primary,
    '--primary-foreground': colors.primaryForeground,
    '--secondary': colors.secondary,
    '--secondary-foreground': colors.foreground,
    '--muted': colors.muted,
    '--muted-foreground': colors.mutedForeground,
    '--accent': colors.accent,
    '--accent-foreground': colors.foreground,
    '--destructive': colors.destructive,
    '--border': colors.border,
    '--input': colors.border,
    '--ring': colors.primary,
    '--sidebar': mix(v('secondary'), 60, v('background')),
    '--ink-soft': mix(v('foreground'), 78, v('background')),
    '--sage': mix(v('primary'), 18, v('background')),
    '--sage-deep': v('primary'),
    '--sage-deep-hover': mix(v('primary'), 82, v('foreground')),
    '--on-sage-deep': v('primary-foreground'),
    '--warm': mix(colors.highlight, 14, v('background')),
    '--warm-border': mix(colors.highlight, 30, v('background')),
    '--coral': colors.highlight,
    '--coral-text': highlightText,
    '--coral-deep': mix(highlightText, 80, v('foreground')),
    '--coral-soft': mix(colors.highlight, 18, v('background')),
    '--overdue': v('destructive'),
    '--danger-soft': mix(v('destructive'), 12, v('background')),
    '--low': mix(v('primary'), 70, v('background')),
    '--low-text': v('primary'),
    '--hover': mix(v('foreground'), 6, v('background')),
    '--active-bg': mix(v('primary'), 16, v('background')),
    '--avatar-border': mix(v('primary'), 35, v('background')),
    '--avatar-hover': mix(v('primary'), 22, v('background')),
    '--field': v('card'),
    '--placeholder': mix(v('muted-foreground'), 75, v('background')),
    '--row-hover-border': mix(v('primary'), 30, v('border')),
    '--dashed-border': mix(v('foreground'), 16, v('border')),
    '--check-idle': mix(v('muted-foreground'), 65, v('background')),
    '--dot': mix(v('muted-foreground'), 75, v('background')),
    '--separator': mix(v('muted-foreground'), 65, v('background')),
    '--intro-bg': mix(v('primary'), 14, v('background')),
    '--intro-title': v('foreground'),
    '--intro-text': mix(v('foreground'), 85, v('background')),
    '--intro-muted': v('ink-soft'),
    '--backdrop': mix(v('foreground'), 40, 'transparent'),
  }
}

const block = (selector: string, variables: Record<string, string>) =>
  `${selector}{${Object.entries(variables).map(([name, value]) => `${name}:${value}`).join(';')}}`

// Most surfaces use fixed pixel radii, so the theme radius is applied to them by tier.
const RADIUS_TIERS: [number, string[]][] = [
  [0.75, ['.brand-icon', '.filter-link', '.task-title-input', '.add-task-button', '.delete-task-button', '.search-field', '.select-control', '.date-control', '.auth-submit', '.dialog-cancel', '.form-field input', '.sign-out-button', '.user-menu-item', '.rail-toggle', '.dialog-close', '.snake-action', '.snake-pause']],
  [1.1, ['.task-row', '.rail-tip', '.user-menu', '.empty-state', '.empty-illustration', '.snake-board', '.quick-add-icon']],
  [1.4, ['.quick-add-card', '.dialog-popup']],
]

// Doubled attribute selector keeps these rules above the :root and [data-theme] defaults regardless of source order.
const ROOT = `:root[${THEME_ATTRIBUTE}][${THEME_ATTRIBUTE}]`

export function compileThemeCss(theme: Theme): string {
  const variables = {
    '--font-sans': fontStack(theme.bodyFont),
    '--font-display': fontStack(theme.headingFont),
    '--radius': `${theme.radius}rem`,
    '--heading-transform': theme.headingTransform,
    ...colorVariables(theme.colors),
  }
  const radii = RADIUS_TIERS.map(
    ([scale, selectors]) =>
      `${selectors.map((selector) => `${ROOT} ${selector}`).join(',')}{border-radius:calc(var(--radius)*${scale})}`,
  )
  return [block(ROOT, variables), ...radii].join('\n')
}

export type CompiledTheme = { css: string; fontsHref: string | null }

export function compileTheme(theme: Theme): CompiledTheme {
  return { css: compileThemeCss(theme), fontsHref: fontsHref([theme.headingFont, theme.bodyFont]) }
}

// Runs in <head> before first paint. It trusts nothing blindly: the stored CSS must look like what
// compileThemeCss produces, and the provider recompiles from the validated theme right after hydration.
export const CUSTOM_THEME_INIT_SCRIPT = `(function(){try{var c=JSON.parse(localStorage.getItem(${JSON.stringify(THEME_COMPILED_STORAGE_KEY)})||'null');if(!c||typeof c.css!=='string'||!/^[\\w\\s.,:;%()#'"\\[\\]=>*+\\/{}-]*$/.test(c.css)||/url\\(|@import|expression|javascript/i.test(c.css))return;var d=document,s=d.createElement('style');s.id=${JSON.stringify(THEME_STYLE_ID)};s.textContent=c.css;d.head.appendChild(s);d.documentElement.setAttribute(${JSON.stringify(THEME_ATTRIBUTE)},'on');if(typeof c.fontsHref==='string'&&c.fontsHref.indexOf('https://fonts.googleapis.com/css2?')===0){var l=d.createElement('link');l.id=${JSON.stringify(THEME_FONTS_ID)};l.rel='stylesheet';l.href=c.fontsHref;d.head.appendChild(l)}}catch(e){}})()`
