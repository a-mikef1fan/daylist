const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/** True for a real calendar date in `YYYY-MM-DD` form (rejects e.g. `2026-02-30`). */
export function isValidDueDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_ONLY.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}
