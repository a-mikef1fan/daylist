import { disconnectGoogle, googleRoute } from '@/lib/google-tasks-server'

export const dynamic = 'force-dynamic'

// POST /api/google-tasks/disconnect: forget the stored Google tokens. Imported
// tasks stay in daylist.
export const POST = googleRoute(
  async (userId) => {
    await disconnectGoogle(userId)
    return { ok: true }
  },
  { mutating: true },
)
