'use client'

import type { CLIENT_EVENTS, UsageMetadata } from '@/lib/usage'

type ClientEvent = (typeof CLIENT_EVENTS)[number]

// Fire-and-forget report to /api/track. Never throws and never waits on the network.
export function trackClientEvent(name: ClientEvent, metadata?: UsageMetadata) {
  try {
    const body = JSON.stringify({ name, path: window.location.pathname, metadata })
    if (navigator.sendBeacon?.('/api/track', new Blob([body], { type: 'application/json' }))) return
    void fetch('/api/track', { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true }).catch(() => {})
  } catch {
    // Analytics must never affect the app.
  }
}
