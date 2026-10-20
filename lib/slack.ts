import type { Assignee } from '@/lib/db/schema'

export type SlackMember = Assignee
export type SlackMembersResult = { members: SlackMember[]; connected: boolean }

export const SLACK_ID_PATTERN = /^[UW][A-Z0-9]+$/
export const ASSIGNEE_NAME_MAX = 80

const CACHE_TTL_MS = 5 * 60 * 1000
const MAX_PAGES = 25
let cache: { members: SlackMember[]; expiresAt: number } | null = null

type SlackApiUser = {
  id: string
  deleted?: boolean
  is_bot?: boolean
  is_app_user?: boolean
  name?: string
  real_name?: string
  profile?: { display_name?: string; real_name?: string; image_48?: string }
}

// Lists workspace members through Slack's users.list. Only id, name and image leave this module (never emails).
// Never throws: a missing token or a Slack error returns connected: false so the UI can show a hint.
export async function getSlackMembers(): Promise<SlackMembersResult> {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) return { members: [], connected: false }
  if (cache && cache.expiresAt > Date.now()) return { members: cache.members, connected: true }

  try {
    const members: SlackMember[] = []
    let cursor = ''
    for (let page = 0; page < MAX_PAGES; page++) {
      const url = new URL('https://slack.com/api/users.list')
      url.searchParams.set('limit', '200')
      if (cursor) url.searchParams.set('cursor', cursor)
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      if (!response.ok) throw new Error(`Slack responded with ${response.status}`)
      const data = (await response.json()) as {
        ok: boolean
        error?: string
        members?: SlackApiUser[]
        response_metadata?: { next_cursor?: string }
      }
      if (!data.ok) throw new Error(`Slack error: ${data.error ?? 'unknown'}`)

      for (const user of data.members ?? []) {
        if (user.deleted || user.is_bot || user.is_app_user || user.id === 'USLACKBOT') continue
        if (typeof user.id !== 'string' || !SLACK_ID_PATTERN.test(user.id)) continue
        const name = (user.profile?.display_name || user.profile?.real_name || user.real_name || user.name || '').trim()
        if (!name) continue
        const image = user.profile?.image_48
        members.push({
          id: user.id,
          name: name.slice(0, ASSIGNEE_NAME_MAX),
          image: typeof image === 'string' && image.startsWith('https://') ? image : null,
        })
      }

      cursor = data.response_metadata?.next_cursor ?? ''
      if (!cursor) break
    }
    members.sort((a, b) => a.name.localeCompare(b.name))
    cache = { members, expiresAt: Date.now() + CACHE_TTL_MS }
    return { members, connected: true }
  } catch (error) {
    // Log the failure reason only; the token is never included.
    console.error('Slack member lookup failed:', error instanceof Error ? error.message : 'unknown error')
    return { members: [], connected: false }
  }
}
