// Sliding-window limiter kept in process memory. On serverless hosts each instance counts separately,
// so this is a cost guard against accidental floods, not a strict quota.

const hits = new Map<string, number[]>()

export function checkRateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs)
  if (recent.length >= limit) {
    hits.set(key, recent)
    return { ok: false, retryAfterSeconds: Math.ceil((recent[0] + windowMs - now) / 1000) }
  }
  recent.push(now)
  hits.set(key, recent)
  if (hits.size > 1000) {
    for (const [name, times] of hits) if (times.every((time) => now - time >= windowMs)) hits.delete(name)
  }
  return { ok: true, retryAfterSeconds: 0 }
}
