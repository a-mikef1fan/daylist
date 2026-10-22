'use client'

import { useState } from 'react'
import { Popover } from '@base-ui/react/popover'
import { UserPlus, UserRound, X } from 'lucide-react'
import type { Assignee } from '@/lib/db/schema'

export type MembersState = { status: 'idle' | 'loading' | 'ready' | 'unavailable'; members: Assignee[] }

export function Avatar({ person }: { person: Assignee }) {
  if (person.image) {
    return <img className="assignee-avatar" src={person.image} alt="" width={16} height={16} referrerPolicy="no-referrer" />
  }
  return <span className="assignee-avatar assignee-initials" aria-hidden="true">{person.name.slice(0, 1).toUpperCase()}</span>
}

type AssigneePickerProps = {
  value: Assignee | null
  membersState: MembersState
  onOpen: () => void
  onChange: (assignee: Assignee | null) => void
  // 'form' matches the quick-add controls; 'row' is the compact chip on a task row.
  variant: 'form' | 'row'
  label: string
}

export function AssigneePicker({ value, membersState, onOpen, onChange, variant, label }: AssigneePickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const matches = membersState.members.filter((member) => member.name.toLowerCase().includes(normalizedQuery))
  const firstName = value?.name.trim().split(/\s+/)[0]

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setQuery('')
      onOpen()
    }
  }

  function choose(assignee: Assignee | null) {
    onChange(assignee)
    setOpen(false)
  }

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger className={`assignee-trigger assignee-trigger-${variant}${value ? ' has-assignee' : ''}`} aria-label={value ? `${label}: ${value.name}` : label} title={value ? value.name : label}>
        {value ? <Avatar person={value} /> : variant === 'form' ? <UserRound aria-hidden="true" /> : <UserPlus aria-hidden="true" />}
        <span>{value ? firstName : variant === 'form' ? 'Assignee' : 'Assign'}</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner className="user-menu-positioner" side="bottom" align="start" sideOffset={6}>
          <Popover.Popup className="assignee-popup">
            <input className="assignee-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a teammate" aria-label="Find a teammate" />
            <div className="assignee-list">
              {value && <button className="assignee-option" type="button" onClick={() => choose(null)}><X aria-hidden="true" />Clear assignee</button>}
              {membersState.status === 'loading' && <p className="assignee-hint">Loading teammates…</p>}
              {membersState.status === 'unavailable' && <p className="assignee-hint">Slack not connected. Ask an admin to set SLACK_BOT_TOKEN.</p>}
              {membersState.status === 'ready' && matches.length === 0 && <p className="assignee-hint">No teammates found.</p>}
              {matches.map((member) => (
                <button className={`assignee-option${value?.id === member.id ? ' is-selected' : ''}`} type="button" key={member.id} onClick={() => choose(member)}>
                  <Avatar person={member} /><span>{member.name}</span>
                </button>
              ))}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
