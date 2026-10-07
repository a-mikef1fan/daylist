'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowDownWideNarrow,
  CalendarDays,
  Check,
  CheckCheck,
  Circle,
  CircleCheck,
  Clock3,
  ListTodo,
  LogOut,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { createTask, deleteTask, updateTask, updateTaskCompletion } from '@/app/actions/tasks'
import { TaskEditForm, focusEditButton, type TaskDraft } from '@/components/task-edit-form'
import { authClient } from '@/lib/auth-client'
import type { Task, TaskPriority } from '@/lib/db/schema'

type FilterKey = 'all' | 'today' | 'upcoming' | 'completed'

const filterOptions: { id: FilterKey; label: string; icon: typeof ListTodo }[] = [
  { id: 'all', label: 'All tasks', icon: ListTodo },
  { id: 'today', label: 'Today', icon: CalendarDays },
  { id: 'upcoming', label: 'Upcoming', icon: Clock3 },
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
  const [search, setSearch] = useState('')
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('normal')
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const counts = useMemo(() => {
    const today = dateKey(new Date())
    return {
      all: tasks.filter((task) => !task.completed).length,
      today: tasks.filter((task) => !task.completed && task.dueDate === today).length,
      upcoming: tasks.filter((task) => !task.completed && task.dueDate && task.dueDate > today).length,
      completed: tasks.filter((task) => task.completed).length,
    }
  }, [tasks])

  const visibleTasks = useMemo(() => {
    const today = dateKey(new Date())
    const normalizedSearch = search.trim().toLowerCase()
    return tasks
      .filter((task) => {
        if (filter === 'today' && (task.completed || task.dueDate !== today)) return false
        if (filter === 'upcoming' && (task.completed || !task.dueDate || task.dueDate <= today)) return false
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
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, completed: !item.completed } : item))
    startTransition(async () => {
      try {
        const updated = await updateTaskCompletion(task.id, !task.completed)
        setTasks((current) => current.map((item) => item.id === updated.id ? updated : item))
        router.refresh()
      } catch {
        setTasks((current) => current.map((item) => item.id === task.id ? { ...item, completed: task.completed } : item))
        setMessage('Could not update that task. Please try again.')
      }
    })
  }

  function closeEdit(task: Task) {
    setEditingId(null)
    focusEditButton(task.id)
  }

  function handleUpdate(task: Task, draft: TaskDraft) {
    setMessage('')
    closeEdit(task)
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, ...draft } : item))
    startTransition(async () => {
      try {
        const updated = await updateTask(task.id, draft)
        setTasks((current) => current.map((item) => item.id === updated.id ? updated : item))
        router.refresh()
      } catch {
        setTasks((current) => current.map((item) => item.id === task.id ? task : item))
        setMessage('Could not update that task. Please try again.')
      }
    })
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
    <main className="app-shell">
      <aside className="side-rail" aria-label="Task navigation">
        <a href="/" className="brand-mark"><span className="brand-icon"><Check aria-hidden="true" /></span><span>daylist</span></a>
        <div className="rail-caption">YOUR SPACE</div>
        <nav className="filter-nav" aria-label="Task filters">
          {filterOptions.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className={`filter-link${filter === id ? ' is-active' : ''}`} onClick={() => setFilter(id)} aria-current={filter === id ? 'page' : undefined}>
              <Icon aria-hidden="true" /> <span>{label}</span><span className="filter-count">{counts[id]}</span>
            </button>
          ))}
        </nav>
        <div className="rail-tip"><Sparkles aria-hidden="true" /><p>Keep it simple.<br /><strong>One step at a time.</strong></p></div>
        <button className="sign-out-button" type="button" onClick={handleSignOut}><LogOut aria-hidden="true" /><span>Sign out</span></button>
      </aside>

      <section className="todo-main">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-icon"><Check aria-hidden="true" /></span> daylist</div>
          <span className="topbar-date">{dateLabel}</span>
          <button className="avatar-button" type="button" onClick={handleSignOut} aria-label={`Sign out ${firstName}`} title="Sign out">{firstName.slice(0, 1).toUpperCase()}</button>
        </header>

        <div className="dashboard-content">
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
                    {editingId === task.id ? (
                      <TaskEditForm task={task} pending={isPending} onSave={(draft) => handleUpdate(task, draft)} onCancel={() => closeEdit(task)} />
                    ) : (<>
                    <div className="task-copy"><span className="task-title">{task.title}</span><div className="task-meta"><span className={`priority-dot priority-${task.priority}`} /><span className={`priority-label priority-text-${task.priority}`}>{task.priority} priority</span><span className="meta-separator">·</span><span className={`due-label${task.dueDate && task.dueDate < dateKey(new Date()) && !task.completed ? ' is-overdue' : ''}`}><CalendarDays aria-hidden="true" />{formatDueDate(task.dueDate)}</span></div></div>
                    <button className="delete-task-button te-edit-button" type="button" onClick={() => setEditingId(task.id)} data-te-edit={task.id} aria-label={`Edit ${task.title}`}><Pencil aria-hidden="true" /></button>
                    <button className="delete-task-button" type="button" onClick={() => handleDelete(task)} aria-label={`Delete ${task.title}`}><Trash2 aria-hidden="true" /></button>
                    </>)}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state"><div className="empty-illustration"><Check aria-hidden="true" /></div><h3>{search ? 'No matching tasks' : filter === 'completed' ? 'Nothing checked off yet' : filter === 'today' ? 'Nothing due today' : filter === 'upcoming' ? 'Your future is looking clear' : 'A little breathing room'}</h3><p>{search ? 'Try another search, or clear the field to see your list.' : filter === 'completed' ? 'Finish a task and it’ll find its way here.' : filter === 'all' ? 'Add your first task above. Small steps count.' : 'Enjoy the space, or add a task with a due date above.'}</p></div>
            )}
            {counts.completed > 0 && filter !== 'completed' && <button className="completed-link" type="button" onClick={() => setFilter('completed')}><CheckCheck aria-hidden="true" /> {counts.completed} {counts.completed === 1 ? 'task' : 'tasks'} completed <span>View</span></button>}
          </section>
          <footer className="dashboard-footer"><span><CircleCheck aria-hidden="true" /> Progress over perfection.</span><span>Made for your everyday.</span></footer>
        </div>
      </section>
    </main>
  )
}
