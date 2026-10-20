// Run with `pnpm test` (Node's built-in test runner; no extra dependencies).
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  GOOGLE_TASKS_SCOPE,
  GoogleApiError,
  classifyGoogleError,
  createGoogleTasksClient,
  dueToDate,
  hasTasksScope,
  isGoogleConfigured,
  mapGoogleTask,
  planSync,
  type GoogleTask,
  type LocalGoogleTask,
} from './google-tasks.ts'

const local = (overrides: Partial<LocalGoogleTask> & { googleTaskId: string }): LocalGoogleTask => ({
  id: `local-${overrides.googleTaskId}`,
  googleListId: '@default',
  completed: false,
  updatedAt: new Date('2026-01-01T10:00:00Z'),
  googleSyncedAt: new Date('2026-01-01T10:00:00Z'),
  ...overrides,
})

describe('config helpers', () => {
  it('needs both Google env vars', () => {
    assert.equal(isGoogleConfigured({}), false)
    assert.equal(isGoogleConfigured({ GOOGLE_CLIENT_ID: 'id' }), false)
    assert.equal(isGoogleConfigured({ GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: '  ' }), false)
    assert.equal(isGoogleConfigured({ GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'secret' }), true)
  })

  it('detects the tasks scope in comma or space separated scope strings', () => {
    assert.equal(hasTasksScope(null), false)
    assert.equal(hasTasksScope('openid,email,profile'), false)
    assert.equal(hasTasksScope(`openid,email,${GOOGLE_TASKS_SCOPE}`), true)
    assert.equal(hasTasksScope(`openid ${GOOGLE_TASKS_SCOPE}`), true)
    assert.equal(hasTasksScope(`${GOOGLE_TASKS_SCOPE}.readonly`), false)
  })
})

describe('mapGoogleTask', () => {
  it('maps title, notes, due date and completed status', () => {
    const mapped = mapGoogleTask(
      { id: 'a', title: '  Buy milk ', notes: ' 2 litres ', due: '2026-03-05T00:00:00.000Z', status: 'completed' },
      'L1',
    )
    assert.deepEqual(mapped, {
      googleTaskId: 'a',
      googleListId: 'L1',
      title: 'Buy milk',
      description: '2 litres',
      dueDate: '2026-03-05',
      completed: true,
    })
  })

  it('skips deleted, hidden and untitled tasks', () => {
    assert.equal(mapGoogleTask({ id: 'a', title: 'x', deleted: true }, 'L'), null)
    assert.equal(mapGoogleTask({ id: 'a', title: 'x', hidden: true }, 'L'), null)
    assert.equal(mapGoogleTask({ id: 'a', title: '   ' }, 'L'), null)
    assert.equal(mapGoogleTask({ id: 'a' }, 'L'), null)
  })

  it('truncates titles to 180 characters and handles missing or invalid dates', () => {
    const mapped = mapGoogleTask({ id: 'a', title: 'x'.repeat(300), due: 'garbage' }, 'L')
    assert.equal(mapped?.title.length, 180)
    assert.equal(mapped?.dueDate, null)
    assert.equal(mapped?.completed, false)
    assert.equal(mapped?.description, null)
    assert.equal(dueToDate('2026-02-30T00:00:00.000Z'), null)
  })
})

