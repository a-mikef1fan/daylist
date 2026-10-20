import { after } from 'next/server'
import { db } from '@/lib/db'
import { usageEvents } from '@/lib/db/schema'

// Events the browser may report through POST /api/track. Everything else is recorded server-side.
export const CLIENT_EVENTS = ['page_view', 'game_opened', 'game_started', 'game_over', 'filter_changed', 'search_used'] as const
export const SERVER_EVENTS = ['task_created', 'task_completed', 'task_uncompleted', 'task_deleted'] as const

export type UsageEventName = (typeof CLIENT_EVENTS)[number] | (typeof SERVER_EVENTS)[number]
export type UsageMetadata = Record<string, string | number | boolean>

// Human-readable names for the dashboard.
export const EVENT_LABELS: Record<string, string> = {
  page_view: 'Page views',
  task_created: 'Task created',
  task_completed: 'Task completed',
  task_uncompleted: 'Task marked incomplete',
  task_deleted: 'Task deleted',
  filter_changed: 'Filter changed',
  search_used: 'Search used',
  game_opened: 'Game opened',
  game_started: 'Game started',
  game_over: 'Game finished',
}

/**
 * Records a usage event without ever throwing or delaying the caller. The write runs after the
 * response is sent when possible. Keep metadata to small enums and numbers, never personal content.
 */
export function trackEvent(
  name: UsageEventName,
  { userId, path, metadata }: { userId?: string | null; path?: string | null; metadata?: UsageMetadata } = {},
) {
  const write = async () => {
    try {
      await db.insert(usageEvents).values({
        id: crypto.randomUUID(),
        name,
        path: path ?? null,
        userId: userId ?? null,
        metadata: metadata ?? null,
      })
    } catch (error) {
      console.error('trackEvent failed', name, error instanceof Error ? error.message : error)
    }
  }
  try {
    after(write)
  } catch {
    // Outside a request scope `after` throws; fall back to a fire-and-forget write.
    void write()
  }
}
