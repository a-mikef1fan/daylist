'use client'

import { useEffect, useState } from 'react'
import { scenes } from '@/components/calm-scenery-scenes'
import '@/components/calm-scenery.css'

const STORAGE_KEY = 'daylist:last-scenery'

// Remembers the last scene shown so the next pick is always different,
// including across remounts (module variable) and reloads (sessionStorage).
let lastIndex = -1

function readLastIndex() {
  if (lastIndex >= 0) return lastIndex
  try {
    const saved = Number(window.sessionStorage.getItem(STORAGE_KEY))
    if (Number.isInteger(saved) && saved >= 0 && saved < scenes.length) return saved
  } catch {
    // Storage can be unavailable; the module variable still covers this visit.
  }
  return -1
}

function pickNextIndex() {
  const previous = readLastIndex()
  let next = Math.floor(Math.random() * (scenes.length - (previous >= 0 ? 1 : 0)))
  if (previous >= 0 && next >= previous) next += 1
  lastIndex = next
  try {
    window.sessionStorage.setItem(STORAGE_KEY, String(next))
  } catch {
    // Ignore storage failures.
  }
  return next
}

// Chosen after mount (client only) so server and client markup match on hydration.
// The reserved aspect ratio avoids layout shift while the scene fades in.
// Rendering this component afresh (the empty state appearing) picks a new scene.
export function CalmScenery() {
  const [index, setIndex] = useState<number | null>(null)

  useEffect(() => {
    setIndex(pickNextIndex())
  }, [])

  const scene = index === null ? null : scenes[index]

  return (
    <figure className="calm-scenery" data-scene={scene?.id}>
      <div className="calm-scenery-frame">
        {scene && (
          <svg
            key={scene.id}
            className="calm-scenery-art"
            viewBox="0 0 400 240"
            preserveAspectRatio="xMidYMid slice"
            role="img"
            aria-label={`${scene.alt}. ${scene.place}.`}
          >
            {scene.art}
          </svg>
        )}
      </div>
      {scene && (
        <figcaption>
          <strong>{scene.place}</strong>
          <span>{scene.caption}</span>
        </figcaption>
      )}
    </figure>
  )
}
