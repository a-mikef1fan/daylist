// Plays a short synthesized bell "ding" when a task is completed.
// Built with the Web Audio API so no audio asset is needed. Call it from a
// user gesture (click) so the browser's autoplay policy allows playback.

type AudioContextConstructor = typeof AudioContext

let audioContext: AudioContext | null = null

// A bell is a stack of partials: frequency (Hz), relative volume, and decay time
// (seconds). Optional fields: `delay` staggers the start (for multi-note sounds),
// `attack` sets the fade-in (seconds), and `type` picks the oscillator waveform.
type BellPartial = {
  frequency: number
  gain: number
  decay: number
  delay?: number
  attack?: number
  type?: OscillatorType
}

const bells = [
  {
    id: 'classic',
    label: 'Classic Bell',
    description: 'Warm bell with a shimmering tail',
    // The slightly inharmonic upper partials give it a bell-like shimmer.
    partials: [
      { frequency: 880, gain: 0.5, decay: 1.2 },
      { frequency: 1760, gain: 0.25, decay: 0.8 },
      { frequency: 2640, gain: 0.12, decay: 0.5 },
      { frequency: 3520, gain: 0.06, decay: 0.3 },
    ],
  },
  {
    id: 'chime',
    label: 'Chime',
    description: 'Two rising notes, bright and airy',
    partials: [
      { frequency: 1319, gain: 0.4, decay: 1.0 },
      { frequency: 2638, gain: 0.12, decay: 0.5 },
      { frequency: 1760, gain: 0.4, decay: 1.5, delay: 0.14 },
      { frequency: 3520, gain: 0.12, decay: 0.7, delay: 0.14 },
    ],
  },
  {
    id: 'soft-ping',
    label: 'Soft Ping',
    description: 'Short, gentle, almost a whisper',
    partials: [
      { frequency: 1047, gain: 0.5, decay: 0.45, attack: 0.012 },
      { frequency: 2094, gain: 0.08, decay: 0.2, attack: 0.012 },
    ],
  },
  {
    id: 'glass',
    label: 'Glass',
    description: 'High, crisp tap like a glass being struck',
    // Strongly inharmonic partials (about 1x, 2.32x, 4.25x) read as struck glass.
    partials: [
      { frequency: 1760, gain: 0.4, decay: 1.1 },
      { frequency: 4083, gain: 0.25, decay: 0.55 },
      { frequency: 7480, gain: 0.08, decay: 0.25 },
    ],
  },
  {
    id: 'marimba',
    label: 'Marimba',
    description: 'Low, woody, quick-decaying mallet tone',
    // A strong fundamental plus a short-lived upper partial gives the mallet knock.
    partials: [
      { frequency: 523, gain: 0.7, decay: 0.55, attack: 0.003 },
      { frequency: 2092, gain: 0.3, decay: 0.12, attack: 0.002 },
      { frequency: 1046, gain: 0.1, decay: 0.2, attack: 0.003, type: 'triangle' },
    ],
  },
] as const satisfies readonly { id: string; label: string; description: string; partials: readonly BellPartial[] }[]

export type BellId = (typeof bells)[number]['id']

export const DEFAULT_BELL_ID: BellId = 'classic'

// Options for pickers: id, visible label, and a short description.
export const BELL_OPTIONS: readonly { id: BellId; label: string; description: string }[] = bells.map(
  ({ id, label, description }) => ({ id, label, description }),
)

// Narrows an unknown value (e.g. read from localStorage) to a valid bell id.
export function isBellId(value: unknown): value is BellId {
  return typeof value === 'string' && bells.some((bell) => bell.id === value)
}

function getAudioContext() {
  if (audioContext) return audioContext
  const Ctor: AudioContextConstructor | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext
  if (!Ctor) return null
  audioContext = new Ctor()
  return audioContext
}

export function playBell(id: BellId = DEFAULT_BELL_ID) {
  try {
    const context = getAudioContext()
    if (!context) return
    // Contexts created before a gesture, or paused by the browser, need resuming.
    if (context.state === 'suspended') void context.resume().catch(() => {})

    const bell = bells.find((item) => item.id === id) ?? bells[0]
    const start = context.currentTime
    const master = context.createGain()
    master.gain.value = 0.4
    master.connect(context.destination)

    for (const { frequency, gain, decay, delay = 0, attack = 0.005, type = 'sine' } of bell.partials as readonly BellPartial[]) {
      const begin = start + delay
      const oscillator = context.createOscillator()
      const envelope = context.createGain()
      oscillator.type = type
      oscillator.frequency.value = frequency
      // Quick attack, then an exponential decay to near silence.
      envelope.gain.setValueAtTime(0.0001, begin)
      envelope.gain.exponentialRampToValueAtTime(gain, begin + attack)
      envelope.gain.exponentialRampToValueAtTime(0.0001, begin + decay)
      oscillator.connect(envelope)
      envelope.connect(master)
      oscillator.start(begin)
      oscillator.stop(begin + decay + 0.05)
    }
  } catch {
    // Audio can be unavailable or blocked; the bell is a nicety, so fail silently.
  }
}

// Kept for existing callers: rings the default Classic Bell unless an id is given.
export function playCompletionBell(id?: BellId) {
  playBell(id)
}
