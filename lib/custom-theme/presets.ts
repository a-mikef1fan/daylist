import { ICON_PACKS, type IconPackId } from './icons'
import { sanitizeTheme, type Theme, type ThemeColors } from './schema'

// Hand-made themes. They go through the same sanitiser as generated ones, so contrast is repaired too.

type PresetInput = Omit<Theme, 'icons' | 'colors' | 'description'> & { description: string; pack: IconPackId; colors: ThemeColors }

const define = ({ pack, ...theme }: PresetInput): Theme => sanitizeTheme({ ...theme, icons: ICON_PACKS[pack].slots }).theme

export const BASE_THEME: Theme = define({
  name: 'Daylist',
  description: 'The classic sage look',
  colors: {
    background: 'oklch(0.982 0.006 100)', foreground: 'oklch(0.24 0.025 158)', card: 'oklch(1 0 0)', primary: 'oklch(0.43 0.09 157)',
    primaryForeground: 'oklch(0.985 0.004 100)', secondary: 'oklch(0.95 0.018 100)', muted: 'oklch(0.955 0.01 100)',
    mutedForeground: 'oklch(0.53 0.025 157)', accent: 'oklch(0.94 0.025 91)', border: 'oklch(0.91 0.014 100)',
    destructive: 'oklch(0.58 0.19 27)', highlight: 'oklch(0.65 0.14 39)',
  },
  radius: 0.75, headingFont: 'fraunces', bodyFont: 'inter', headingTransform: 'none', iconStrokeWidth: 2, pack: 'classic',
})

