'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, ChevronDown, ChevronRight, Plus, Search, SunMedium, Trash2, X } from 'lucide-react'
import { StatusPill } from '@/components/status-pill'
import type { Task, TaskStatus } from '@/lib/db/schema'
import {
  addDaysToKey,
  bucketLabels,
  bucketOrder,
  formatShortDate,
  groupMyDayTasks,
  statusLabel,
  statusOptions,
  toDateKey,
  type MyDayBucket,
} from '@/lib/my-day'

type StatusFilter = 'all' | TaskStatus

type Prefs = { hideDone: boolean; status: StatusFilter; collapsed: MyDayBucket[] }

const PREFS_KEY = 'daylist:my-day'
const defaultPrefs: Prefs = { hideDone: true, status: 'all', collapsed: [] }

function loadPrefs(): Prefs {
  try {
    const saved = JSON.parse(window.localStorage.getItem(PREFS_KEY) ?? 'null')
    if (!saved || typeof saved !== 'object') return defaultPrefs
    return {
      hideDone: typeof saved.hideDone === 'boolean' ? saved.hideDone : defaultPrefs.hideDone,
      status: saved.status === 'all' || statusOptions.some((option) => option.id === saved.status) ? saved.status : 'all',
      collapsed: Array.isArray(saved.collapsed) ? saved.collapsed.filter((key: unknown): key is MyDayBucket => bucketOrder.includes(key as MyDayBucket)) : [],
    }
  } catch {
    // Storage can be unavailable or hold bad data; fall back to the defaults.
    return defaultPrefs
  }
}

const statusBarOrder: TaskStatus[] = ['done', 'working', 'stuck', 'not_started']

