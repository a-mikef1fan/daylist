// Background wallpapers. The art for each id lives in app/backgrounds.css; keep the two lists in sync.
// "none" leaves the page plain. A first-time visitor gets a random scene instead (see BACKGROUND_INIT_SCRIPT).
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

export const NO_BACKGROUND: BackgroundId = 'none'
export const BACKGROUND_STORAGE_KEY = 'daylist:background'

export function isBackgroundId(value: unknown): value is BackgroundId {
  return BACKGROUNDS.some((background) => background.id === value)
}

const SCENE_IDS = BACKGROUNDS.map((background) => background.id).filter((id) => id !== NO_BACKGROUND)

// Runs in <head> before first paint so a saved background never flashes the plain page first.
// With nothing saved (or an unknown value) it picks a random scene, saves it so the choice stays put on
// later visits, and applies it. An explicit "none" is saved like any other choice and is never re-rolled.
// If storage can't be written (private mode), nothing is applied rather than a new scene on every load.
export const BACKGROUND_INIT_SCRIPT = `try{var k=${JSON.stringify(BACKGROUND_STORAGE_KEY)},s=${JSON.stringify(SCENE_IDS)},b=localStorage.getItem(k);if(b!==${JSON.stringify(NO_BACKGROUND)}){if(s.indexOf(b)<0){b=s[Math.floor(Math.random()*s.length)];localStorage.setItem(k,b)}document.documentElement.setAttribute('data-background',b)}}catch(e){}`