describe('planSync', () => {
  it('imports unknown tasks once and dedupes repeated remote ids', () => {
    const remote: GoogleTask[] = [
      { id: 'new', title: 'New' },
      { id: 'new', title: 'New again' },
      { id: 'gone', title: 'Deleted', deleted: true },
      { id: 'hid', title: 'Hidden', hidden: true },
    ]
    const plan = planSync(remote, [], 'L')
    assert.deepEqual(plan.toInsert.map((t) => t.googleTaskId), ['new'])
    assert.equal(plan.skipped, 2)
  })

  it('does not re-import tasks that are already linked', () => {
    const plan = planSync([{ id: 'a', title: 'A' }], [local({ googleTaskId: 'a' })], 'L')
    assert.deepEqual(plan.toInsert, [])
    assert.deepEqual(plan.pullCompletion, [])
    assert.deepEqual(plan.pushCompletion, [])
  })

  it('pulls Google completion changes when the local copy is unchanged since the last sync', () => {
    const plan = planSync([{ id: 'a', title: 'A', status: 'completed' }], [local({ googleTaskId: 'a' })], 'L')
    assert.deepEqual(plan.pullCompletion, [{ id: 'local-a', completed: true }])
    assert.deepEqual(plan.pushCompletion, [])
  })

  it('pulls completion even when Google has since hidden the completed task', () => {
    const plan = planSync([{ id: 'a', title: 'A', status: 'completed', hidden: true }], [local({ googleTaskId: 'a' })], 'L')
    assert.deepEqual(plan.pullCompletion, [{ id: 'local-a', completed: true }])
  })

  it('pushes a local change made after the last sync instead of overwriting it', () => {
    const changed = local({ googleTaskId: 'a', completed: true, updatedAt: new Date('2026-01-02T00:00:00Z') })
    const plan = planSync([{ id: 'a', title: 'A', status: 'needsAction' }], [changed], 'L')
    assert.deepEqual(plan.pullCompletion, [])
    assert.deepEqual(plan.pushCompletion, [{ id: 'local-a', googleTaskId: 'a', googleListId: '@default', completed: true }])
  })

  it('marks a locally changed task as synced once Google already matches', () => {
    const changed = local({ googleTaskId: 'a', completed: true, updatedAt: new Date('2026-01-02T00:00:00Z') })
    const plan = planSync([{ id: 'a', title: 'A', status: 'completed' }], [changed], 'L')
    assert.deepEqual(plan.markSynced, ['local-a'])
    assert.deepEqual(plan.pushCompletion, [])
  })

  it('leaves linked tasks alone when they were deleted on Google', () => {
    const plan = planSync([{ id: 'a', title: 'A', deleted: true, status: 'completed' }], [local({ googleTaskId: 'a' })], 'L')
    assert.deepEqual(plan.pullCompletion, [])
    assert.deepEqual(plan.toInsert, [])
  })
})

describe('Google Tasks client (mocked fetch)', () => {
  function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
  }

  it('follows pagination and sends the bearer token', async () => {
    const calls: { url: string; auth: string | null }[] = []
    const client = createGoogleTasksClient('tok', async (url, init) => {
      calls.push({ url, auth: new Headers(init?.headers).get('Authorization') })
      return url.includes('pageToken=p2')
        ? jsonResponse({ items: [{ id: 'b', title: 'B' }] })
        : jsonResponse({ items: [{ id: 'a', title: 'A' }], nextPageToken: 'p2' })
    })
    const tasks = await client.listTasks('@default')
    assert.deepEqual(tasks.map((t) => t.id), ['a', 'b'])
    assert.equal(calls.length, 2)
    assert.ok(calls[0].url.startsWith('https://tasks.googleapis.com/tasks/v1/lists/%40default/tasks?'))
    assert.ok(calls[0].url.includes('showCompleted=true') && calls[0].url.includes('showHidden=true'))
    assert.ok(calls.every((call) => call.auth === 'Bearer tok'))
  })

  it('lists task lists and falls back to a title for untitled lists', async () => {
    const client = createGoogleTasksClient('tok', async () => jsonResponse({ items: [{ id: '1', title: 'Home' }, { id: '2' }] }))
    assert.deepEqual(await client.listTaskLists(), [{ id: '1', title: 'Home' }, { id: '2', title: 'Untitled list' }])
  })

  it('patches completion and un-completion', async () => {
    const bodies: unknown[] = []
    const client = createGoogleTasksClient('tok', async (url, init) => {
      assert.equal(init?.method, 'PATCH')
      assert.ok(url.endsWith('/lists/L/tasks/T'))
      bodies.push(JSON.parse(String(init?.body)))
      return jsonResponse({})
    })
    await client.setCompleted('L', 'T', true, new Date('2026-01-01T00:00:00Z'))
    await client.setCompleted('L', 'T', false)
    assert.deepEqual(bodies, [
      { status: 'completed', completed: '2026-01-01T00:00:00.000Z' },
      { status: 'needsAction', completed: null },
    ])
  })

  it('classifies API errors without leaking response details', async () => {
    const client = createGoogleTasksClient('tok', async () => jsonResponse({ error: { message: 'secret detail' } }, 401))
    await assert.rejects(client.listTasks('@default'), (error: unknown) => {
      assert.ok(error instanceof GoogleApiError)
      assert.equal(error.kind, 'reconnect')
      assert.ok(!error.message.includes('secret detail'))
      return true
    })
    const disabled = classifyGoogleError(403, { error: { errors: [{ reason: 'accessNotConfigured' }] } })
    assert.equal(disabled.kind, 'api_disabled')
    assert.equal(classifyGoogleError(403, {}).kind, 'reconnect')
    assert.equal(classifyGoogleError(429, null).kind, 'rate_limited')
    assert.equal(classifyGoogleError(500, null).kind, 'other')
  })
})
