// Background wallpapers. The art for each id lives in app/backgrounds.css; keep the two lists in sync.
// "none" is the default and leaves the page exactly as it was.
export const BACKGROUNDS = [
  { id: 'none', label: 'None' },
  { id: 'alpine', label: 'Alpine' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'aurora', label: 'Aurora' },
  { id: 'forest', label: 'Forest' },
  { id: 'starry', label: 'Starry' },
  { id: 'dunes', label: 'Dunes' },
  { id: 'clouds', label: 'Clouds' },
  { id: 'city', label: 'City' },
  { id: 'bloom', label: 'Bloom' },
] as const

export type BackgroundId = (typeof BACKGROUNDS)[number]['id']

export const DEFAULT_BACKGROUND: BackgroundId = 'none'
export const BACKGROUND_STORAGE_KEY = 'daylist:background'

export function isBackgroundId(value: unknown): value is BackgroundId {
  return BACKGROUNDS.some((background) => background.id === value)
}

// Runs in <head> before first paint so a saved background never flashes the plain page first.
export const BACKGROUND_INIT_SCRIPT = `try{var b=localStorage.getItem(${JSON.stringify(BACKGROUND_STORAGE_KEY)});if(${JSON.stringify(BACKGROUNDS.map((background) => background.id).filter((id) => id !== DEFAULT_BACKGROUND))}.indexOf(b)>-1)document.documentElement.setAttribute('data-background',b)}catch(e){}`
