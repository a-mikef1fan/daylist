'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { fetchBoard, type BoardView, type ScoreGameId } from '@/lib/score-client'
import type { ScoreEntry } from '@/lib/score-ranking'
import './game-leaderboard.css'

export type GameTab = 'play' | 'leaderboard'

// The Play / Leaderboard switch shown under a game's heading (same look as the Theseus one).
export function GameTabs({ tab, onChange }: { tab: GameTab; onChange: (tab: GameTab) => void }) {
  return (
    <div className="game-tabs" role="group" aria-label="Game view">
      <button type="button" className="game-tab" aria-pressed={tab === 'play'} onClick={() => onChange('play')}>Play</button>
      <button type="button" className="game-tab" aria-pressed={tab === 'leaderboard'} onClick={() => onChange('leaderboard')}>Leaderboard</button>
    </div>
  )
}

function Row({ entry }: { entry: ScoreEntry }) {
  return (
    <li className={`game-board-row${entry.isMe ? ' is-me' : ''}`} aria-current={entry.isMe ? 'true' : undefined}>
      <span className="game-board-rank">{entry.rank}</span>
      <span className="game-board-name">
        <strong>{entry.name}</strong>
        {entry.isMe && <em>You</em>}
      </span>
      <span className="game-board-num">{entry.score}</span>
    </li>
  )
}

type Props = {
  game: ScoreGameId
  // Which board to show for a game with several (the skiing course); omit for a game with one.
  board?: string
  // Changes whenever the player's saved scores change, so the list reloads.
  refreshKey: number
  // How the ranking works, in a sentence or two.
  help: ReactNode
  // Shown above the list, e.g. the skiing course picker.
  controls?: ReactNode
}

export function GameLeaderboard({ game, board, refreshKey, help, controls }: Props) {
  const [view, setView] = useState<BoardView | null>(null)
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchBoard(game, board)
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
  }, [game, board, refreshKey, attempt])

  const retry = useCallback(() => setAttempt((value) => value + 1), [])
  // A view that is still for the previous board (the next one is loading) is not shown as if it were this board's.
  const shown = view && (board === undefined || view.board === board) ? view : null
  const showMeSeparately = shown?.me && !shown.entries.some((entry) => entry.isMe)

  return (
    <div className="game-leaders" aria-busy={loading}>
      <p className="game-board-help">{help}</p>
      {controls}
      {!shown && loading && <div className="game-leaders-note" role="status">Loading the leaderboard…</div>}
      {failed && (
        <div className="game-leaders-note is-error" role="alert">
          <span>The leaderboard could not be loaded. You can keep playing, and your best score stays on this device.</span>
          <button className="game-leaders-retry" type="button" onClick={retry}>Try again</button>
        </div>
      )}
      {shown && shown.entries.length === 0 && !failed && (
        <div className="game-leaders-note" role="status">No one is on the board yet. Finish a run to be the first.</div>
      )}
      {shown && shown.entries.length > 0 && (
        <div className={failed || loading ? 'is-stale' : undefined}>
          <div className="game-board-head" aria-hidden="true">
            <span>#</span>
            <span>Player</span>
            <span>Score</span>
          </div>
          <ol className="game-board-list" aria-label="Leaderboard">
            {shown.entries.map((entry) => (
              <Row key={entry.rank} entry={entry} />
            ))}
          </ol>
          {showMeSeparately && shown.me && (
            <ol className="game-board-list game-board-mine" aria-label="Your rank" start={shown.me.rank}>
              <Row entry={shown.me} />
            </ol>
          )}
          <p className="game-leaders-total">{shown.total} {shown.total === 1 ? 'player' : 'players'} ranked</p>
        </div>
      )}
    </div>
  )
}
