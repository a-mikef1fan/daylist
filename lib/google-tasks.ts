// Google Tasks integration: a small fetch-based API client plus the pure mapping
// and planning logic used by the sync. Nothing here touches the database or Better
// Auth, and there are no path-alias imports, so it can be unit tested with
// `node --test` (see lib/google-tasks.test.ts).

export const GOOGLE_TASKS_SCOPE = 'https://www.googleapis.com/auth/tasks'
export const GOOGLE_TASKS_API = 'https://tasks.googleapis.com/tasks/v1'
export const DEFAULT_LIST_ID = '@default'

// Daylist's own limits (see createTask in app/actions/tasks.ts).
const MAX_TITLE_LENGTH = 180
// Safety caps so one sync cannot run away on a huge list.
const PAGE_SIZE = 100
const MAX_PAGES = 10

export function isGoogleConfigured(env: Record<string, string | undefined> = process.env) {
  return Boolean(env.GOOGLE_CLIENT_ID?.trim() && env.GOOGLE_CLIENT_SECRET?.trim())
}

// Better Auth stores the granted scopes comma separated; Google itself uses spaces.
export function hasTasksScope(scope: string | null | undefined) {
  if (!scope) return false
  return scope.split(/[\s,]+/).includes(GOOGLE_TASKS_SCOPE)
}

// ---------------------------------------------------------------------------
// Types

export type GoogleTaskList = { id: string; title: string }

export type GoogleTask = {
  id: string
  title?: string
  notes?: string
  status?: 'needsAction' | 'completed'
  due?: string
  completed?: string
  updated?: string
  deleted?: boolean
  hidden?: boolean
}

// The slice of a local tasks row the planner needs.
export type LocalGoogleTask = {
  id: string
  googleTaskId: string
  googleListId: string | null
  completed: boolean
  updatedAt: Date
  googleSyncedAt: Date | null
}

export type ImportedTask = {
  googleTaskId: string
  googleListId: string
  title: string
  description: string | null
  dueDate: string | null
  completed: boolean
}

export type SyncPlan = {
  toInsert: ImportedTask[]
  // Local rows whose completed state should become the Google state.
  pullCompletion: { id: string; completed: boolean }[]
  // Local rows (with a pending local change) whose state should be pushed to Google.
  pushCompletion: { id: string; googleTaskId: string; googleListId: string; completed: boolean }[]
  // Linked rows that already match Google but still looked changed locally.
  markSynced: string[]
  skipped: number
}

export type SyncSummary = {
  imported: number
  pulled: number
  pushed: number
  skipped: number
  // Local changes we could not push (they are retried on the next sync).
  pushFailed: number
}

// ---------------------------------------------------------------------------
// Errors

export type GoogleErrorKind = 'reconnect' | 'api_disabled' | 'rate_limited' | 'other'

export class GoogleApiError extends Error {
  readonly status: number
  readonly kind: GoogleErrorKind
  constructor(status: number, kind: GoogleErrorKind, message: string) {
    super(message)
    this.name = 'GoogleApiError'
    this.status = status
    this.kind = kind
  }
}

type GoogleErrorBody = {
  error?: { message?: string; status?: string; errors?: { reason?: string }[] }
}

export function classifyGoogleError(status: number, body: unknown): GoogleApiError {
  const error = (body as GoogleErrorBody | null)?.error
  const reason = error?.errors?.[0]?.reason ?? ''
  const message = error?.message ?? ''
  if (status === 401) {
    return new GoogleApiError(status, 'reconnect', 'Google rejected the saved sign-in.')
  }
  if (status === 403) {
    if (reason === 'accessNotConfigured' || /has not been used|is disabled|SERVICE_DISABLED/i.test(message)) {
      return new GoogleApiError(status, 'api_disabled', 'The Google Tasks API is not enabled for this Google Cloud project.')
    }
    if (reason === 'rateLimitExceeded' || reason === 'userRateLimitExceeded') {
      return new GoogleApiError(status, 'rate_limited', 'Google is rate limiting requests.')
    }
    return new GoogleApiError(status, 'reconnect', 'Google did not allow access to Tasks.')
  }
  if (status === 429) return new GoogleApiError(status, 'rate_limited', 'Google is rate limiting requests.')
  return new GoogleApiError(status, 'other', `Google Tasks returned an error (HTTP ${status}).`)
}

