// Server-side glue for the Google Tasks integration: connection state, access
// tokens (via Better Auth, which refreshes them), and the sync itself. Tokens stay
// on the server and are never logged or returned to the client.

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { account, googleTasksSync, tasks } from '@/lib/db/schema'
import {
  DEFAULT_LIST_ID,
  GoogleApiError,
  createGoogleTasksClient,
  hasTasksScope,
  isGoogleConfigured,
  planSync,
  type GoogleTaskList,
  type GoogleTasksClient,
  type SyncSummary,
} from '@/lib/google-tasks'
import { and, eq, inArray, isNotNull } from 'drizzle-orm'

export type SyncErrorCode = 'not_configured' | 'not_connected' | 'reconnect' | 'api_disabled' | 'rate_limited' | 'failed'

export class GoogleSyncError extends Error {
  readonly code: SyncErrorCode
  constructor(code: SyncErrorCode, message: string) {
    super(message)
    this.name = 'GoogleSyncError'
    this.code = code
  }
}

const ERROR_STATUS: Record<SyncErrorCode, number> = {
  not_configured: 503,
  not_connected: 409,
  reconnect: 409,
  api_disabled: 502,
  rate_limited: 429,
  failed: 502,
}

function toSyncError(error: unknown): GoogleSyncError {
  if (error instanceof GoogleSyncError) return error
  if (error instanceof GoogleApiError) {
    switch (error.kind) {
      case 'reconnect':
        return new GoogleSyncError('reconnect', 'Google needs you to reconnect Google Tasks.')
      case 'rate_limited':
        return new GoogleSyncError('rate_limited', 'Google is limiting requests right now. Try again in a minute.')
      case 'api_disabled':
        return new GoogleSyncError('api_disabled', error.message)
      default:
        return new GoogleSyncError('failed', error.message)
    }
  }
  return new GoogleSyncError('failed', 'Something went wrong talking to Google Tasks.')
}

// Logs the error category only, never error text or anything token related.
function logGoogleError(error: unknown, known: GoogleSyncError) {
  console.warn(`[google-tasks] ${known.code}${error instanceof GoogleApiError ? ` (HTTP ${error.status})` : ''}`)
}

// Wraps a route handler: requires a signed-in session, optionally rejects
// cross-site requests (the session cookie is the only credential), and turns any
// thrown error into a safe JSON error response.
export function googleRoute(
  handler: (userId: string, request: Request) => Promise<unknown>,
  { mutating = false }: { mutating?: boolean } = {},
) {
  return async (request: Request) => {
    const origin = request.headers.get('origin')
    if (mutating && origin && origin !== new URL(request.url).origin) {
      return Response.json({ error: 'forbidden' }, { status: 403 })
    }
    const userId = await getSessionUserId(request.headers)
    if (!userId) return Response.json({ error: 'unauthorized' }, { status: 401 })
    try {
      return Response.json(await handler(userId, request))
    } catch (error) {
      if (error instanceof RequestError) return Response.json({ error: error.code }, { status: 400 })
      const known = toSyncError(error)
      logGoogleError(error, known)
      return Response.json({ error: known.code, message: known.message }, { status: ERROR_STATUS[known.code] })
    }
  }
}

// A client mistake (bad input), reported as HTTP 400.
export class RequestError extends Error {
  constructor(readonly code: string) {
    super(code)
  }
}

export async function getSessionUserId(requestHeaders: Headers) {
  const session = await auth.api.getSession({ headers: requestHeaders })
  return session?.user?.id ?? null
}

async function findGoogleAccount(userId: string) {
  const [row] = await db
    .select({ id: account.id, scope: account.scope })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, 'google')))
    .limit(1)
  return row ?? null
}

// Removes the stored Google account (and with it the tokens). Imported tasks stay.
export async function disconnectGoogle(userId: string) {
  await db.delete(account).where(and(eq(account.userId, userId), eq(account.providerId, 'google')))
}

export async function getGoogleStatus(userId: string) {
  const configured = isGoogleConfigured()
  if (!configured) {
    return { configured, connected: false, hasTasksScope: false, listId: DEFAULT_LIST_ID, lastSyncedAt: null, lastResult: null }
  }
  const [linked, [state]] = await Promise.all([
    findGoogleAccount(userId),
    db.select().from(googleTasksSync).where(eq(googleTasksSync.userId, userId)).limit(1),
  ])
  return {
    configured,
    connected: Boolean(linked),
    hasTasksScope: hasTasksScope(linked?.scope),
    listId: state?.listId ?? DEFAULT_LIST_ID,
    lastSyncedAt: state?.lastSyncedAt?.toISOString() ?? null,
    lastResult: state?.lastResult ?? null,
  }
}

