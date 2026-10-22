'use client'

import { useMemo, useState, useTransition } from 'react'
import { CalendarDays, Pencil, Plus, Target, Trash2 } from 'lucide-react'
import { createGoal, deleteGoal, updateGoal } from '@/app/actions/goals'
import { GOAL_DESCRIPTION_MAX, GOAL_TITLE_MAX, formatGoalDate, getGoalProgress, localDateKey } from '@/lib/goals'
import type { Goal } from '@/lib/db/schema'
import type { TaskView } from '@/lib/recurrence'
import './goals.css'

type GoalFormValues = { title: string; description: string; targetDate: string }

function GoalForm({
  initial,
  idPrefix,
  submitLabel,
  pendingLabel,
  resetOnSuccess,
  onSubmit,
  onCancel,
}: {
  initial: GoalFormValues
  idPrefix: string
  submitLabel: string
  pendingLabel: string
  resetOnSuccess?: boolean
  onSubmit: (values: GoalFormValues) => Promise<void>
  onCancel?: () => void
}) {
  const [values, setValues] = useState(initial)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!values.title.trim()) return
    setError('')
    startTransition(async () => {
      try {
        await onSubmit(values)
        if (resetOnSuccess) setValues(initial)
      } catch {
        setError('Could not save that goal. Please try again.')
      }
    })
  }

  return (
    <form className="quick-add-form" onSubmit={handleSubmit}>
      <div className="goal-form-fields">
        <label className="sr-only" htmlFor={`${idPrefix}-title`}>Goal name</label>
        <input id={`${idPrefix}-title`} className="task-title-input" value={values.title} onChange={(event) => setValues({ ...values, title: event.target.value })} placeholder="What do you want to achieve?" maxLength={GOAL_TITLE_MAX} required />
        <label className="sr-only" htmlFor={`${idPrefix}-description`}>Goal description</label>
        <input id={`${idPrefix}-description`} className="task-title-input" value={values.description} onChange={(event) => setValues({ ...values, description: event.target.value })} placeholder="Why does it matter? (optional)" maxLength={GOAL_DESCRIPTION_MAX} />
      </div>
      <div className="form-control-row">
        <label className="date-control" aria-label="Target date"><CalendarDays aria-hidden="true" /><span className="date-label">Target</span><input type="date" value={values.targetDate} onChange={(event) => setValues({ ...values, targetDate: event.target.value })} aria-label="Target date" /></label>
        {onCancel && <button className="goal-cancel-button" type="button" onClick={onCancel}>Cancel</button>}
        <button className="add-task-button" type="submit" disabled={isPending || !values.title.trim()}><Plus aria-hidden="true" /><span>{isPending ? pendingLabel : submitLabel}</span></button>
      </div>
      {error && <p className="goal-form-error" role="alert">{error}</p>}
    </form>
  )
}

