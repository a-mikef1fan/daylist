'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchLeaderboard } from '@/lib/theseus-client'
import type { LeaderboardEntry, LeaderboardView } from '@/lib/theseus-ranking'

type Props = {
  // Changes whenever the player's saved progress changes, so the list reloads.
  refreshKey: number
  // Levels solved on this device that the server does not have yet (played before leaderboards existed).
  unsavedLevels: number
}

function Row({ entry }: { entry: LeaderboardEntry }) {
  return (
    <li className={`theseus-board-row${entry.isMe ? ' is-me' : ''}`} aria-current={entry.isMe ? 'true' : undefined}>
      <span className="theseus-board-rank">{entry.rank}</span>
      <span className="theseus-board-name">
        <strong>{entry.name}</strong>
        {entry.isMe && <em>You</em>}
        <small>{entry.solved} {entry.solved === 1 ? 'level' : 'levels'} solved</small>
      </span>
      <span className="theseus-board-num">{entry.farthest}</span>
      <span className="theseus-board-num">{entry.steps}</span>
    </li>
  )
}

export function TheseusLeaderboard({ refreshKey, unsavedLevels }: Props) {
  const [view, setView] = useState<LeaderboardView | null>(null)
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchLeaderboard()
      .then((next) => {
        if (!active) return
        setView(next)
        setFailed(false)
      })
      .catch(() => {
        if (active) setFailed(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [refreshKey, attempt])

  const retry = useCallback(() => setAttempt((value) => value + 1), [])
  const showMeSeparately = view?.me && !view.entries.some((entry) => entry.isMe)

  return (
    <div className="theseus-leaders" aria-busy={loading}>
      <p className="theseus-help">Ranked by the farthest level solved, then by fewest total steps. A step is one turn, a move or a wait.</p>
      {!view && loading && <div className="theseus-leaders-note" role="status">Loading the leaderboard…</div>}
      {failed && (
        <div className="theseus-leaders-note is-error" role="alert">
          <span>The leaderboard could not be loaded. You can keep playing, and your progress stays on this device.</span>
          <button className="theseus-secondary" type="button" onClick={retry}>Try again</button>
        </div>
      )}
      {view && view.entries.length === 0 && !failed && (
        <div className="theseus-leaders-note" role="status">No one is on the board yet. Solve a level to be the first.</div>
      )}
      {view && view.entries.length > 0 && (
        <div className={failed ? 'is-stale' : undefined}>
          <div className="theseus-board-head" aria-hidden="true">
            <span>#</span>
            <span>Player</span>
            <span>Level</span>
            <span>Steps</span>
          </div>
          <ol className="theseus-board-list" aria-label="Leaderboard">
            {view.entries.map((entry) => (
              <Row key={entry.rank} entry={entry} />
            ))}
          </ol>
          {showMeSeparately && view.me && (
            <ol className="theseus-board-list theseus-board-mine" aria-label="Your rank" start={view.me.rank}>
              <Row entry={view.me} />
            </ol>
          )}
          <p className="theseus-leaders-total">{view.total} {view.total === 1 ? 'player' : 'players'} ranked</p>
        </div>
      )}
      {unsavedLevels > 0 && !failed && (
        <p className="theseus-leaders-hint">
          {unsavedLevels} {unsavedLevels === 1 ? 'level' : 'levels'} you solved before the leaderboard existed {unsavedLevels === 1 ? 'is' : 'are'} not counted yet. Solve {unsavedLevels === 1 ? 'it' : 'them'} again to add {unsavedLevels === 1 ? 'it' : 'them'}.
        </p>
      )}
    </div>
  )
}
