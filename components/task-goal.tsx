'use client'

import { Target, X } from 'lucide-react'
import type { Goal } from '@/lib/db/schema'
import './goals.css'

// A goal badge on a task row. It is a native select styled as a chip, so a task's
// goal can be changed or cleared in place. Hidden when the user has no goals yet.
export function TaskGoalSelect({
  taskTitle,
  goalId,
  goals,
  onChange,
}: {
  taskTitle: string
  goalId: string | null
  goals: Goal[]
  onChange: (goalId: string | null) => void
}) {
  const current = goals.find((goal) => goal.id === goalId)
  if (!current && goals.length === 0) return null
  return (
    <label className={`goal-chip${current ? ' has-goal' : ''}`} title={current ? `Goal: ${current.title}` : 'Add to a goal'}>
      <Target aria-hidden="true" />
      <select value={current?.id ?? ''} onChange={(event) => onChange(event.target.value || null)} aria-label={`Goal for ${taskTitle}`}>
        <option value="">No goal</option>
        {goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}
      </select>
    </label>
  )
}

export function GoalFilterChip({ goal, onClear }: { goal: Goal; onClear: () => void }) {
  return (
    <div className="goal-filter-chip">
      <Target aria-hidden="true" />
      <span>Showing tasks for goal “{goal.title}”</span>
      <button type="button" onClick={onClear} aria-label="Clear goal filter"><X aria-hidden="true" /></button>
    </div>
  )
}
