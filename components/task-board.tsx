'use client'

import { useMemo, useState, useTransition } from 'react'
import type { Dispatch, DragEvent, FormEvent, SetStateAction } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, CalendarDays, Check, CircleCheck, CircleDot, Circle, Plus } from 'lucide-react'
import { createTask, updateTaskStatus } from '@/app/actions/tasks'
import { playCompletionBell } from '@/lib/completion-bell'
import type { TaskStatus } from '@/lib/db/schema'
import type { TaskView as Task } from '@/lib/recurrence'
import { TASK_STATUSES, TASK_STATUS_LABELS, getTaskProgress, getTaskStatus } from '@/lib/task-status'

const statusIcons = { todo: Circle, in_progress: CircleDot, done: CircleCheck } as const

const emptyCopy: Record<TaskStatus, string> = {
  todo: 'Nothing waiting. Add a task above.',
  in_progress: 'Nothing in progress. Start a task from To do.',
  done: 'Finished tasks will land here.',
}

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDueDate(value: string) {
  const today = new Date()
  if (value === dateKey(today)) return 'Today'
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (value === dateKey(tomorrow)) return 'Tomorrow'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(`${value}T12:00:00`))
}

function compareForColumn(status: TaskStatus) {
  return (a: Task, b: Task) => {
    if (status === 'done') return b.updatedAt.getTime() - a.updatedAt.getTime()
    if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate)
    if (a.dueDate && !b.dueDate) return -1
    if (!a.dueDate && b.dueDate) return 1
    return b.createdAt.getTime() - a.createdAt.getTime()
  }
}