async function getClient(userId: string, requestHeaders: Headers): Promise<GoogleTasksClient> {
  if (!isGoogleConfigured()) {
    throw new GoogleSyncError('not_configured', 'Google Tasks is not set up on this server.')
  }
  const linked = await findGoogleAccount(userId)
  if (!linked) throw new GoogleSyncError('not_connected', 'Google Tasks is not connected.')
  if (!hasTasksScope(linked.scope)) {
    throw new GoogleSyncError('reconnect', 'Google Tasks access was not granted. Please reconnect.')
  }
  try {
    // Better Auth returns a valid access token, refreshing it from the stored
    // refresh token when it has expired.
    const { accessToken } = await auth.api.getAccessToken({
      body: { accountId: linked.id },
      headers: requestHeaders,
    })
    return createGoogleTasksClient(accessToken)
  } catch {
    throw new GoogleSyncError('reconnect', 'Google sign-in expired or was revoked. Please reconnect.')
  }
}

export async function listGoogleTaskLists(userId: string, requestHeaders: Headers): Promise<GoogleTaskList[]> {
  const client = await getClient(userId, requestHeaders)
  return client.listTaskLists()
}

const LIST_ID_PATTERN = /^[\w@.~-]{1,200}$/

export function isValidListId(value: unknown): value is string {
  return typeof value === 'string' && LIST_ID_PATTERN.test(value)
}

export async function syncGoogleTasks(userId: string, requestHeaders: Headers, requestedListId?: string) {
  const client = await getClient(userId, requestHeaders)

  const [state] = await db.select().from(googleTasksSync).where(eq(googleTasksSync.userId, userId)).limit(1)
  const listId = requestedListId ?? state?.listId ?? DEFAULT_LIST_ID

  const remote = await client.listTasks(listId)
  // Every task already linked to Google, whichever list it came from.
  const local = (
    await db
      .select({
        id: tasks.id,
        googleTaskId: tasks.googleTaskId,
        googleListId: tasks.googleListId,
        completed: tasks.completed,
        updatedAt: tasks.updatedAt,
        googleSyncedAt: tasks.googleSyncedAt,
      })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), isNotNull(tasks.googleTaskId)))
  ).flatMap((row) => (row.googleTaskId ? [{ ...row, googleTaskId: row.googleTaskId }] : []))

  const plan = planSync(remote, local, listId)
  // One timestamp for updatedAt and googleSyncedAt, so a row we just wrote is not
  // mistaken for a later local edit.
  const now = new Date()

  let imported = 0
  await db.transaction(async (tx) => {
    for (let i = 0; i < plan.toInsert.length; i += 200) {
      const rows = await tx
        .insert(tasks)
        .values(
          plan.toInsert.slice(i, i + 200).map((task) => ({
            id: crypto.randomUUID(),
            userId,
            title: task.title,
            description: task.description,
            dueDate: task.dueDate,
            completed: task.completed,
            createdAt: now,
            updatedAt: now,
            googleTaskId: task.googleTaskId,
            googleListId: task.googleListId,
            googleSyncedAt: now,
          })),
        )
        // The unique (userId, googleTaskId) index makes concurrent syncs safe.
        .onConflictDoNothing()
        .returning({ id: tasks.id })
      imported += rows.length
    }
    for (const item of plan.pullCompletion) {
      await tx
        .update(tasks)
        .set({ completed: item.completed, updatedAt: now, googleSyncedAt: now })
        .where(and(eq(tasks.id, item.id), eq(tasks.userId, userId)))
    }
    if (plan.markSynced.length > 0) {
      await tx
        .update(tasks)
        .set({ googleSyncedAt: now })
        .where(and(eq(tasks.userId, userId), inArray(tasks.id, plan.markSynced)))
    }
  })

  const pushedIds: string[] = []
  let pushFailed = 0
  for (const item of plan.pushCompletion) {
    try {
      await client.setCompleted(item.googleListId, item.googleTaskId, item.completed)
      pushedIds.push(item.id)
    } catch {
      pushFailed++
    }
  }
  if (pushedIds.length > 0) {
    await db
      .update(tasks)
      .set({ googleSyncedAt: new Date() })
      .where(and(eq(tasks.userId, userId), inArray(tasks.id, pushedIds)))
  }

  const summary: SyncSummary = {
    imported,
    pulled: plan.pullCompletion.length,
    pushed: pushedIds.length,
    skipped: plan.skipped,
    pushFailed,
  }
  await db
    .insert(googleTasksSync)
    .values({ userId, listId, lastSyncedAt: now, lastResult: summary })
    .onConflictDoUpdate({
      target: googleTasksSync.userId,
      set: { listId, lastSyncedAt: now, lastResult: summary },
    })
  return { ...summary, listId, lastSyncedAt: now.toISOString() }
}

// Best effort: mirror a completion change made in Daylist onto its Google task.
// Failures are swallowed on purpose; the local task stays marked as changed after
// the last sync, so the next "Sync now" pushes it again.
export async function pushTaskCompletion(
  userId: string,
  task: { id: string; googleTaskId: string | null; googleListId: string | null; completed: boolean },
  requestHeaders: Headers,
) {
  if (!task.googleTaskId) return
  try {
    const client = await getClient(userId, requestHeaders)
    await client.setCompleted(task.googleListId ?? DEFAULT_LIST_ID, task.googleTaskId, task.completed)
    await db
      .update(tasks)
      .set({ googleSyncedAt: new Date() })
      .where(and(eq(tasks.id, task.id), eq(tasks.userId, userId)))
  } catch (error) {
    logGoogleError(error, toSyncError(error))
  }
}
