import { getGoogleStatus, googleRoute } from '@/lib/google-tasks-server'

export const dynamic = 'force-dynamic'

// GET /api/google-tasks/status -> { configured, connected, hasTasksScope, listId, lastSyncedAt, lastResult }
export const GET = googleRoute((userId) => getGoogleStatus(userId))
