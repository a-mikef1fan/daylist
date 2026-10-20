// Plays a short synthesized bell "ding" when a task is completed.
// Built with the Web Audio API so no audio asset is needed. Call it from a
// user gesture (click) so the browser's autoplay policy allows playback.

type AudioContextConstructor = typeof AudioContext

let audioContext: AudioContext | null = null

// Bell partials: frequency (Hz), relative volume, and decay time (seconds).
// The slightly inharmonic upper partials give it a bell-like shimmer.
const partials = [
  { frequency: 880, gain: 0.5, decay: 1.2 },
  { frequency: 1760, gain: 0.25, decay: 0.8 },
  { frequency: 2640, gain: 0.12, decay: 0.5 },
  { frequency: 3520, gain: 0.06, decay: 0.3 },
]

function getAudioContext() {
  if (audioContext) return audioContext
  const Ctor: AudioContextConstructor | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext
  if (!Ctor) return null
  audioContext = new Ctor()
  return audioContext
}

export function playCompletionBell() {
  try {
    const context = getAudioContext()
    if (!context) return
    // Contexts created before a gesture, or paused by the browser, need resuming.
    if (context.state === 'suspended') void context.resume().catch(() => {})

    const start = context.currentTime
    const master = context.createGain()
    master.gain.value = 0.4
    master.connect(context.destination)

    for (const { frequency, gain, decay } of partials) {
      const oscillator = context.createOscillator()
      const envelope = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
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
    // Audio can be unavailable or blocked; the bell is a nicety, so fail silently.
  }
}
