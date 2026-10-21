'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { rememberUnsent, sendUnsent, type ScoreGameId, type ScoreSubmission } from '@/lib/score-client'

// Sends a finished run to the game's leaderboard without ever getting in the way of playing: the run is first kept in
// this browser, then sent, and anything that fails is retried when the game mounts or when `flush` is called (the game
// calls it when the leaderboard is opened). `version` changes whenever the server accepted a score, so an open
// leaderboard reloads.
export function useScoreSync(game: ScoreGameId) {
  const [version, setVersion] = useState(0)
  const mounted = useRef(true)

  const flush = useCallback(async () => {
    if (await sendUnsent(game)) {
      if (mounted.current) setVersion((current) => current + 1)
    }
  }, [game])

  const submit = useCallback(
    (board: string, run: ScoreSubmission) => {
      rememberUnsent(game, board, run)
      void flush()
    },
    [game, flush],
  )

  useEffect(() => {
    mounted.current = true
    void flush()
    return () => {
      mounted.current = false
    }
  }, [flush])

  return { version, submit, flush }
}