export function TaskBoard({ tasks, onTasksChange }: { tasks: Task[]; onTasksChange: Dispatch<SetStateAction<Task[]>> }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [title, setTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const [message, setMessage] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null)

  const progress = useMemo(() => getTaskProgress(tasks), [tasks])
  const columns = useMemo(
    () =>
      TASK_STATUSES.map((status) => ({
        status,
        items: tasks.filter((task) => getTaskStatus(task) === status).sort(compareForColumn(status)),
      })),
    [tasks],
  )
  const today = dateKey(new Date())

  function moveTask(task: Task, status: TaskStatus) {
    if (getTaskStatus(task) === status) return
    // Ring only when finishing a task. Runs inside the click/drop handler for autoplay policy.
    if (status === 'done') playCompletionBell()
    const previous = { status: task.status, completed: task.completed }
    setMessage('')
    setAnnouncement(`Moved ${task.title} to ${TASK_STATUS_LABELS[status]}`)
    onTasksChange((current) => current.map((item) => (item.id === task.id ? { ...item, status, completed: status === 'done' } : item)))
    startTransition(async () => {
      try {
        const { task: updated, next } = await updateTaskStatus(task.id, status, dateKey(new Date()))
        onTasksChange((current) => {
          const synced = current.map((item) => (item.id === updated.id ? updated : item))
          return next && !synced.some((item) => item.id === next.id) ? [next, ...synced] : synced
        })
        router.refresh()
      } catch {
        onTasksChange((current) => current.map((item) => (item.id === task.id ? { ...item, ...previous } : item)))
        setAnnouncement('')
        setMessage('Could not move that task. Please try again.')
      }
    })
  }

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed || adding) return
    setMessage('')
    setAdding(true)
    startTransition(async () => {
      try {
        const task = await createTask({ title: trimmed, dueDate: null, priority: 'normal' })
        onTasksChange((current) => [task, ...current])
        setTitle('')
        setAnnouncement(`Added ${task.title} to To do`)
        router.refresh()
      } catch {
        setMessage('Could not save that task. Please try again.')
      }
      setAdding(false)
    })
  }

  function handleDragStart(event: DragEvent<HTMLElement>, task: Task) {
    event.dataTransfer.setData('text/plain', task.id)
    event.dataTransfer.effectAllowed = 'move'
    setDraggingId(task.id)
  }

  function handleDrop(event: DragEvent<HTMLElement>, status: TaskStatus) {
    event.preventDefault()
    const id = event.dataTransfer.getData('text/plain') || draggingId
    const task = tasks.find((item) => item.id === id)
    setDraggingId(null)
    setDropTarget(null)
    if (task) moveTask(task, status)
  }

  return (
    <section className="task-board" aria-labelledby="board-heading">
      <div className="greeting-block">
        <span className="eyebrow">TASK TRACKER</span>
        <h1 id="board-heading">Where everything stands<span className="greeting-period">.</span></h1>
        <p>Move tasks from To do to In progress to Done. You can use the buttons on each card or drag a card to a column.</p>
      </div>

      <section className="board-progress" aria-labelledby="board-progress-heading">
        <div className="board-progress-top">
          <h2 id="board-progress-heading">Progress</h2>
          <span className="board-percent">{progress.percent}% complete</span>
        </div>
        <div
          className="board-progress-bar"
          role="progressbar"
          aria-label="Tasks completed"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress.percent}
          aria-valuetext={`${progress.done} of ${progress.total} tasks done`}
        >
          <span className="is-done" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
          <span className="is-active" style={{ width: `${progress.total ? (progress.inProgress / progress.total) * 100 : 0}%` }} />
        </div>
        <dl className="board-stats">
          <div><dt>Total</dt><dd>{progress.total}</dd></div>
          <div><dt>To do</dt><dd>{progress.todo}</dd></div>
          <div><dt>In progress</dt><dd>{progress.inProgress}</dd></div>
          <div><dt>Done</dt><dd>{progress.done}</dd></div>
        </dl>
      </section>

      <form className="board-add" onSubmit={handleAdd}>
        <label className="sr-only" htmlFor="board-task-title">New task for To do</label>
        <input id="board-task-title" className="task-title-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add a task to To do" maxLength={180} />
        <button className="add-task-button" type="submit" disabled={adding || !title.trim()}><Plus aria-hidden="true" /><span>{adding ? 'Adding…' : 'Add'}</span></button>
      </form>

      {message && <p className="task-message" role="alert">{message}</p>}
      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>

      <div className="board-columns">
        {columns.map(({ status, items }) => {
          const StatusIcon = statusIcons[status]
          const headingId = `board-col-${status}`
          return (
            <section
              key={status}
              className={`board-column board-column-${status}${dropTarget === status ? ' is-drop-target' : ''}`}
              aria-labelledby={headingId}
              onDragOver={(event) => { if (draggingId) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDropTarget(status) } }}
              onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(null) }}
              onDrop={(event) => handleDrop(event, status)}
            >
              <h2 id={headingId} className="board-column-heading"><StatusIcon aria-hidden="true" />{TASK_STATUS_LABELS[status]}<span className="heading-count">{items.length}</span></h2>
              {items.length > 0 ? (
                <ul className="board-cards">
                  {items.map((task) => (
                    <li
                      key={task.id}
                      className={`board-card${draggingId === task.id ? ' is-dragging' : ''}${status === 'done' ? ' is-complete' : ''}`}
                      draggable
                      onDragStart={(event) => handleDragStart(event, task)}
                      onDragEnd={() => { setDraggingId(null); setDropTarget(null) }}
                    >
                      <span className="board-card-title">{task.title}</span>
                      <div className="task-meta">
                        <span className={`priority-dot priority-${task.priority}`} />
                        <span className={`priority-label priority-text-${task.priority}`}>{task.priority}</span>
                        {task.dueDate && (
                          <>
                            <span className="meta-separator">·</span>
                            <span className={`due-label${task.dueDate < today && status !== 'done' ? ' is-overdue' : ''}`}><CalendarDays aria-hidden="true" />{formatDueDate(task.dueDate)}</span>
                          </>
                        )}
                      </div>
                      <div className="board-card-actions" role="group" aria-label={`Move ${task.title}`}>
                        {TASK_STATUSES.filter((target) => target !== status).map((target) => {
                          const forward = TASK_STATUSES.indexOf(target) > TASK_STATUSES.indexOf(status)
                          return (
                            <button key={target} type="button" className={`board-move${target === 'done' ? ' is-done' : ''}`} onClick={() => moveTask(task, target)} aria-label={`Move ${task.title} to ${TASK_STATUS_LABELS[target]}`}>
                              {target === 'done' ? <Check aria-hidden="true" /> : forward ? null : <ArrowLeft aria-hidden="true" />}
                              {TASK_STATUS_LABELS[target]}
                              {target !== 'done' && forward ? <ArrowRight aria-hidden="true" /> : null}
                            </button>
                          )
                        })}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="board-empty">{emptyCopy[status]}</p>
              )}
            </section>
          )
        })}
      </div>
    </section>
  )
}
