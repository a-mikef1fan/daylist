'use client'

import { useCallback, useEffect, useState } from 'react'
import { Popover } from '@base-ui/react/popover'
import { Hash, Plus, Tag, X } from 'lucide-react'
import {
  BUILTIN_HASHTAGS,
  HASHTAGS_STORAGE_KEY,
  PRIORITY_LABELS,
  deserializeCustomHashtags,
  isTaskPriority,
  normalizeTagName,
  validateCustomTag,
  MAX_TAG_LENGTH,
  type CustomHashtag,
  type ParsedTitle,
} from '@/lib/hashtags'
import type { TaskPriority } from '@/lib/db/schema'
import './hashtag-shortcuts.css'

/** Custom hashtag shortcuts, kept per browser in localStorage (no DB changes needed). */
export function useCustomHashtags() {
  const [custom, setCustom] = useState<CustomHashtag[]>([])

  // Load after mount so server and client markup match on hydration.
  useEffect(() => {
    try {
      setCustom(deserializeCustomHashtags(window.localStorage.getItem(HASHTAGS_STORAGE_KEY)))
    } catch {
      // Storage can be unavailable; shortcuts still work for this visit.
    }
  }, [])

  const update = useCallback((next: CustomHashtag[]) => {
    setCustom(next)
    try {
      window.localStorage.setItem(HASHTAGS_STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Ignore storage failures; the change still applies for this visit.
    }
  }, [])

  return { custom, update }
}

/** Shows which priority the typed hashtags will apply, or why the title can't be saved. */
export function HashtagHint({ rawTitle, parsed }: { rawTitle: string; parsed: ParsedTitle }) {
  const emptyAfterStrip = rawTitle.trim() !== '' && parsed.title === ''
  return (
    <div className="hashtag-hint" aria-live="polite">
      {parsed.priority && (
        <span className={`hashtag-chip hashtag-chip-${parsed.priority}`}>
          <Tag aria-hidden="true" />
          {PRIORITY_LABELS[parsed.priority]} priority from #{parsed.tags[parsed.tags.length - 1]}
        </span>
      )}
      {emptyAfterStrip && <span className="hashtag-error">Add a task name along with your hashtags.</span>}
    </div>
  )
}

export function HashtagShortcutsPanel({ custom, onChange }: { custom: CustomHashtag[]; onChange: (next: CustomHashtag[]) => void }) {
  const [name, setName] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('high')
  const [error, setError] = useState('')

  // Not a <form>: React bubbles submit events through portals, which would submit the add-task form.
  function handleAdd() {
    const problem = validateCustomTag(name, custom)
    if (problem) {
      setError(problem)
      return
    }
    onChange([...custom, { tag: normalizeTagName(name), priority }])
    setName('')
    setError('')
  }

  return (
    <Popover.Root>
      <Popover.Trigger className="hashtag-trigger" type="button" aria-label="Hashtag shortcuts" title="Hashtag shortcuts">
        <Hash aria-hidden="true" />
        <span>Shortcuts</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner className="hashtag-positioner" side="bottom" align="start" sideOffset={8}>
          <Popover.Popup className="hashtag-popup">
            <Popover.Title className="hashtag-title">Hashtag shortcuts</Popover.Title>
            <Popover.Description className="hashtag-description">Type a tag in a task name to set its priority. The tag is removed from the saved title.</Popover.Description>
            <ul className="hashtag-list" aria-label="Built-in shortcuts">
              {Object.entries(BUILTIN_HASHTAGS).map(([tag, tagPriority]) => (
                <li key={tag}><code>#{tag}</code><span>{PRIORITY_LABELS[tagPriority]}</span></li>
              ))}
            </ul>
            <h3 className="hashtag-subtitle">Your shortcuts</h3>
            {custom.length > 0 ? (
              <ul className="hashtag-list" aria-label="Your shortcuts">
                {custom.map(({ tag, priority: tagPriority }) => (
                  <li key={tag}>
                    <code>#{tag}</code><span>{PRIORITY_LABELS[tagPriority]}</span>
                    <button type="button" className="hashtag-remove" onClick={() => onChange(custom.filter((item) => item.tag !== tag))} aria-label={`Remove #${tag}`}><X aria-hidden="true" /></button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="hashtag-empty">None yet. Add one below, like #urgent.</p>
            )}
            <div className="hashtag-add">
              <span className="hashtag-hash" aria-hidden="true">#</span>
              <input
                value={name}
                onChange={(event) => { setName(event.target.value); setError('') }}
                onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); handleAdd() } }}
                placeholder="tag"
                maxLength={MAX_TAG_LENGTH + 1}
                aria-label="New tag name"
                aria-invalid={error ? true : undefined}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
              />
              <select value={priority} onChange={(event) => { if (isTaskPriority(event.target.value)) setPriority(event.target.value) }} aria-label="Priority for new tag">
                <option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option>
              </select>
              <button type="button" className="hashtag-add-button" onClick={handleAdd}><Plus aria-hidden="true" />Add</button>
            </div>
            {error && <p className="hashtag-error" role="alert">{error}</p>}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
