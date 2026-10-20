// Allow-list of fonts a theme may use. The Google Fonts URL and the CSS font stack are built only from
// these entries, never from model output. `builtin` fonts are already loaded by next/font in layout.tsx.

type FontCategory = 'sans' | 'serif' | 'display' | 'handwriting' | 'mono'

type FontDef = { family: string; category: FontCategory; weights: string; builtin?: string }

export const FONTS = {
  inter: { family: 'Inter', category: 'sans', weights: '400;500;600;700', builtin: 'var(--font-inter)' },
  fraunces: { family: 'Fraunces', category: 'serif', weights: '400;600;700', builtin: 'var(--font-fraunces)' },
  dmSans: { family: 'DM Sans', category: 'sans', weights: '400;500;700' },
  nunito: { family: 'Nunito', category: 'sans', weights: '400;600;700' },
  quicksand: { family: 'Quicksand', category: 'sans', weights: '400;500;700' },
  poppins: { family: 'Poppins', category: 'sans', weights: '400;500;600;700' },
  workSans: { family: 'Work Sans', category: 'sans', weights: '400;500;600;700' },
  spaceGrotesk: { family: 'Space Grotesk', category: 'sans', weights: '400;500;700' },
  manrope: { family: 'Manrope', category: 'sans', weights: '400;500;700' },
  comfortaa: { family: 'Comfortaa', category: 'display', weights: '400;500;700' },
  lora: { family: 'Lora', category: 'serif', weights: '400;500;600;700' },
  merriweather: { family: 'Merriweather', category: 'serif', weights: '400;700' },
  playfairDisplay: { family: 'Playfair Display', category: 'serif', weights: '400;600;700' },
  dmSerifDisplay: { family: 'DM Serif Display', category: 'serif', weights: '400' },
  cormorantGaramond: { family: 'Cormorant Garamond', category: 'serif', weights: '400;500;600;700' },
  libreBaskerville: { family: 'Libre Baskerville', category: 'serif', weights: '400;700' },
  cinzel: { family: 'Cinzel', category: 'serif', weights: '400;600;700' },
  abrilFatface: { family: 'Abril Fatface', category: 'display', weights: '400' },
  bebasNeue: { family: 'Bebas Neue', category: 'display', weights: '400' },
  righteous: { family: 'Righteous', category: 'display', weights: '400' },
  orbitron: { family: 'Orbitron', category: 'display', weights: '400;500;700' },
  pressStart2P: { family: 'Press Start 2P', category: 'display', weights: '400' },
  caveat: { family: 'Caveat', category: 'handwriting', weights: '400;600;700' },
  patrickHand: { family: 'Patrick Hand', category: 'handwriting', weights: '400' },
  indieFlower: { family: 'Indie Flower', category: 'handwriting', weights: '400' },
  pacifico: { family: 'Pacifico', category: 'handwriting', weights: '400' },
  specialElite: { family: 'Special Elite', category: 'display', weights: '400' },
  jetbrainsMono: { family: 'JetBrains Mono', category: 'mono', weights: '400;500;700' },
  vt323: { family: 'VT323', category: 'mono', weights: '400' },
} as const satisfies Record<string, FontDef>

export type FontId = keyof typeof FONTS
export const FONT_IDS = Object.keys(FONTS) as [FontId, ...FontId[]]

export const isFontId = (value: unknown): value is FontId =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(FONTS, value)

const FALLBACKS: Record<FontCategory, string> = {
  sans: "system-ui, -apple-system, 'Segoe UI', Arial, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  display: "system-ui, -apple-system, 'Segoe UI', Arial, sans-serif",
  handwriting: "'Comic Sans MS', 'Segoe Print', cursive",
  mono: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
}

export function fontStack(id: FontId): string {
  const font: FontDef = FONTS[id]
  const primary = font.builtin ?? `'${font.family}'`
  return `${primary}, ${FALLBACKS[font.category]}`
}

// One stylesheet URL for every non-builtin font a theme uses, or null when nothing needs loading.
export function fontsHref(ids: FontId[]): string | null {
  const families = [...new Set(ids)]
    .map((id): FontDef => FONTS[id])
    .filter((font) => !font.builtin)
    .map((font) => `family=${font.family.replace(/ /g, '+')}:wght@${font.weights}`)
  return families.length ? `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap` : null
}