// ---------------------------------------------------------------------------
// API client

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export function createGoogleTasksClient(accessToken: string, fetchImpl: FetchLike = fetch) {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetchImpl(`${GOOGLE_TASKS_API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
      cache: 'no-store',
    })
    if (!response.ok) {
      let body: unknown = null
      try {
        body = await response.json()
      } catch {
        // Non-JSON error body; classify by status alone.
      }
      throw classifyGoogleError(response.status, body)
    }
    return (await response.json()) as T
  }

  return {
    async listTaskLists(): Promise<GoogleTaskList[]> {
      const lists: GoogleTaskList[] = []
      let pageToken: string | undefined
      for (let page = 0; page < MAX_PAGES; page++) {
        const params = new URLSearchParams({ maxResults: '100' })
        if (pageToken) params.set('pageToken', pageToken)
        const data = await request<{ items?: { id: string; title?: string }[]; nextPageToken?: string }>(
          `/users/@me/lists?${params}`,
        )
        for (const item of data.items ?? []) lists.push({ id: item.id, title: item.title || 'Untitled list' })
        pageToken = data.nextPageToken
        if (!pageToken) break
      }
      return lists
    },

    // Includes completed and hidden tasks so completion changes can be pulled;
    // deleted tasks are not requested.
    async listTasks(listId: string): Promise<GoogleTask[]> {
      const tasks: GoogleTask[] = []
      let pageToken: string | undefined
      for (let page = 0; page < MAX_PAGES; page++) {
        const params = new URLSearchParams({
          maxResults: String(PAGE_SIZE),
          showCompleted: 'true',
          showHidden: 'true',
        })
        if (pageToken) params.set('pageToken', pageToken)
        const data = await request<{ items?: GoogleTask[]; nextPageToken?: string }>(
          `/lists/${encodeURIComponent(listId)}/tasks?${params}`,
        )
        tasks.push(...(data.items ?? []))
        pageToken = data.nextPageToken
        if (!pageToken) break
      }
      return tasks
    },

    async setCompleted(listId: string, taskId: string, completed: boolean, now: Date = new Date()): Promise<void> {
      await request(`/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`, {
        method: 'PATCH',
        body: JSON.stringify(
          completed ? { status: 'completed', completed: now.toISOString() } : { status: 'needsAction', completed: null },
        ),
      })
    },
  }
}

export type GoogleTasksClient = ReturnType<typeof createGoogleTasksClient>

// ---------------------------------------------------------------------------
// Mapping and planning (pure)

// Google's `due` is an RFC 3339 timestamp whose time part is always midnight UTC
// (only the date is meaningful), so the date is taken from the string as-is.
export function dueToDate(due: string | undefined): string | null {
  const match = due ? /^(\d{4}-\d{2}-\d{2})/.exec(due) : null
  if (!match) return null
  const parsed = new Date(`${match[1]}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== match[1]) return null
  return match[1]
}

// Returns null for tasks that should not be imported: deleted, hidden, or without a
// usable title.
export function mapGoogleTask(task: GoogleTask, listId: string): ImportedTask | null {
  if (!task.id || task.deleted || task.hidden) return null
  const title = (task.title ?? '').trim()
  if (!title) return null
  const notes = task.notes?.trim()
  return {
    googleTaskId: task.id,
    googleListId: listId,
    title: title.length > MAX_TITLE_LENGTH ? `${title.slice(0, MAX_TITLE_LENGTH - 1)}…` : title,
    description: notes || null,
    dueDate: dueToDate(task.due),
    completed: task.status === 'completed',
  }
}

// Decides what a sync should do, given the remote tasks of one list and the local
// tasks already linked to Google tasks.
//
// - Unknown remote tasks are imported (deduped by Google task id).
// - Linked tasks whose completed state differs: if the local copy was changed after
//   the last successful sync (for example a push that failed), the local state wins
//   and is pushed; otherwise the Google state is pulled.
// - Deleted or hidden remote tasks never create new tasks; a linked one that is
//   completed on Google's side (hidden = cleared completed) is still pulled.
export function planSync(remote: GoogleTask[], local: LocalGoogleTask[], listId: string): SyncPlan {
  const localByGoogleId = new Map(local.map((task) => [task.googleTaskId, task]))
  const seen = new Set<string>()
  const plan: SyncPlan = { toInsert: [], pullCompletion: [], pushCompletion: [], markSynced: [], skipped: 0 }

  for (const task of remote) {
    if (!task.id || seen.has(task.id)) continue
    seen.add(task.id)
    const linked = localByGoogleId.get(task.id)

    if (!linked) {
      const mapped = mapGoogleTask(task, listId)
      if (mapped) plan.toInsert.push(mapped)
      else plan.skipped++
      continue
    }

    if (task.deleted) continue
    const remoteCompleted = task.status === 'completed'
    const locallyChanged = linked.googleSyncedAt !== null && linked.updatedAt > linked.googleSyncedAt
    if (remoteCompleted === linked.completed) {
      if (locallyChanged) plan.markSynced.push(linked.id)
      continue
    }
    if (locallyChanged) {
      plan.pushCompletion.push({
        id: linked.id,
        googleTaskId: task.id,
        googleListId: linked.googleListId ?? listId,
        completed: linked.completed,
      })
    } else {
      plan.pullCompletion.push({ id: linked.id, completed: remoteCompleted })
    }
  }
  return plan
}
