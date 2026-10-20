// Leaderboard ranking for games with one score per player (Snake, and each Downhill Skiing course). Kept free of
// database code so the rules can be tested on their own.
//
// Rank order, best first:
//   1. Higher score.
//   2. Reached that score earlier (the time the player's best was set; a player who later fails to beat it keeps it).
//   3. Display name, then id, so the order is always total.

export const LEADERBOARD_SIZE = 20

// Names come from the auth user. A name that is really an email address, or an empty one, falls back to the email's
// local part so a full address is never shown.
export function displayName(name: string, email: string): string {
  const trimmed = name.trim()
  const candidate = trimmed.includes('@') ? trimmed.split('@')[0].trim() : trimmed
  if (candidate) return candidate.slice(0, 40)
  const local = email.split('@')[0].trim()
  return (local || 'Player').slice(0, 40)
}

// One player's best for one board, as stored.
export type ScoreRow = { userId: string; name: string; email: string; score: number; reachedAt: number /* epoch ms */ }

export type ScoreEntry = { rank: number; name: string; score: number; isMe: boolean }

export type ScoreLeaderboardView = { entries: ScoreEntry[]; me: ScoreEntry | null; total: number }

export function compareScores(a: ScoreRow, b: ScoreRow): number {
  return (
    b.score - a.score ||
    a.reachedAt - b.reachedAt ||
    displayName(a.name, a.email).localeCompare(displayName(b.name, b.email)) ||
    (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0)
  )
}

export function buildScoreLeaderboard(rows: ScoreRow[], meId: string | null, size = LEADERBOARD_SIZE): ScoreLeaderboardView {
  const ranked = [...rows].sort(compareScores).map((row, index): ScoreEntry => ({
    rank: index + 1,
    name: displayName(row.name, row.email),
    score: row.score,
    isMe: row.userId === meId,
  }))
  return { entries: ranked.slice(0, size), me: ranked.find((entry) => entry.isMe) ?? null, total: ranked.length }
}

// A score a game wants stored: which board it belongs to (a game with one board uses its own name), the score, and how
// long the run was in play. `RunCheck` is what a game's validator answers: 400 for a malformed request and 422 for
// numbers the game could not have produced.
export type ScoreRun = { board: string; score: number; durationMs: number }
export type RunCheck = { ok: true; run: ScoreRun } | { ok: false; status: 400 | 422; error: string }

export const isInt = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
