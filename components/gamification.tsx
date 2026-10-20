'use client'

import { useEffect } from 'react'
import { Award, Check, Flame, Sparkles, Star, Trophy, Zap } from 'lucide-react'
import {
  DAILY_HABIT,
  HABIT_XP,
  achievements,
  effectiveStreak,
  isHabitDoneToday,
  levelProgress,
  type Progress,
} from '@/lib/gamification'

export type CelebrationToast = {
  id: number
  kind: 'xp' | 'level' | 'streak' | 'badge' | 'undo'
  title: string
  detail?: string
}

const badgeIcons = [Star, Trophy, Award]

export function ProgressCard({ progress, today }: { progress: Progress; today: string | null }) {
  const { level, xpIntoLevel, xpForNextLevel, xpToNext, fraction } = levelProgress(progress.totalXp)
  // Before mount we don't know the browser's date, so show the stored streak and avoid a hydration mismatch.
  const streak = today ? effectiveStreak(progress, today) : progress.currentStreak
  return (
    <section className="progress-card" aria-label="Your progress">
      <div className="progress-level" aria-label={`Level ${level}`}><span>LV</span><strong>{level}</strong></div>
      <div className="progress-main">
        <div className="progress-xp-row">
          <span className="progress-xp-label"><Zap aria-hidden="true" /> {progress.totalXp} XP</span>
          <span className="progress-xp-next">{xpToNext} XP to level {level + 1}</span>
        </div>
        <div className="progress-bar" role="progressbar" aria-label="XP to next level" aria-valuemin={0} aria-valuemax={xpForNextLevel} aria-valuenow={xpIntoLevel}>
          <div className="progress-bar-fill" style={{ width: `${Math.round(fraction * 100)}%` }} />
        </div>
        <div className="progress-badges">
          {achievements.map((achievement, index) => {
            const Icon = badgeIcons[index % badgeIcons.length]
            const unlocked = achievement.unlocked(progress)
            return (
              <span key={achievement.id} className={`progress-badge${unlocked ? ' is-unlocked' : ''}`} title={`${achievement.label}: ${achievement.description}`}>
                <Icon aria-hidden="true" /> {achievement.label}
                <span className="sr-only">{unlocked ? ' (unlocked)' : ` (locked: ${achievement.description})`}</span>
              </span>
            )
          })}
        </div>
      </div>
      <div className="progress-streak" aria-label={`Current streak ${streak} ${streak === 1 ? 'day' : 'days'}, best ${progress.bestStreak}`}>
        <Flame className={streak > 0 ? 'is-lit' : ''} aria-hidden="true" />
        <strong>{streak}</strong>
        <span>day streak</span>
        <em>Best {progress.bestStreak}</em>
      </div>
    </section>
  )
}

export function DailyHabitCard({ progress, today, pending, onToggle }: { progress: Progress; today: string | null; pending: boolean; onToggle: (done: boolean) => void }) {
  // Needs the browser's local date to know whether today's habit is done, so render after mount.
  if (!today) return null
  const done = isHabitDoneToday(progress, today)
  return (
    <section className={`habit-card${done ? ' is-done' : ''}`} aria-label="Daily habit">
      <button className="complete-button" type="button" disabled={pending} onClick={() => onToggle(!done)} aria-pressed={done} aria-label={done ? `Mark ${DAILY_HABIT.title} not done today` : `Mark ${DAILY_HABIT.title} done today`}>
        {done ? <Check aria-hidden="true" /> : <span className="habit-ring" aria-hidden="true" />}
      </button>
      <div className="habit-copy"><span className="eyebrow">DAILY HABIT</span><span className="habit-title"><Sparkles aria-hidden="true" /> {DAILY_HABIT.title}</span></div>
      <span className="habit-xp">+{HABIT_XP} XP</span>
    </section>
  )
}

export function CelebrationToasts({ toasts, onDismiss }: { toasts: CelebrationToast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />)}
    </div>
  )
}

function ToastItem({ toast, onDismiss }: { toast: CelebrationToast; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), toast.kind === 'level' ? 5000 : 3200)
    return () => window.clearTimeout(timer)
  }, [toast.id, toast.kind, onDismiss])
  const Icon = toast.kind === 'level' ? Trophy : toast.kind === 'streak' ? Flame : toast.kind === 'badge' ? Award : toast.kind === 'undo' ? Zap : Sparkles
  return (
    <div className={`toast toast-${toast.kind}`}>
      <Icon aria-hidden="true" />
      <div><strong>{toast.title}</strong>{toast.detail && <span>{toast.detail}</span>}</div>
    </div>
  )
}
