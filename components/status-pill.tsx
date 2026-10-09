import { Check, Circle, Loader, OctagonAlert } from 'lucide-react'
import { statusOptions } from '@/lib/my-day'
import type { TaskStatus } from '@/lib/db/schema'

const statusIcons = { not_started: Circle, working: Loader, stuck: OctagonAlert, done: Check }

// One shared pill: colour, an icon and the label text always travel together, so status is never colour alone.
export function StatusPill({ status, taskTitle, onChange }: { status: TaskStatus; taskTitle: string; onChange: (status: TaskStatus) => void }) {
  const Icon = statusIcons[status]
  return (
    <span className={`status-pill status-${status}`}>
      <Icon aria-hidden="true" />
      <select value={status} onChange={(event) => onChange(event.target.value as TaskStatus)} aria-label={`Status for ${taskTitle}`}>
        {statusOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    </span>
  )
}
