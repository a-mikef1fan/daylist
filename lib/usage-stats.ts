import { and, desc, gte, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { usageEvents } from '@/lib/db/schema'

export const RANGES = {
  '24h': { label: 'Last 24 hours', buckets: 24, unit: 'hour' },
  '7d': { label: 'Last 7 days', buckets: 7, unit: 'day' },
  '30d': { label: 'Last 30 days', buckets: 30, unit: 'day' },
} as const

export type RangeKey = keyof typeof RANGES

export function parseRange(value: string | string[] | undefined): RangeKey {
  const key = Array.isArray(value) ? value[0] : value
  return key && key in RANGES ? (key as RangeKey) : '7d'
}

const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000

const pad = (value: number) => String(value).padStart(2, '0')

// Buckets are aligned to UTC hours or days; keys match the to_char formats used in the SQL below.
function bucketKey(date: Date, unit: 'hour' | 'day') {
  const day = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
  return unit === 'hour' ? `${day}T${pad(date.getUTCHours())}` : day
}

export async function getUsageStats(range: RangeKey) {
  const { buckets, unit } = RANGES[range]
  const step = unit === 'hour' ? HOUR_MS : DAY_MS
  const now = new Date()
  const currentBucket = Math.floor(now.getTime() / step) * step
  const since = new Date(currentBucket - (buckets - 1) * step)
  const inRange = gte(usageEvents.createdAt, since)
  const countWhere = (name: string) => sql<number>`count(*) filter (where ${usageEvents.name} = ${name})::int`
  const count = sql<number>`count(*)::int`
  const uniqueUsers = sql<number>`count(distinct ${usageEvents.userId})::int`
  const bucketFormat = unit === 'hour' ? 'YYYY-MM-DD"T"HH24' : 'YYYY-MM-DD'
  const bucketExpr = sql<string>`to_char(date_trunc(${sql.raw(`'${unit}'`)}, ${usageEvents.createdAt} at time zone 'UTC'), ${sql.raw(`'${bucketFormat}'`)})`

  const [totals, seriesRows, features, pages, recent] = await Promise.all([
    db
      .select({
        events: count,
        pageViews: countWhere('page_view'),
        users: uniqueUsers,
        tasksCreated: countWhere('task_created'),
        tasksCompleted: countWhere('task_completed'),
        gamesStarted: countWhere('game_started'),
      })
      .from(usageEvents)
      .where(inRange),
    db
      .select({
        bucket: bucketExpr,
        pageViews: countWhere('page_view'),
        events: sql<number>`count(*) filter (where ${usageEvents.name} <> 'page_view')::int`,
      })
      .from(usageEvents)
      .where(inRange)
      .groupBy(bucketExpr),
    db
      .select({
        name: usageEvents.name,
        count,
        users: uniqueUsers,
        lastSeen: sql<Date>`max(${usageEvents.createdAt})`.mapWith(usageEvents.createdAt),
      })
      .from(usageEvents)
      .where(and(inRange, sql`${usageEvents.name} <> 'page_view'`))
      .groupBy(usageEvents.name)
      .orderBy(desc(count)),
    db
      .select({ path: usageEvents.path, count, users: uniqueUsers })
      .from(usageEvents)
      .where(and(inRange, sql`${usageEvents.name} = 'page_view'`))
      .groupBy(usageEvents.path)
      .orderBy(desc(count))
      .limit(10),
    db
      .select({
        id: usageEvents.id,
        name: usageEvents.name,
        path: usageEvents.path,
        userId: usageEvents.userId,
        metadata: usageEvents.metadata,
        createdAt: usageEvents.createdAt,
      })
      .from(usageEvents)
      .where(inRange)
      .orderBy(desc(usageEvents.createdAt))
      .limit(25),
  ])

  const byBucket = new Map(seriesRows.map((row) => [row.bucket, row]))
  const series = Array.from({ length: buckets }, (_, index) => {
    const start = new Date(since.getTime() + index * step)
    const row = byBucket.get(bucketKey(start, unit))
    return { start: start.toISOString(), pageViews: row?.pageViews ?? 0, events: row?.events ?? 0 }
  })

  return { range, unit, since, totals: totals[0], series, features, pages, recent }
}

export type UsageStats = Awaited<ReturnType<typeof getUsageStats>>
