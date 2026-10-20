// Color themes. The hues for each id live in app/themes.css; keep the two lists in sync.
export const THEMES = [
  { id: 'sage', label: 'Sage' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'lagoon', label: 'Lagoon' },
  { id: 'sunset', label: 'Sunset' },
  { id: 'honey', label: 'Honey' },
  { id: 'rose', label: 'Rose' },
  { id: 'grape', label: 'Grape' },
  { id: 'slate', label: 'Slate' },
] as const

export type ThemeId = (typeof THEMES)[number]['id']

export const DEFAULT_THEME: ThemeId = 'sage'
export const THEME_STORAGE_KEY = 'daylist-theme'

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((theme) => theme.id === value)
}

// Runs in <head> before first paint so a saved theme never flashes the default colors.
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(${JSON.stringify(THEMES.map((theme) => theme.id))}.indexOf(t)>-1)document.documentElement.setAttribute('data-theme',t)}catch(e){}`