export const PRESET_THEMES: Theme[] = [
  define({
    name: 'Google Chat', description: 'Google Chat green on white and light grey, with rounded corners.',
    colors: {
      background: '#f8f9fa', foreground: '#202124', card: '#ffffff', primary: '#0b8043',
      primaryForeground: '#ffffff', secondary: '#f1f3f4', muted: '#f1f3f4',
      mutedForeground: '#5f6368', accent: '#e6f4ea', border: '#dadce0',
      destructive: '#d93025', highlight: '#00ac47',
    },
    radius: 1.25, headingFont: 'dmSans', bodyFont: 'roboto', headingTransform: 'none', iconStrokeWidth: 2, pack: 'chat',
  }),
  define({
    name: 'Autumn Cabin', description: 'Warm browns, ember orange and a handwritten feel.',
    colors: {
      background: 'oklch(0.955 0.025 75)', foreground: 'oklch(0.28 0.04 55)', card: 'oklch(0.98 0.015 80)', primary: 'oklch(0.45 0.1 45)',
      primaryForeground: 'oklch(0.97 0.02 80)', secondary: 'oklch(0.92 0.035 75)', muted: 'oklch(0.93 0.03 75)',
      mutedForeground: 'oklch(0.5 0.05 55)', accent: 'oklch(0.9 0.05 70)', border: 'oklch(0.87 0.04 72)',
      destructive: 'oklch(0.52 0.18 27)', highlight: 'oklch(0.68 0.15 55)',
    },
    radius: 1.1, headingFont: 'caveat', bodyFont: 'nunito', headingTransform: 'none', iconStrokeWidth: 2.4, pack: 'cozy',
  }),
  define({
    name: 'Midnight Arcade', description: 'Neon magenta and cyan on deep violet, with pixel type.',
    colors: {
      background: 'oklch(0.16 0.05 295)', foreground: 'oklch(0.95 0.03 200)', card: 'oklch(0.21 0.07 295)', primary: 'oklch(0.75 0.25 335)',
      primaryForeground: 'oklch(0.16 0.06 300)', secondary: 'oklch(0.26 0.08 295)', muted: 'oklch(0.24 0.07 295)',
      mutedForeground: 'oklch(0.78 0.08 280)', accent: 'oklch(0.3 0.1 200)', border: 'oklch(0.33 0.12 300)',
      destructive: 'oklch(0.72 0.2 20)', highlight: 'oklch(0.85 0.15 195)',
    },
    radius: 0, headingFont: 'pressStart2P', bodyFont: 'spaceGrotesk', headingTransform: 'uppercase', iconStrokeWidth: 2.75, pack: 'arcade',
  }),
  define({
    name: 'Ocean Breeze', description: 'Airy blues, seafoam accents and soft round corners.',
    colors: {
      background: 'oklch(0.97 0.012 225)', foreground: 'oklch(0.26 0.05 240)', card: 'oklch(0.995 0.005 225)', primary: 'oklch(0.45 0.11 235)',
      primaryForeground: 'oklch(0.98 0.01 225)', secondary: 'oklch(0.93 0.025 225)', muted: 'oklch(0.94 0.02 225)',
      mutedForeground: 'oklch(0.5 0.05 235)', accent: 'oklch(0.9 0.05 215)', border: 'oklch(0.88 0.03 225)',
      destructive: 'oklch(0.55 0.19 25)', highlight: 'oklch(0.75 0.12 175)',
    },
    radius: 1.5, headingFont: 'comfortaa', bodyFont: 'dmSans', headingTransform: 'none', iconStrokeWidth: 2, pack: 'ocean',
  }),
  define({
    name: 'Forest Night', description: 'Deep moss greens with a touch of gold.',
    colors: {
      background: 'oklch(0.2 0.03 155)', foreground: 'oklch(0.93 0.03 140)', card: 'oklch(0.25 0.035 155)', primary: 'oklch(0.76 0.12 145)',
      primaryForeground: 'oklch(0.2 0.04 150)', secondary: 'oklch(0.29 0.035 155)', muted: 'oklch(0.27 0.03 155)',
      mutedForeground: 'oklch(0.76 0.05 145)', accent: 'oklch(0.33 0.05 150)', border: 'oklch(0.35 0.04 155)',
      destructive: 'oklch(0.72 0.16 25)', highlight: 'oklch(0.8 0.13 85)',
    },
    radius: 0.6, headingFont: 'lora', bodyFont: 'manrope', headingTransform: 'none', iconStrokeWidth: 2, pack: 'nature',
  }),
  define({
    name: 'Sakura', description: 'Blossom pinks with matcha green and very round corners.',
    colors: {
      background: 'oklch(0.975 0.015 5)', foreground: 'oklch(0.3 0.04 350)', card: 'oklch(0.995 0.006 5)', primary: 'oklch(0.5 0.14 355)',
      primaryForeground: 'oklch(0.985 0.01 5)', secondary: 'oklch(0.94 0.03 5)', muted: 'oklch(0.95 0.025 5)',
      mutedForeground: 'oklch(0.52 0.06 350)', accent: 'oklch(0.91 0.06 10)', border: 'oklch(0.9 0.035 5)',
      destructive: 'oklch(0.55 0.2 25)', highlight: 'oklch(0.72 0.1 150)',
    },
    radius: 1.75, headingFont: 'playfairDisplay', bodyFont: 'quicksand', headingTransform: 'none', iconStrokeWidth: 1.75, pack: 'sweet',
  }),
  define({
    name: 'Paper', description: 'Quiet black on warm white, with sharp corners and fine lines.',
    colors: {
      background: 'oklch(0.97 0.004 90)', foreground: 'oklch(0.22 0 0)', card: 'oklch(0.99 0.003 90)', primary: 'oklch(0.25 0 0)',
      primaryForeground: 'oklch(0.98 0 0)', secondary: 'oklch(0.94 0.004 90)', muted: 'oklch(0.95 0.004 90)',
      mutedForeground: 'oklch(0.45 0 0)', accent: 'oklch(0.9 0.005 90)', border: 'oklch(0.87 0.005 90)',
      destructive: 'oklch(0.5 0.19 27)', highlight: 'oklch(0.6 0.16 35)',
    },
    radius: 0.15, headingFont: 'cormorantGaramond', bodyFont: 'workSans', headingTransform: 'none', iconStrokeWidth: 1.5, pack: 'classic',
  }),
  define({
    name: 'Sunset', description: 'Glowing reds and oranges on warm cream.',
    colors: {
      background: 'oklch(0.97 0.025 70)', foreground: 'oklch(0.28 0.06 30)', card: 'oklch(0.99 0.015 70)', primary: 'oklch(0.5 0.18 25)',
      primaryForeground: 'oklch(0.985 0.01 70)', secondary: 'oklch(0.93 0.04 60)', muted: 'oklch(0.94 0.035 65)',
      mutedForeground: 'oklch(0.5 0.07 35)', accent: 'oklch(0.9 0.07 55)', border: 'oklch(0.88 0.05 60)',
      destructive: 'oklch(0.5 0.2 20)', highlight: 'oklch(0.72 0.17 55)',
    },
    radius: 1, headingFont: 'dmSerifDisplay', bodyFont: 'poppins', headingTransform: 'none', iconStrokeWidth: 2.25, pack: 'sunset',
  }),
  define({
    name: 'Cyberpunk', description: 'Electric cyan and yellow on near-black, in capital letters.',
    colors: {
      background: 'oklch(0.15 0.04 270)', foreground: 'oklch(0.95 0.04 190)', card: 'oklch(0.2 0.05 275)', primary: 'oklch(0.82 0.17 195)',
      primaryForeground: 'oklch(0.15 0.04 270)', secondary: 'oklch(0.25 0.06 285)', muted: 'oklch(0.23 0.05 280)',
      mutedForeground: 'oklch(0.78 0.08 300)', accent: 'oklch(0.3 0.12 330)', border: 'oklch(0.38 0.13 320)',
      destructive: 'oklch(0.7 0.22 20)', highlight: 'oklch(0.85 0.2 105)',
    },
    radius: 0.2, headingFont: 'orbitron', bodyFont: 'jetbrainsMono', headingTransform: 'uppercase', iconStrokeWidth: 2.25, pack: 'cyber',
  }),
]
