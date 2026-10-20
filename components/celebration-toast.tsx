'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import type { Celebration } from '@/lib/celebration'

const AUTO_DISMISS_MS = 9000

// Always mounted so the polite live region exists before its content changes,
// which is what lets screen readers announce each new celebration.
export function CelebrationToast({ celebration, onDismiss }: { celebration: Celebration | null; onDismiss: () => void }) {
  return (
    <div className="celebration-region" role="status" aria-live="polite" aria-atomic="true">
      {celebration && <CelebrationCard key={celebration.id} celebration={celebration} onDismiss={onDismiss} />}
    </div>
  )
}

function CelebrationCard({ celebration, onDismiss }: { celebration: Celebration; onDismiss: () => void }) {
  const { joke, panda, taskTitle } = celebration
  const [imageFailed, setImageFailed] = useState(false)
  const [paused, setPaused] = useState(false)
  const dismissRef = useRef(onDismiss)
  dismissRef.current = onDismiss

  // Fade out on its own, unless the pointer or keyboard focus is on the card.
  useEffect(() => {
    if (paused) return
    const timer = window.setTimeout(() => dismissRef.current(), AUTO_DISMISS_MS)
    return () => window.clearTimeout(timer)
  }, [paused])

  return (
    <div
      className="celebration-card"
      style={{ '--celebration-ms': `${AUTO_DISMISS_MS}ms` } as React.CSSProperties}
      data-paused={paused || undefined}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(event) => { if (event.key === 'Escape') onDismiss() }}
    >
      <div className="celebration-art">
        {imageFailed ? (
          <span className="celebration-fallback" role="img" aria-label="A panda cheering you on">🐼</span>
        ) : (
          // A plain <img> on purpose: next/image would not animate a GIF, and the files are tiny and local.
          <picture>
            <source media="(prefers-reduced-motion: reduce)" srcSet={panda.still} />
            <img src={panda.src} alt={panda.alt} width={96} height={96} onError={() => setImageFailed(true)} />
          </picture>
        )}
      </div>
      <div className="celebration-copy">
        <p className="celebration-title">Task complete!</p>
        <p className="celebration-task">{taskTitle}</p>
        <p className="celebration-joke"><span>{joke.setup}</span> <strong>{joke.punchline}</strong></p>
      </div>
      <button className="celebration-close" type="button" onClick={onDismiss} aria-label="Dismiss celebration"><X aria-hidden="true" /></button>
    </div>
  )
}
