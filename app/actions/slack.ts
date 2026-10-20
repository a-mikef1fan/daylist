'use server'

import { auth } from '@/lib/auth'
import { getSlackMembers, type SlackMembersResult } from '@/lib/slack'
import { headers } from 'next/headers'

export async function listSlackMembers(): Promise<SlackMembersResult> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return getSlackMembers()
}
