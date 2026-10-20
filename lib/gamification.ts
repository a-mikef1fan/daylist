// Pure gamification rules for daylist: XP, levels, daily streaks and achievements.
// No I/O and no framework imports so everything here is unit-testable (see gamification.test.ts).
//
// XP
//   - Completing a task earns BASE_XP (10).
//   - +5 if the task is high priority.
//   - +5 if it has a due date and is completed on or before that date.
//   - The daily habit earns HABIT_XP (10).
//   Un-completing a task deletes its XP grant, so toggling never farms XP.
//
// Levels
//   Total XP needed to reach level n is xpForLevel(n) = 25 * n * (n - 1):
//   L1 = 0, L2 = 50, L3 = 150, L4 = 300, L5 = 500 ... (each level costs 50 XP more than the last).
//
// Streaks and time zones
//   A "day" is the user's LOCAL calendar date as a 'YYYY-MM-DD' string. The browser computes it and
//   sends it with each completion; the server never converts time zones. Each XP grant is stamped
//   with that date. A streak is a run of consecutive dates that each have at least one grant. The
//   current streak is still alive if the last active date is today or yesterday (so it does not
//   read 0 until a whole day has been missed). The server rejects dates more than one day away from
//   its own UTC date, which covers every real time zone (UTC-12 to UTC+14).

export const BASE_XP = 10
export const HIGH_PRIORITY_BONUS = 5
export const ON_TIME_BONUS = 5
export const HABIT_XP = 10

export const DAILY_HABIT = { key: 'affirmations', title: 'Positive affirmations to self' } as const

export type DateKey = string // 'YYYY-MM-DD'

export function taskXp(input: { priority: string; dueDate: DateKey | null; completedOn: DateKey }): number {
  let xp = BASE_XP
  if (input.priority === 'high') xp += HIGH_PRIORITY_BONUS
  if (input.dueDate && input.completedOn <= input.dueDate) xp += ON_TIME_BONUS
  return xp
}

/** Total XP required to reach `level` (level 1 needs 0). */
export function xpForLevel(level: number): number {
  const n = Math.max(1, Math.floor(level))
  return 25 * n * (n - 1)
}

export function levelFromXp(xp: number): number {
  const safe = Math.max(0, Math.floor(xp))
  let level = Math.floor((1 + Math.sqrt(1 + (4 * safe) / 25)) / 2)
  // Guard against floating point error at exact thresholds.
  while (xpForLevel(level + 1) <= safe) level++
  while (level > 1 && xpForLevel(level) > safe) level--
  return Math.max(1, level)
}

export type LevelProgress = {
  level: number
  xpIntoLevel: number
  xpForNextLevel: number // size of the current level's XP band
  xpToNext: number
  fraction: number // 0..1
}

export function levelProgress(xp: number): LevelProgress {
  const total = Math.max(0, Math.floor(xp))
  const level = levelFromXp(total)
  const floor = xpForLevel(level)
  const band = xpForLevel(level + 1) - floor
  const xpIntoLevel = total - floor
  return { level, xpIntoLevel, xpForNextLevel: band, xpToNext: band - xpIntoLevel, fraction: xpIntoLevel / band }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const DAY_MS = 86_400_000

export function isValidDateKey(value: unknown): value is DateKey {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

/** Calendar-date arithmetic in UTC, so DST never shifts a date. */
export function addDays(value: DateKey, days: number): DateKey {
  return new Date(new Date(`${value}T00:00:00.000Z`).getTime() + days * DAY_MS).toISOString().slice(0, 10)
}

/** True when a client-reported local date is within one day of the server's UTC date. */
export function isPlausibleLocalDate(value: DateKey, now: Date = new Date()): boolean {
  const utcToday = now.toISOString().slice(0, 10)
  return value >= addDays(utcToday, -1) && value <= addDays(utcToday, 1)
}

export type StreakSummary = { currentStreak: number; bestStreak: number; lastActiveDate: DateKey | null }

/** Streaks from any list of active dates (duplicates and order are fine). `current` is the run ending at the latest date. */
export function computeStreaks(dates: Iterable<DateKey>): StreakSummary {
  const sorted = [...new Set(dates)].sort()
  if (sorted.length === 0) return { currentStreak: 0, bestStreak: 0, lastActiveDate: null }
  let best = 1
  let run = 1
  for (let i = 1; i < sorted.length; i++) {
    run = sorted[i] === addDays(sorted[i - 1], 1) ? run + 1 : 1
    if (run > best) best = run
  }
  return { currentStreak: run, bestStreak: best, lastActiveDate: sorted[sorted.length - 1] }
}

/** The streak to show right now: the stored run, unless it already lapsed (last active before yesterday). */
export function effectiveStreak(stats: Pick<StreakSummary, 'currentStreak' | 'lastActiveDate'>, today: DateKey): number {
  if (!stats.lastActiveDate) return 0
  return stats.lastActiveDate === today || stats.lastActiveDate === addDays(today, -1) ? stats.currentStreak : 0
}

export type Progress = StreakSummary & {
  totalXp: number
  tasksCompleted: number
  /** Local dates (newest first, max 3) on which the daily habit was done. */
  habitDoneDates: DateKey[]
}

export const emptyProgress: Progress = {
  totalXp: 0,
  tasksCompleted: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastActiveDate: null,
  habitDoneDates: [],
}

export type Achievement = { id: string; label: string; description: string; unlocked: (p: Progress) => boolean }

export const achievements: Achievement[] = [
  { id: 'first-task', label: 'First step', description: 'Complete your first task', unlocked: (p) => p.tasksCompleted >= 1 },
  { id: 'ten-tasks', label: 'On a roll', description: 'Complete 10 tasks', unlocked: (p) => p.tasksCompleted >= 10 },
  { id: 'seven-day-streak', label: 'Week warrior', description: 'Reach a 7 day streak', unlocked: (p) => p.bestStreak >= 7 },
]

export function unlockedAchievementIds(progress: Progress): string[] {
  return achievements.filter((a) => a.unlocked(progress)).map((a) => a.id)
}

export function isHabitDoneToday(progress: Progress, today: DateKey): boolean {
  return progress.habitDoneDates.includes(today)
}
