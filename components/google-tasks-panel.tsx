'use client'

import { useCallback, useEffect, useState } from 'react'
import { authClient } from '@/lib/auth-client'
import type { SyncSummary } from '@/lib/google-tasks'

type Status = {
  configured: boolean
  connected: boolean
  hasTasksScope: boolean
  listId: string
  lastSyncedAt: string | null
  lastResult: SyncSummary | null
}

type ApiError = { error?: string; message?: string }

const GENERIC_ERROR = 'Something went wrong. Please try again in a moment.'

function formatSyncTime(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

function describeResult(result: SyncSummary) {
  const parts = [`${plural(result.imported, 'task')} imported`]
  if (result.pulled > 0) parts.push(`${plural(result.pulled, 'completion')} pulled from Google`)
  if (result.pushed > 0) parts.push(`${plural(result.pushed, 'completion')} sent to Google`)
  if (result.skipped > 0) parts.push(`${result.skipped} skipped (deleted, hidden or untitled)`)
  if (result.pushFailed > 0) parts.push(`${plural(result.pushFailed, 'change')} could not be sent and will be retried`)
  return parts.join(', ')
}

export function GoogleTasksPanel({ notice, onSynced, onDone }: { notice?: 'connected' | 'error' | null; onSynced: () => void; onDone: () => void }) {
  const [status, setStatus] = useState<Status | null>(null)
  const [lists, setLists] = useState<{ id: string; title: string }[]>([])
  const [listId, setListId] = useState('@default')
  const [error, setError] = useState(notice === 'error' ? 'Google did not finish connecting. Please try again.' : '')
  const [reconnect, setReconnect] = useState(false)
  const [pending, setPending] = useState<'connect' | 'sync' | 'disconnect' | null>(null)

  const handleApiError = useCallback((data: ApiError | null) => {
    setError(data?.message || GENERIC_ERROR)
    if (data?.error === 'reconnect') setReconnect(true)
  }, [])

  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/google-tasks/status', { cache: 'no-store' })
      if (!response.ok) throw new Error('status')
      const data = (await response.json()) as Status
      setStatus(data)
      setListId(data.listId)
      if (data.connected && data.hasTasksScope) {
        const listsResponse = await fetch('/api/google-tasks/lists', { cache: 'no-store' })
        const listsData = (await listsResponse.json().catch(() => null)) as ({ lists?: { id: string; title: string }[] } & ApiError) | null
        if (listsResponse.ok && listsData?.lists) setLists(listsData.lists)
        else handleApiError(listsData)
      }
    } catch {
      setError(GENERIC_ERROR)
    }
  }, [handleApiError])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  async function handleConnect() {
    setError('')
    setPending('connect')
    try {
      const result = await authClient.linkSocial({ provider: 'google', callbackURL: '/?google=connected', errorCallbackURL: '/?google=error' })
      if (result?.error) {
        setError('We couldn’t start the Google connection. Please try again.')
        setPending(null)
      }
      // On success the browser is redirected to Google, so keep the button disabled.
    } catch {
      setError(GENERIC_ERROR)
      setPending(null)
    }
  }

  async function handleSync() {
    setError('')
    setReconnect(false)
    setPending('sync')
    try {
      const response = await fetch('/api/google-tasks/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listId }),
      })
      const data = (await response.json().catch(() => null)) as (SyncSummary & { lastSyncedAt?: string; listId?: string } & ApiError) | null
      if (!response.ok || !data) {
        handleApiError(data)
        return
      }
      setStatus((current) => current && { ...current, listId: data.listId ?? listId, lastSyncedAt: data.lastSyncedAt ?? current.lastSyncedAt, lastResult: data })
      onSynced()
    } catch {
      setError(GENERIC_ERROR)
    } finally {
      setPending(null)
    }
  }

  async function handleDisconnect() {
    setError('')
    setPending('disconnect')
    try {
      const response = await fetch('/api/google-tasks/disconnect', { method: 'POST' })
      if (!response.ok) {
        setError('We couldn’t disconnect Google Tasks. Please try again.')
        return
      }
      setLists([])
      setReconnect(false)
      await loadStatus()
    } catch {
      setError(GENERIC_ERROR)
    } finally {
      setPending(null)
    }
  }

  if (!status) {
    return (
      <div className="dialog-body">
        {error ? <p className="form-error" role="alert">{error}</p> : <p className="gt-note" role="status">Checking Google Tasks…</p>}
      </div>
    )
  }

  if (!status.configured) {
    return (
      <div className="dialog-body gt-panel">
        <p className="gt-note">Google Tasks isn’t set up on this server yet. The site owner needs to add Google credentials; the README explains how.</p>
        <div className="dialog-actions"><button className="dialog-cancel" type="button" onClick={onDone}>Close</button></div>
      </div>
    )
  }

  const needsReconnect = reconnect || (status.connected && !status.hasTasksScope)

  return (
    <div className="dialog-body gt-panel">
      {notice === 'connected' && status.connected && !error && <p className="form-success" role="status">Google Tasks is connected.</p>}
      {!status.connected ? (
        <>
          <p className="gt-note">Import your Google Tasks into daylist and keep completion in step. daylist asks Google for permission to view and manage your tasks.</p>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="dialog-actions">
            <button className="dialog-cancel" type="button" onClick={onDone}>Close</button>
            <button className="auth-submit dialog-submit" type="button" onClick={handleConnect} disabled={pending !== null}>{pending === 'connect' ? 'Opening Google…' : 'Connect Google Tasks'}</button>
          </div>
        </>
      ) : (
        <>
          {needsReconnect && <p className="gt-note gt-warning" role="alert">Google Tasks needs to be reconnected (access was revoked or not granted). Reconnect to continue syncing.</p>}
          {!needsReconnect && lists.length > 0 && (
            <label className="gt-field">
              <span>List to sync</span>
              <select value={listId} onChange={(event) => setListId(event.target.value)} disabled={pending !== null}>
                {listId === '@default' && <option value="@default">My default list</option>}
                {lists.map((list) => <option key={list.id} value={list.id}>{list.title}</option>)}
              </select>
            </label>
          )}
          {status.lastSyncedAt ? (
            <p className="gt-note" role="status">Last synced {formatSyncTime(status.lastSyncedAt)}{status.lastResult ? `: ${describeResult(status.lastResult)}.` : '.'}</p>
          ) : (
            !needsReconnect && <p className="gt-note">Not synced yet. Sync now imports your Google tasks, and later syncs update completed tasks both ways.</p>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="dialog-actions">
            <button className="dialog-cancel" type="button" onClick={handleDisconnect} disabled={pending !== null}>{pending === 'disconnect' ? 'Disconnecting…' : 'Disconnect'}</button>
            {needsReconnect ? (
              <button className="auth-submit dialog-submit" type="button" onClick={handleConnect} disabled={pending !== null}>{pending === 'connect' ? 'Opening Google…' : 'Reconnect'}</button>
            ) : (
              <button className="auth-submit dialog-submit" type="button" onClick={handleSync} disabled={pending !== null}>{pending === 'sync' ? 'Syncing…' : 'Sync now'}</button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
