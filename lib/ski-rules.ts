import { isInt, type RunCheck } from '@/lib/score-ranking'

// Courses and what counts as a believable Downhill Skiing result. The run happens in the browser with random obstacles,
// so the server cannot replay it the way it does for Theseus; it only rejects numbers the game could not have produced.
//
// A run's score is distance points (slope travelled / METERS_PER_POINT, at most the course's finishPoints) plus bonus
// points. Bonus points come from events that need a row of the course to be crossed (a gate, or a kicker, rail or box),
// and rows are at least spawnMin apart on the slope, so the number of events is bounded by the course length.
export const SKI_COURSES = ['trees', 'groomed', 'park'] as const
export type SkiCourse = (typeof SKI_COURSES)[number]

export const DEFAULT_SKI_COURSE: SkiCourse = 'trees'

export function isSkiCourse(value: unknown): value is SkiCourse {
  return typeof value === 'string' && (SKI_COURSES as readonly string[]).includes(value)
}

// Slope pixels per distance point. Mirrors METERS_PER_POINT in components/ski-game.tsx.
const PIXELS_PER_POINT = 20

type CourseRules = {
  finishPoints: number // length of the course in distance points (the game imports this)
  startSpeed: number // px per second; the skier never goes slower
  maxSpeed: number // px per second
  spawnMin: number // closest two rows can be, in slope px
  maxBonusPerRow: number // most a single row can pay: gate 25 + 4 * 5 streak, or the best kicker/rail landing chain
}

// speed, spawn and bonus numbers mirror the MODES table and bonus rules in components/ski-game.tsx; they only need to
// stay at least as generous as the game, since they are upper bounds.
export const SKI_RULES: Record<SkiCourse, CourseRules> = {
  trees: { finishPoints: 1150, startSpeed: 170, maxSpeed: 430, spawnMin: 105, maxBonusPerRow: 45 },
  groomed: { finishPoints: 1000, startSpeed: 140, maxSpeed: 330, spawnMin: 140, maxBonusPerRow: 45 },
  park: { finishPoints: 1100, startSpeed: 185, maxSpeed: 380, spawnMin: 190, maxBonusPerRow: 200 },
}

export const SKI_LABELS: Record<SkiCourse, string> = { trees: 'Trees', groomed: 'Groomed run', park: 'Terrain park' }

// Rows (gates, kickers, rails, boxes) that can have been crossed after `points` of distance.
function rowsWithin(rules: CourseRules, points: number): number {
  return Math.ceil((points * PIXELS_PER_POINT) / rules.spawnMin) + 1
}

export function skiMaxScore(course: SkiCourse): number {
  const rules = SKI_RULES[course]
  return rules.finishPoints + rowsWithin(rules, rules.finishPoints) * rules.maxBonusPerRow
}

// Request body: { course, score, distance, durationMs }. `distance` is the distance part of the score (points for the
// slope covered, 0 to the course length) and `durationMs` is how long the run was in play (simulated time, so time
// spent paused does not count). The rest of the score is bonus, so score - distance has to be explainable by the rows
// crossed within that distance, and the time has to fit the speeds the course allows: the skier is never slower than
// startSpeed (so a run cannot last longer than the distance divided by it) nor faster than maxSpeed.
export function validateSkiRun(body: Record<string, unknown>): RunCheck {
  const { course, score, distance, durationMs } = body
  if (!isSkiCourse(course)) return { ok: false, status: 400, error: 'Unknown course.' }
  const rules = SKI_RULES[course]
  if (!isInt(score, 1, 1_000_000)) return { ok: false, status: 400, error: 'Invalid score.' }
  if (!isInt(distance, 0, rules.finishPoints)) return { ok: false, status: 400, error: 'Invalid distance.' }
  if (!isInt(durationMs, 0, 1_000_000_000)) return { ok: false, status: 400, error: 'Invalid duration.' }

  const bonus = score - distance
  if (bonus < 0) return { ok: false, status: 422, error: 'The score is lower than the distance covered.' }
  if (bonus > rowsWithin(rules, distance) * rules.maxBonusPerRow) return { ok: false, status: 422, error: 'That much bonus is not possible over that distance.' }
  const minMs = Math.floor((distance * PIXELS_PER_POINT * 1000) / rules.maxSpeed)
  const maxMs = Math.ceil(((distance + 1) * PIXELS_PER_POINT * 1000) / rules.startSpeed) + 2000
  if (durationMs < minMs) return { ok: false, status: 422, error: 'That run was too short for that distance.' }
  if (durationMs > maxMs) return { ok: false, status: 422, error: 'That run was too long for that distance.' }
  return { ok: true, run: { board: course, score, durationMs } }
}
