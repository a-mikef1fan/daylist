// Leaderboard ranking for Theseus & the Minotaur. Kept free of database code so the rules can be tested on their own.
//
// Rank order, best first:
//   1. Farthest level solved (the highest level number with a verified solution; levels can be played in any order).
//   2. Fewer total steps (the sum of each solved level's best step count).
//   3. Reached that state earlier (the time of the user's most recent improvement).
//   4. Display name, then id, so the order is always total.

export type ProgressSummary = {
  userId: string
  name: string
  email: string
  // Highest solved level, 1-based (so it reads as "Level 7").
  farthest: number
  solved: number
  steps: number
  reachedAt: number // epoch ms
}

export type LeaderboardEntry = {
  rank: number
  name: string
  farthest: number
  solved: number
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
    solved: row.solved,
    steps: row.steps,
    isMe: row.userId === meId,
  }))
  return { entries: ranked.slice(0, size), me: ranked.find((entry) => entry.isMe) ?? null, total: ranked.length }
}
