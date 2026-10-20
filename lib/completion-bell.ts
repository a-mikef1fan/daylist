// Plays a short synthesized sound when a task is completed.
// Built with the Web Audio API so no audio asset is needed. Call it from a
// user gesture (click) so the browser's autoplay policy allows playback.

type AudioContextConstructor = typeof AudioContext

let audioContext: AudioContext | null = null

// One oscillator voice: frequency (Hz), relative volume, decay time (seconds),
// optional start delay, waveform, and an optional pitch the voice glides to.
type Voice = {
  frequency: number
  gain: number
  decay: number
  delay?: number
  type?: OscillatorType
  glideTo?: number
}

// "Ding" is the original sound: bell partials where the slightly inharmonic
// upper ones give it a shimmer. It stays the default so existing behavior is unchanged.
const sounds = {
  ding: {
    label: 'Ding',
    voices: [
      { frequency: 880, gain: 0.5, decay: 1.2 },
      { frequency: 1760, gain: 0.25, decay: 0.8 },
      { frequency: 2640, gain: 0.12, decay: 0.5 },
      { frequency: 3520, gain: 0.06, decay: 0.3 },
    ],
  },
  // Three quick rising notes (C6, E6, G6).
  chime: {
    label: 'Chime',
    voices: [
      { frequency: 1047, gain: 0.4, decay: 0.7 },
      { frequency: 1319, gain: 0.4, decay: 0.7, delay: 0.1 },
      { frequency: 1568, gain: 0.4, decay: 1.0, delay: 0.2 },
    ],
  },
  // A lower, longer bell with strongly inharmonic partials.
  bell: {
    label: 'Bell',
    voices: [
      { frequency: 523, gain: 0.55, decay: 2.0 },
      { frequency: 1443, gain: 0.3, decay: 1.4 },
      { frequency: 2824, gain: 0.15, decay: 0.9 },
      { frequency: 4670, gain: 0.07, decay: 0.5 },
    ],
  },
  // A soft bubble: a sine that drops quickly in pitch.
  pop: {
    label: 'Pop',
    voices: [{ frequency: 700, gain: 0.8, decay: 0.12, glideTo: 180 }],
  },
  // Two short, bright square-wave beeps.
  blip: {
    label: 'Blip',
    voices: [
      { frequency: 1319, gain: 0.18, decay: 0.07, type: 'square' },
      { frequency: 1760, gain: 0.18, decay: 0.09, delay: 0.08, type: 'square' },
    ],
  },
} satisfies Record<string, { label: string; voices: Voice[] }>

export type CompletionSoundId = keyof typeof sounds

export const DEFAULT_COMPLETION_SOUND: CompletionSoundId = 'ding'

export const completionSoundOptions = (Object.keys(sounds) as CompletionSoundId[]).map((id) => ({ id, label: sounds[id].label }))

export function isCompletionSoundId(value: unknown): value is CompletionSoundId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(sounds, value)
}

function getAudioContext() {
  if (audioContext) return audioContext
  const Ctor: AudioContextConstructor | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext
  if (!Ctor) return null
  audioContext = new Ctor()
  return audioContext
}

export function playCompletionBell(sound: CompletionSoundId = DEFAULT_COMPLETION_SOUND) {
  try {
    const context = getAudioContext()
    if (!context) return
    // Contexts created before a gesture, or paused by the browser, need resuming.
    if (context.state === 'suspended') void context.resume().catch(() => {})

    const master = context.createGain()
    master.gain.value = 0.4
    master.connect(context.destination)

    for (const { frequency, gain, decay, delay = 0, type = 'sine', glideTo } of sounds[sound].voices as Voice[]) {
      const start = context.currentTime + delay
      const oscillator = context.createOscillator()
      const envelope = context.createGain()
      oscillator.type = type
      oscillator.frequency.setValueAtTime(frequency, start)
      if (glideTo) oscillator.frequency.exponentialRampToValueAtTime(glideTo, start + decay)
      // Quick attack, then an exponential decay to near silence.
      envelope.gain.setValueAtTime(0.0001, start)
      envelope.gain.exponentialRampToValueAtTime(gain, start + 0.005)
      envelope.gain.exponentialRampToValueAtTime(0.0001, start + decay)
      oscillator.connect(envelope)
      envelope.connect(master)
      oscillator.start(start)
      oscillator.stop(start + decay + 0.05)
    }
  } catch {
    // Audio can be unavailable or blocked; the sound is a nicety, so fail silently.
  }
}
