// Leaderboard ranking for Theseus & the Minotaur. Kept free of database code so the rules can be tested on their own.
//
// Rank order, best first:
//   1. Farthest level reached: the highest N such that levels 1..N are all solved. Levels can be played in any order,
//      but a solved level past a gap does not count until the gap is filled.
//   2. Fewer total steps: the sum of the best step counts of those N levels. A step is one turn, a move or a wait.
//   3. Reached that state earlier (the time of the most recent improvement among those levels).
//   4. Display name, then id, so the order is always total.

// One solved level for one user, as stored.
export type SolvedLevel = { level: number; bestMoves: number; solvedAt: number /* epoch ms of last improvement */ }

export type ProgressSummary = {
  userId: string
  name: string
  email: string
  // Levels 1..farthest are all solved (0 when level 1 is not solved yet).
  farthest: number
  steps: number // total over levels 1..farthest
  reachedAt: number // epoch ms
}

export type LeaderboardEntry = {
  rank: number
  name: string
  farthest: number
  steps: number
  isMe: boolean
}

export type LeaderboardView = { entries: LeaderboardEntry[]; me: LeaderboardEntry | null; total: number }

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

// Reduce a user's solved levels (any order, level indexes from 0) to their ranking summary.
export function summarizeProgress(user: { userId: string; name: string; email: string }, solved: SolvedLevel[]): ProgressSummary {
  const byLevel = new Map(solved.map((row) => [row.level, row]))
  let farthest = 0
  let steps = 0
  let reachedAt = 0
  for (let row = byLevel.get(0); row; row = byLevel.get(farthest)) {
    farthest += 1
    steps += row.bestMoves
    reachedAt = Math.max(reachedAt, row.solvedAt)
  }
  // With nothing in a row yet there is no state to reach; fall back to the latest activity so the order stays stable.
  if (farthest === 0) reachedAt = solved.reduce((latest, row) => Math.max(latest, row.solvedAt), 0)
  return { ...user, farthest, steps, reachedAt }
}

export function compareProgress(a: ProgressSummary, b: ProgressSummary): number {
  return (
    b.farthest - a.farthest ||
    a.steps - b.steps ||
    a.reachedAt - b.reachedAt ||
    displayName(a.name, a.email).localeCompare(displayName(b.name, b.email)) ||
    (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0)
  )
}

export function buildLeaderboard(rows: ProgressSummary[], meId: string | null, size = LEADERBOARD_SIZE): LeaderboardView {
  const ranked = [...rows].sort(compareProgress).map((row, index): LeaderboardEntry => ({
    rank: index + 1,
    name: displayName(row.name, row.email),
    farthest: row.farthest,
    steps: row.steps,
    isMe: row.userId === meId,
  }))
  return { entries: ranked.slice(0, size), me: ranked.find((entry) => entry.isMe) ?? null, total: ranked.length }
}
