'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowDownWideNarrow,
  CalendarDays,
  Check,
  CheckCheck,
  Circle,
  CircleCheck,
  Clock3,
  Flame,
  Gamepad2,
  ListTodo,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Sparkles,
  SunMedium,
  Trash2,
  Worm,
} from 'lucide-react'
import { createTask, deleteTask, updateTaskCompletion, updateTaskDueDate, updateTaskStatus } from '@/app/actions/tasks'
import { MyDay } from '@/components/my-day'
import { SnakeGame } from '@/components/snake-game'
import { authClient } from '@/lib/auth-client'
import { getTaskIcon } from '@/lib/task-icon'
import type { Task, TaskPriority, TaskStatus } from '@/lib/db/schema'

type FilterKey = 'all' | 'today' | 'upcoming' | 'urgent' | 'completed'

type GameKey = 'snake'

const gameOptions: { id: GameKey; label: string; icon: typeof Worm }[] = [
  { id: 'snake', label: 'Snake', icon: Worm },
]

const SIDEBAR_STORAGE_KEY = 'daylist:sidebar-collapsed'
const SIDEBAR_WIDTH_STORAGE_KEY = 'daylist:sidebar-width'
const SIDEBAR_DEFAULT_WIDTH = 248
const SIDEBAR_MIN_WIDTH = 200
const SIDEBAR_MAX_WIDTH = 420
const SIDEBAR_KEY_STEP = 16

function clampSidebarWidth(value: number) {
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(value)))
}

const filterOptions: { id: FilterKey; label: string; icon: typeof ListTodo; urgent?: boolean }[] = [
  { id: 'all', label: 'All tasks', icon: ListTodo },
  { id: 'today', label: 'Today', icon: CalendarDays },
  { id: 'upcoming', label: 'Upcoming', icon: Clock3 },
  { id: 'urgent', label: 'Urgent', icon: Flame, urgent: true },
  { id: 'completed', label: 'Completed', icon: CheckCheck },
]

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDueDate(value: string | null) {
  if (!value) return 'No due date'
  const due = new Date(`${value}T12:00:00`)
  const today = new Date()
  if (value === dateKey(today)) return 'Today'
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (value === dateKey(tomorrow)) return 'Tomorrow'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(due)
}

