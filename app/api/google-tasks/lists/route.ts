import { googleRoute, listGoogleTaskLists } from '@/lib/google-tasks-server'

export const dynamic = 'force-dynamic'

// GET /api/google-tasks/lists -> { lists: [{ id, title }] } (the user's Google task lists)
export const GET = googleRoute(async (userId, request) => ({ lists: await listGoogleTaskLists(userId, request.headers) }))