export function GoalsView({
  goals,
  tasks,
  onCreated,
  onUpdated,
  onDeleted,
  onViewTasks,
}: {
  goals: Goal[]
  tasks: TaskView[]
  onCreated: (goal: Goal) => void
  onUpdated: (goal: Goal) => void
  onDeleted: (id: string) => void
  onViewTasks: (id: string) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [, startTransition] = useTransition()
  // Progress is derived from the live task list so it updates as tasks are completed.
  const progress = useMemo(() => getGoalProgress(tasks), [tasks])
  const today = localDateKey(new Date())

  function handleDelete(goal: Goal) {
    const total = progress.get(goal.id)?.total ?? 0
    const kept = total === 0 ? '' : ` Its ${total} ${total === 1 ? 'task' : 'tasks'} will be kept, just no longer linked to a goal.`
    if (!window.confirm(`Delete the goal “${goal.title}”?${kept}`)) return
    setMessage('')
    startTransition(async () => {
      try {
        await deleteGoal(goal.id)
        onDeleted(goal.id)
      } catch {
        setMessage('Could not delete that goal. Please try again.')
      }
    })
  }

  return (
    <>
      <div className="greeting-block">
        <span className="eyebrow">KEEP YOUR EYE ON THE PRIZE</span>
        <h1>Goals<span className="greeting-period">.</span></h1>
        <p>Group tasks under the bigger things you’re working toward, and watch the progress add up.</p>
      </div>

      <section className="quick-add-card" aria-labelledby="goal-add-title">
        <div className="quick-add-heading"><span className="quick-add-icon"><Target aria-hidden="true" /></span><div><h2 id="goal-add-title">Set a goal</h2><p>Give your tasks a bigger purpose.</p></div></div>
        <GoalForm
          initial={{ title: '', description: '', targetDate: '' }}
          idPrefix="new-goal"
          submitLabel="Add goal"
          pendingLabel="Adding…"
          resetOnSuccess
          onSubmit={async (values) => {
            const goal = await createGoal({ title: values.title.trim(), description: values.description.trim() || null, targetDate: values.targetDate || null })
            onCreated(goal)
          }}
        />
      </section>

      <section className="task-section" aria-labelledby="goals-heading">
        <div className="task-section-heading">
          <div><span className="eyebrow">YOUR GOALS</span><h2 id="goals-heading">All goals<span className="heading-count">{goals.length}</span></h2></div>
        </div>
        {message && <p className="goals-message" role="alert">{message}</p>}
        {goals.length > 0 ? (
          <ul className="goal-list">
            {goals.map((goal) => {
              const { completed, total } = progress.get(goal.id) ?? { completed: 0, total: 0 }
              const percent = total === 0 ? 0 : Math.round((completed / total) * 100)
              const reached = total > 0 && completed === total
              if (editingId === goal.id) {
                return (
                  <li className="goal-card" key={goal.id}>
                    <GoalForm
                      initial={{ title: goal.title, description: goal.description ?? '', targetDate: goal.targetDate ?? '' }}
                      idPrefix={`goal-${goal.id}`}
                      submitLabel="Save"
                      pendingLabel="Saving…"
                      onCancel={() => setEditingId(null)}
                      onSubmit={async (values) => {
                        const updated = await updateGoal(goal.id, { title: values.title.trim(), description: values.description.trim() || null, targetDate: values.targetDate || null })
                        onUpdated(updated)
                        setEditingId(null)
                      }}
                    />
                  </li>
                )
              }
              return (
                <li className={`goal-card${reached ? ' is-reached' : ''}`} key={goal.id}>
                  <div className="goal-card-head">
                    <h3 className="goal-card-title">{goal.title}</h3>
                    <div className="goal-card-actions">
                      <button className="goal-icon-button" type="button" onClick={() => setEditingId(goal.id)} aria-label={`Edit ${goal.title}`}><Pencil aria-hidden="true" /></button>
                      <button className="goal-icon-button is-danger" type="button" onClick={() => handleDelete(goal)} aria-label={`Delete ${goal.title}`}><Trash2 aria-hidden="true" /></button>
                    </div>
                  </div>
                  {goal.description && <p className="goal-description">{goal.description}</p>}
                  <div className="goal-progress" role="progressbar" aria-label={`Progress for ${goal.title}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={total === 0 ? 'No tasks yet' : `${completed} of ${total} tasks done`}><span style={{ width: `${percent}%` }} /></div>
                  <div className="goal-card-foot">
                    <span className="goal-count">{total === 0 ? 'No tasks yet' : `${completed} of ${total} ${total === 1 ? 'task' : 'tasks'} done`}</span>
                    {goal.targetDate && <><span className="meta-separator">·</span><span className={`goal-target${goal.targetDate < today && !reached ? ' is-overdue' : ''}`}><CalendarDays aria-hidden="true" />Target {formatGoalDate(goal.targetDate)}</span></>}
                    <button className="goal-view-tasks" type="button" onClick={() => onViewTasks(goal.id)}>View tasks</button>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="empty-state"><div className="empty-illustration"><Target aria-hidden="true" /></div><h3>No goals yet</h3><p>Add a goal above, then link tasks to it from the add-task form or any task in your list.</p></div>
        )}
      </section>
    </>
  )
}