export function TodoApp({ initialTasks, userName }: { initialTasks: Task[]; userName: string }) {
  const [tasks, setTasks] = useState(initialTasks)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [activeGame, setActiveGame] = useState<GameKey | null>(null)
  const [myDayActive, setMyDayActive] = useState(false)
  const [search, setSearch] = useState('')
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('normal')
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()
  const [collapsed, setCollapsed] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH)
  const [resizing, setResizing] = useState(false)
  const [sidebarReady, setSidebarReady] = useState(false)
  const dragRef = useRef({ startX: 0, startWidth: SIDEBAR_DEFAULT_WIDTH, width: SIDEBAR_DEFAULT_WIDTH })
  const router = useRouter()

  // Restore the saved sidebar state after mount so server and client markup match on hydration.
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true')
      const savedWidth = Number(window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY))
      if (Number.isFinite(savedWidth) && savedWidth > 0) setSidebarWidth(clampSidebarWidth(savedWidth))
    } catch {
      // Storage can be unavailable (private mode, blocked cookies); fall back to expanded.
    }
    setSidebarReady(true)
  }, [])

  function toggleSidebar() {
    const next = !collapsed
    setCollapsed(next)
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next))
    } catch {
      // Ignore storage failures; the toggle still works for this visit.
    }
  }

  function saveSidebarWidth(width: number) {
    try {
      window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(width))
    } catch {
      // Ignore storage failures; the new width still applies for this visit.
    }
  }

  function setAndSaveSidebarWidth(width: number) {
    const next = clampSidebarWidth(width)
    setSidebarWidth(next)
    saveSidebarWidth(next)
  }

  function handleResizeStart(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { startX: event.clientX, startWidth: sidebarWidth, width: sidebarWidth }
    setResizing(true)
  }

  function handleResizeMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!resizing) return
    const width = clampSidebarWidth(dragRef.current.startWidth + event.clientX - dragRef.current.startX)
    dragRef.current.width = width
    setSidebarWidth(width)
  }

  function handleResizeEnd(event: React.PointerEvent<HTMLDivElement>) {
    if (!resizing) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    setResizing(false)
    saveSidebarWidth(dragRef.current.width)
  }

  function handleResizeKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    setAndSaveSidebarWidth(sidebarWidth + (event.key === 'ArrowRight' ? SIDEBAR_KEY_STEP : -SIDEBAR_KEY_STEP))
  }

  const counts = useMemo(() => {
    const today = dateKey(new Date())
    return {
      all: tasks.filter((task) => !task.completed).length,
      today: tasks.filter((task) => !task.completed && task.dueDate === today).length,
      upcoming: tasks.filter((task) => !task.completed && task.dueDate && task.dueDate > today).length,
      urgent: tasks.filter((task) => !task.completed && task.priority === 'high').length,
      completed: tasks.filter((task) => task.completed).length,
      myDay: tasks.filter((task) => !task.completed && task.dueDate && task.dueDate <= today).length,
    }
  }, [tasks])

  const visibleTasks = useMemo(() => {
    const today = dateKey(new Date())
    const normalizedSearch = search.trim().toLowerCase()
    return tasks
      .filter((task) => {
        if (filter === 'today' && (task.completed || task.dueDate !== today)) return false
        if (filter === 'upcoming' && (task.completed || !task.dueDate || task.dueDate <= today)) return false
        if (filter === 'urgent' && (task.completed || task.priority !== 'high')) return false
        if (filter === 'completed' && !task.completed) return false
        if (filter === 'all' && task.completed) return false
        return !normalizedSearch || task.title.toLowerCase().includes(normalizedSearch)
      })
      .sort((a, b) => {
        if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed)
        if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate)
        if (a.dueDate && !b.dueDate) return -1
        if (!a.dueDate && b.dueDate) return 1
        return b.createdAt.getTime() - a.createdAt.getTime()
      })
  }, [tasks, filter, search])

  function handleAddTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim()) return
    setMessage('')
    startTransition(async () => {
      try {
        const task = await createTask({ title: title.trim(), dueDate: dueDate || null, priority })
        setTasks((current) => [task, ...current])
        setTitle('')
        setDueDate('')
        setPriority('normal')
        router.refresh()
      } catch {
        setMessage('Could not save that task. Please try again.')
      }
    })
  }

  function handleToggle(task: Task) {
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, completed: !item.completed, status: item.completed ? 'not_started' : 'done' } : item))
    startTransition(async () => {
      try {
        const updated = await updateTaskCompletion(task.id, !task.completed)
        setTasks((current) => current.map((item) => item.id === updated.id ? updated : item))
        router.refresh()
      } catch {
        setTasks((current) => current.map((item) => item.id === task.id ? { ...item, completed: task.completed, status: task.status } : item))
        setMessage('Could not update that task. Please try again.')
      }
    })
  }

  function handleStatusChange(task: Task, status: TaskStatus) {
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status, completed: status === 'done' } : item))
    startTransition(async () => {
      try {
        const updated = await updateTaskStatus(task.id, status)
        setTasks((current) => current.map((item) => item.id === updated.id ? updated : item))
        router.refresh()
      } catch {
        setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: task.status, completed: task.completed } : item))
        setMessage('Could not update that task. Please try again.')
      }
    })
  }

  function handleDueDateChange(task: Task, nextDueDate: string | null) {
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, dueDate: nextDueDate } : item))
    startTransition(async () => {
      try {
        const updated = await updateTaskDueDate(task.id, nextDueDate)
        setTasks((current) => current.map((item) => item.id === updated.id ? updated : item))
        router.refresh()
      } catch {
        setTasks((current) => current.map((item) => item.id === task.id ? { ...item, dueDate: task.dueDate } : item))
        setMessage('Could not update that due date. Please try again.')
      }
    })
  }

  // Quick add from My day: the task is due today, and the input keeps focus for the next one.
  function handleMyDayAdd(newTitle: string, newDueDate: string) {
    setMessage('')
    createTask({ title: newTitle, dueDate: newDueDate, priority: 'normal' })
      .then((task) => {
        setTasks((current) => [task, ...current])
        router.refresh()
      })
      .catch(() => setMessage('Could not save that task. Please try again.'))
  }

  function handleDelete(task: Task) {
    setTasks((current) => current.filter((item) => item.id !== task.id))
    startTransition(async () => {
      try {
        await deleteTask(task.id)
        router.refresh()
      } catch {
        setTasks((current) => [...current, task])
        setMessage('Could not delete that task. Please try again.')
      }
    })
  }

  async function handleSignOut() {
    await authClient.signOut()
    window.location.assign('/')
  }

  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'
  const dateLabel = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())
  const firstName = userName.trim().split(/\s+/)[0] || 'there'

  return (
    <main className={`app-shell${collapsed ? ' is-collapsed' : ''}${sidebarReady ? ' is-ready' : ''}${resizing ? ' is-resizing' : ''}`} style={collapsed ? undefined : ({ '--rail-width': `${sidebarWidth}px` } as React.CSSProperties)}>
      <aside id="side-rail" className="side-rail" aria-label="Task navigation">
        <div className="rail-header">
          <a href="/" className="brand-mark" aria-label="daylist home"><span className="brand-icon"><Check aria-hidden="true" /></span><span className="rail-label">daylist</span></a>
          <button className="rail-toggle" type="button" onClick={toggleSidebar} aria-expanded={!collapsed} aria-controls="side-rail" aria-label="Toggle sidebar" title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
          </button>
        </div>
        <div className="rail-primary">
        <div className="rail-caption">MY DAY</div>
        <nav className="filter-nav myday-nav" aria-label="My day">
          <button type="button" className={`filter-link${myDayActive && !activeGame ? ' is-active' : ''}`} onClick={() => { setMyDayActive(true); setActiveGame(null) }} aria-current={myDayActive && !activeGame ? 'page' : undefined} title={collapsed ? 'My day' : undefined}>
            <SunMedium aria-hidden="true" /> <span className="rail-label">My day</span><span className="filter-count">{counts.myDay}</span>
          </button>
        </nav>
        <div className="rail-caption fun-caption">YOUR SPACE</div>
        <nav className="filter-nav" aria-label="Task filters">
          {filterOptions.map(({ id, label, icon: Icon, urgent }) => (
            <button key={id} type="button" className={`filter-link${urgent ? ' is-urgent' : ''}${!activeGame && !myDayActive && filter === id ? ' is-active' : ''}`} onClick={() => { setFilter(id); setActiveGame(null); setMyDayActive(false) }} aria-current={!activeGame && !myDayActive && filter === id ? 'page' : undefined} title={collapsed ? label : undefined}>
              <Icon aria-hidden="true" /> <span className="rail-label">{label}</span><span className="filter-count">{counts[id]}</span>
            </button>
          ))}
        </nav>
        </div>
        <div className="rail-caption fun-caption">JUST FOR FUN</div>
        <nav className="filter-nav fun-nav" aria-label="Games">
          {gameOptions.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className={`filter-link${activeGame === id ? ' is-active' : ''}`} onClick={() => { setActiveGame(id); setMyDayActive(false) }} aria-current={activeGame === id ? 'page' : undefined} title={collapsed ? label : undefined}>
              <Icon aria-hidden="true" /> <span className="rail-label">{label}</span>
            </button>
          ))}
        </nav>
        <div className="rail-tip"><Sparkles aria-hidden="true" /><p>Keep it simple.<br /><strong>One step at a time.</strong></p></div>
        <button className="sign-out-button" type="button" onClick={handleSignOut} title={collapsed ? 'Sign out' : undefined}><LogOut aria-hidden="true" /><span className="rail-label">Sign out</span></button>
        {!collapsed && (
          <div
            className="rail-resize-handle"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
            aria-controls="side-rail"
            aria-valuenow={sidebarWidth}
            aria-valuemin={SIDEBAR_MIN_WIDTH}
            aria-valuemax={SIDEBAR_MAX_WIDTH}
            tabIndex={0}
            onPointerDown={handleResizeStart}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
            onPointerCancel={handleResizeEnd}
            onKeyDown={handleResizeKeyDown}
            onDoubleClick={() => setAndSaveSidebarWidth(SIDEBAR_DEFAULT_WIDTH)}
          />
        )}
      </aside>

      <section className="todo-main">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-icon"><Check aria-hidden="true" /></span> daylist</div>
          <span className="topbar-date">{dateLabel}</span>
          <button className="avatar-button" type="button" onClick={handleSignOut} aria-label={`Sign out ${firstName}`} title="Sign out">{firstName.slice(0, 1).toUpperCase()}</button>
        </header>

        <div className="dashboard-content">
          {activeGame === 'snake' ? <SnakeGame /> : myDayActive ? (<>
          {message && <p className="task-message" role="alert">{message}</p>}
          <MyDay tasks={tasks} firstName={firstName} onStatusChange={handleStatusChange} onDueDateChange={handleDueDateChange} onDelete={handleDelete} onAdd={handleMyDayAdd} />
          </>) : (<>
          <div className="greeting-block">
            <span className="eyebrow">A FRESH START, EVERY DAY</span>
            <h1>{greeting}, {firstName}<span className="greeting-period">.</span></h1>
            <p>{counts.all === 0 ? 'You’ve made space for what matters.' : `You have ${counts.all} ${counts.all === 1 ? 'thing' : 'things'} on your list. You’ve got this.`}</p>
          </div>

          <section className="quick-add-card" aria-labelledby="quick-add-title">
            <div className="quick-add-heading"><span className="quick-add-icon"><Plus aria-hidden="true" /></span><div><h2 id="quick-add-title">Add a task</h2><p>Get it out of your head and onto your list.</p></div></div>
            <form className="quick-add-form" onSubmit={handleAddTask}>
              <label className="sr-only" htmlFor="task-title">Task name</label>
              <input id="task-title" className="task-title-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What would you like to get done?" maxLength={180} required />
              <div className="form-control-row">
                <label className="select-control" aria-label="Priority">
                  <ArrowDownWideNarrow aria-hidden="true" />
                  <select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)} aria-label="Priority">
                    <option value="normal">Normal priority</option><option value="high">High priority</option><option value="low">Low priority</option>
                  </select>
                </label>
                <label className="date-control" aria-label="Due date"><CalendarDays aria-hidden="true" /><span className="date-label">Due</span><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} aria-label="Due date" /></label>
                <button className="add-task-button" type="submit" disabled={isPending || !title.trim()}><Plus aria-hidden="true" /><span>{isPending ? 'Adding…' : 'Add task'}</span></button>
              </div>
            </form>
          </section>

          <section className="task-section" aria-labelledby="tasks-heading">
            <div className="task-section-heading">
              <div><span className="eyebrow">YOUR LIST</span><h2 id="tasks-heading">{filterOptions.find((option) => option.id === filter)?.label}<span className="heading-count">{visibleTasks.length}</span></h2></div>
              <label className="search-field"><Search aria-hidden="true" /><span className="sr-only">Search tasks</span><input type="search" placeholder="Find a task" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
            </div>

            {message && <p className="task-message" role="alert">{message}</p>}
            {visibleTasks.length > 0 ? (
              <ul className="task-list">
                {visibleTasks.map((task) => (
                  <li className={`task-row${task.completed ? ' is-complete' : ''}`} key={task.id}>
                    <button className="complete-button" type="button" onClick={() => handleToggle(task)} aria-label={task.completed ? `Mark ${task.title} incomplete` : `Complete ${task.title}`} aria-pressed={task.completed}>
                      {task.completed ? <CircleCheck aria-hidden="true" /> : <Circle aria-hidden="true" />}
                    </button>
                    <div className="task-copy"><span className="task-title"><span className="task-icon" aria-hidden="true">{getTaskIcon(task.title)}</span>{task.title}</span><div className="task-meta"><span className={`priority-dot priority-${task.priority}`} /><span className={`priority-label priority-text-${task.priority}`}>{task.priority} priority</span><span className="meta-separator">·</span><span className={`due-label${task.dueDate && task.dueDate < dateKey(new Date()) && !task.completed ? ' is-overdue' : ''}`}><CalendarDays aria-hidden="true" />{formatDueDate(task.dueDate)}</span></div></div>
                    <button className="delete-task-button" type="button" onClick={() => handleDelete(task)} aria-label={`Delete ${task.title}`}><Trash2 aria-hidden="true" /></button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state"><div className="empty-illustration"><Check aria-hidden="true" /></div><h3>{search ? 'No matching tasks' : filter === 'completed' ? 'Nothing checked off yet' : filter === 'today' ? 'Nothing due today' : filter === 'urgent' ? 'Nothing urgent right now' : filter === 'upcoming' ? 'Your future is looking clear' : 'A little breathing room'}</h3><p>{search ? 'Try another search, or clear the field to see your list.' : filter === 'completed' ? 'Finish a task and it’ll find its way here.' : filter === 'all' ? 'Add your first task above. Small steps count.' : filter === 'urgent' ? 'Tasks marked high priority will show up here.' : 'Enjoy the space, or add a task with a due date above.'}</p></div>
            )}
            {counts.completed > 0 && filter !== 'completed' && <button className="completed-link" type="button" onClick={() => setFilter('completed')}><CheckCheck aria-hidden="true" /> {counts.completed} {counts.completed === 1 ? 'task' : 'tasks'} completed <span>View</span></button>}
          </section>
          </>)}
          <footer className="dashboard-footer"><span><CircleCheck aria-hidden="true" /> Progress over perfection.</span><span>Made for your everyday.</span></footer>
        </div>
      </section>
    </main>
  )
}
