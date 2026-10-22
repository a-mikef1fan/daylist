import { RequestError, googleRoute, isValidListId, syncGoogleTasks } from '@/lib/google-tasks-server'

export const dynamic = 'force-dynamic'
// A sync makes several sequential Google calls; allow more than the default.
export const maxDuration = 60

// POST /api/google-tasks/sync  body (optional): { listId?: string }
// Imports new tasks from the chosen Google list (default: the saved list, else
// "@default") and syncs completion in both directions.
export const POST = googleRoute(
  async (userId, request) => {
    const body = (await request.json().catch(() => null)) as { listId?: unknown } | null
    if (body?.listId !== undefined && !isValidListId(body.listId)) throw new RequestError('invalid_list')
    return syncGoogleTasks(userId, request.headers, body?.listId as string | undefined)
  },
  { mutating: true },
)