export function MyDay({
  tasks,
  firstName,
  onStatusChange,
  onDueDateChange,
  onDelete,
  onAdd,
}: {
  tasks: Task[]
  firstName: string
  onStatusChange: (task: Task, status: TaskStatus) => void
  onDueDateChange: (task: Task, dueDate: string | null) => void
  onDelete: (task: Task) => void
  onAdd: (title: string, dueDate: string) => void
}) {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)
  const [search, setSearch] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const addInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
    } catch {
      // Ignore storage failures; preferences still apply for this visit.
    }
  }, [prefs])

  const now = new Date()
  const todayKey = toDateKey(now)
  const tomorrowKey = addDaysToKey(todayKey, 1)

  const visibleTasks = useMemo(() => {
    const query = search.trim().toLowerCase()
    return tasks.filter((task) => {
      if (prefs.status !== 'all' && task.status !== prefs.status) return false
      if (prefs.status === 'all' && prefs.hideDone && task.status === 'done') return false
      return !query || task.title.toLowerCase().includes(query)
    })
  }, [tasks, prefs.status, prefs.hideDone, search])

  const groups = groupMyDayTasks(visibleTasks, now)
  const openCount = tasks.filter((task) => task.status !== 'done').length
  const overdueCount = groupMyDayTasks(tasks, now).overdue.length
  const filterCount = (prefs.status !== 'all' ? 1 : 0) + (search.trim() ? 1 : 0)

  const statusCounts = statusBarOrder.map((status) => ({ status, count: visibleTasks.filter((task) => task.status === status).length }))
  const datedTasks = visibleTasks.filter((task) => task.dueDate).map((task) => task.dueDate as string).sort()
  const rangeLabel = datedTasks.length === 0 ? 'No dates' : datedTasks[0] === datedTasks[datedTasks.length - 1] ? formatShortDate(datedTasks[0]) : `${formatShortDate(datedTasks[0])} to ${formatShortDate(datedTasks[datedTasks.length - 1])}`
  const dateLabel = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(now)

  function toggleGroup(key: MyDayBucket) {
    setPrefs((current) => ({ ...current, collapsed: current.collapsed.includes(key) ? current.collapsed.filter((item) => item !== key) : [...current.collapsed, key] }))
  }

  function clearFilters() {
    setSearch('')
    setPrefs((current) => ({ ...current, status: 'all', hideDone: true }))
  }

  function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = newTitle.trim()
    if (!title) return
    onAdd(title, todayKey)
    setNewTitle('')
    addInputRef.current?.focus()
  }

  const visibleGroups = bucketOrder.filter((key) => key !== 'done' || groups.done.length > 0)

  return (
    <div className="my-day">
      <div className="greeting-block my-day-header">
        <span className="eyebrow">MY DAY · {dateLabel.toUpperCase()}</span>
        <h1>My day<span className="greeting-period">.</span></h1>
        <p>{openCount === 0 ? `Nothing open, ${firstName}. Enjoy the space.` : `${openCount} open ${openCount === 1 ? 'task' : 'tasks'}${overdueCount > 0 ? `, ${overdueCount} overdue` : ''}. Click a status or date to edit it in place.`}</p>
      </div>

      {tasks.length === 0 ? (
        <div className="empty-state my-day-empty">
          <div className="empty-illustration"><SunMedium aria-hidden="true" /></div>
          <h3>Your day is wide open</h3>
          <p>Add your first task for today, or pick a date for something coming up.</p>
          <button className="my-day-empty-action" type="button" onClick={() => addInputRef.current?.focus()}><Plus aria-hidden="true" /> Add a task</button>
        </div>
      ) : (<>
        <div className="my-day-toolbar" role="group" aria-label="My day filters">
          <label className="select-control my-day-status-filter">
            <span className="date-label">Status</span>
            <select value={prefs.status} onChange={(event) => setPrefs((current) => ({ ...current, status: event.target.value as StatusFilter }))} aria-label="Filter by status">
              <option value="all">All</option>
              {statusOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
          <label className={`hide-done-toggle${prefs.status !== 'all' ? ' is-disabled' : ''}`}>
            <input type="checkbox" checked={prefs.hideDone} disabled={prefs.status !== 'all'} onChange={(event) => setPrefs((current) => ({ ...current, hideDone: event.target.checked }))} />
            <span>Hide done</span>
          </label>
          <label className="search-field my-day-search"><Search aria-hidden="true" /><span className="sr-only">Search My day</span><input type="search" placeholder="Search this view" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          {filterCount > 0 && (
            <button className="filter-clear" type="button" onClick={clearFilters}><span className="filter-badge">{filterCount}</span> {filterCount === 1 ? 'filter' : 'filters'} <X aria-hidden="true" /><span className="sr-only">Clear filters</span></button>
          )}
        </div>

        {visibleTasks.length === 0 ? (
          <div className="empty-state my-day-empty">
            <div className="empty-illustration"><SunMedium aria-hidden="true" /></div>
            <h3>{filterCount > 0 ? 'No matching tasks' : 'All done for now'}</h3>
            <p>{filterCount > 0 ? 'Try another status or search, or clear your filters.' : 'Everything is finished. Turn off Hide done to see it, or add something new below.'}</p>
            {filterCount > 0 && <button className="my-day-empty-action" type="button" onClick={clearFilters}>Clear filters</button>}
          </div>
        ) : (
          <div className="my-day-board">
            <div className="my-day-colhead" aria-hidden="true"><span /><span>TASK</span><span>STATUS</span><span>DUE</span><span>PRIORITY</span><span /></div>
            {visibleGroups.map((key) => {
              const items = groups[key]
              const isCollapsed = prefs.collapsed.includes(key)
              const panelId = `my-day-group-${key}`
              return (
                <section className={`my-day-group group-${key}`} key={key} aria-labelledby={`${panelId}-title`}>
                  <h2 className="my-day-group-heading">
                    <button type="button" onClick={() => toggleGroup(key)} aria-expanded={!isCollapsed} aria-controls={panelId} disabled={items.length === 0}>
                      {isCollapsed || items.length === 0 ? <ChevronRight aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
                      <span id={`${panelId}-title`}>{bucketLabels[key]}</span>
                      <span className="heading-count">{items.length}</span>
                    </button>
                  </h2>
                  {items.length > 0 && !isCollapsed && (
                    <ul className="my-day-rows" id={panelId}>
                      {items.map((task) => {
                        const overdue = key === 'overdue'
                        return (
                          <li className={`my-day-row${task.status === 'done' ? ' is-complete' : ''}`} key={task.id}>
                            <span className={`my-day-edge status-${task.status}`} aria-hidden="true" />
                            <span className="my-day-title task-title" title={task.title}>{task.title}</span>
                            <StatusPill status={task.status} taskTitle={task.title} onChange={(status) => onStatusChange(task, status)} />
                            <div className="my-day-date">
                              <label className={`date-field${overdue ? ' is-overdue' : ''}`}>
                                <CalendarDays aria-hidden="true" />
                                <span className="sr-only">Due date for {task.title}</span>
                                <input type="date" value={task.dueDate ?? ''} onChange={(event) => onDueDateChange(task, event.target.value || null)} />
                              </label>
                              {overdue && <span className="overdue-tag">Overdue</span>}
                              <span className="date-shortcuts">
                                {task.dueDate !== todayKey && <button type="button" onClick={() => onDueDateChange(task, todayKey)} aria-label={`Set ${task.title} due today`}>Today</button>}
                                {task.dueDate !== tomorrowKey && <button type="button" onClick={() => onDueDateChange(task, tomorrowKey)} aria-label={`Set ${task.title} due tomorrow`}>Tomorrow</button>}
                                {task.dueDate && <button type="button" onClick={() => onDueDateChange(task, null)} aria-label={`Clear due date for ${task.title}`}>Clear</button>}
                              </span>
                            </div>
                            <span className="my-day-priority"><span className={`priority-dot priority-${task.priority}`} /><span className={`priority-label priority-text-${task.priority}`}>{task.priority}</span></span>
                            <button className="delete-task-button" type="button" onClick={() => onDelete(task)} aria-label={`Delete ${task.title}`}><Trash2 aria-hidden="true" /></button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </section>
              )
            })}
            <div className="my-day-summary" aria-label="Summary of visible tasks">
              <span className="my-day-summary-label">SUMMARY</span>
              <div className="status-bar" role="img" aria-label={statusCounts.map(({ status, count }) => `${count} ${statusLabel(status).toLowerCase()}`).join(', ')}>
                {statusCounts.filter(({ count }) => count > 0).map(({ status, count }) => <span key={status} className={`status-segment status-${status}`} style={{ flexGrow: count }} />)}
              </div>
              <ul className="status-legend">
                {statusCounts.filter(({ count }) => count > 0).map(({ status, count }) => <li key={status}><span className={`legend-swatch status-${status}`} aria-hidden="true" />{count} {statusLabel(status).toLowerCase()}</li>)}
              </ul>
              <span className="summary-range"><CalendarDays aria-hidden="true" /> {rangeLabel}</span>
            </div>
          </div>
        )}
      </>)}

      <form className="my-day-add" onSubmit={handleAdd}>
        <Plus aria-hidden="true" />
        <label className="sr-only" htmlFor="my-day-new-task">Add a task for today</label>
        <input id="my-day-new-task" ref={addInputRef} value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="Add a task for today and press Enter" maxLength={180} autoComplete="off" />
      </form>
    </div>
  )
}
