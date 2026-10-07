'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowDownWideNarrow, CalendarDays } from 'lucide-react'
import type { Task, TaskPriority } from '@/lib/db/schema'
import { TASK_TITLE_MAX_LENGTH } from '@/lib/task-validation'

export type TaskDraft = { title: string; dueDate: string | null; priority: TaskPriority }

/** Move focus back to a row's edit button once the inline form has closed. */
export function focusEditButton(taskId: string) {
  requestAnimationFrame(() => {
    document.querySelector<HTMLButtonElement>(`[data-te-edit="${CSS.escape(taskId)}"]`)?.focus()
  })
}

export function TaskEditForm({
  task,
  pending,
  onSave,
  onCancel,
}: {
  task: Task
  pending: boolean
  onSave: (draft: TaskDraft) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(task.title)
  const [dueDate, setDueDate] = useState(task.dueDate ?? '')
  const [priority, setPriority] = useState<TaskPriority>(task.priority as TaskPriority)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    titleRef.current?.focus()
    titleRef.current?.select()
  }, [])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    const draft = { title: trimmed, dueDate: dueDate || null, priority }
    if (draft.title === task.title && draft.dueDate === task.dueDate && draft.priority === task.priority) {
      onCancel()
      return
    }
    onSave(draft)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLFormElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
    }
  }

  return (
    <form className="te-form" onSubmit={handleSubmit} onKeyDown={handleKeyDown} aria-label={`Edit ${task.title}`}>
      <label className="sr-only" htmlFor={`te-title-${task.id}`}>Task name</label>
      <input id={`te-title-${task.id}`} ref={titleRef} className="task-title-input te-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={TASK_TITLE_MAX_LENGTH} required />
      <div className="te-controls">
        <label className="select-control" aria-label="Priority">
          <ArrowDownWideNarrow aria-hidden="true" />
          <select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)} aria-label="Priority">
            <option value="normal">Normal priority</option><option value="high">High priority</option><option value="low">Low priority</option>
          </select>
        </label>
        <label className="date-control" aria-label="Due date"><CalendarDays aria-hidden="true" /><span className="date-label">Due</span><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} aria-label="Due date" /></label>
        <div className="te-actions">
          <button className="te-cancel" type="button" onClick={onCancel}>Cancel</button>
          <button className="add-task-button te-save" type="submit" disabled={pending || !title.trim()}>Save</button>
        </div>
      </div>
    </form>
  )
}
