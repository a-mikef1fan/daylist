// Picks a fun emoji for a task from keywords in its title.
// Pure and deterministic: the same title always gets the same icon.

const DEFAULT_TASK_ICON = '✨'

// Checked in order, so the first matching rule wins. Keywords match at the
// start of a word ("run" matches "running" but not "prune").
const iconRules: Array<{ icon: string; keywords: string[] }> = [
  { icon: '🎉', keywords: ['birthday', 'party', 'celebrat', 'anniversary', 'wedding'] },
  { icon: '🦷', keywords: ['dentist', 'dental', 'teeth', 'orthodont'] },
  { icon: '🩺', keywords: ['doctor', 'dr.', 'physio', 'checkup', 'check-up', 'clinic', 'medical', 'prescription', 'pharmacy'] },
  { icon: '🛒', keywords: ['grocer', 'shop', 'buy', 'store', 'supermarket', 'errand'] },
  { icon: '📅', keywords: ['meeting', 'standup', 'stand-up', 'sync', 'appointment', 'schedule', 'interview'] },
  { icon: '📞', keywords: ['call', 'phone', 'ring'] },
  { icon: '💪', keywords: ['gym', 'workout', 'exercise', 'lift', 'yoga', 'stretch', 'train'] },
  { icon: '🏃', keywords: ['run', 'jog', 'walk', 'hike', 'cardio'] },
  { icon: '✉️', keywords: ['email', 'e-mail', 'inbox', 'reply', 'respond', 'mail'] },
  { icon: '💻', keywords: ['code', 'bug', 'deploy', 'debug', 'commit', 'refactor', 'ship'] },
  { icon: '🧹', keywords: ['clean', 'laundry', 'tidy', 'vacuum', 'dishes', 'declutter', 'sweep', 'mop'] },
  { icon: '📚', keywords: ['book', 'read', 'study', 'homework', 'learn', 'course', 'class'] },
  { icon: '💸', keywords: ['pay', 'bill', 'rent', 'invoice', 'tax', 'budget', 'bank'] },
  { icon: '✈️', keywords: ['flight', 'travel', 'trip', 'vacation', 'pack', 'airport', 'hotel'] },
  { icon: '🍳', keywords: ['cook', 'dinner', 'lunch', 'breakfast', 'meal', 'bake', 'recipe'] },
  { icon: '🐶', keywords: ['dog', 'vet', 'pet'] },
  { icon: '🎁', keywords: ['gift'] },
  { icon: '📝', keywords: ['write', 'draft', 'report', 'essay', 'notes', 'planning', 'proposal'] },
]

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const compiledRules = iconRules.map(({ icon, keywords }) => ({
  icon,
  pattern: new RegExp(`(?:^|[^a-z0-9])(?:${keywords.map((keyword) => escapeRegExp(keyword.trim())).join('|')})`, 'i'),
}))

export function getTaskIcon(title: string): string {
  const match = compiledRules.find(({ pattern }) => pattern.test(title))
  return match ? match.icon : DEFAULT_TASK_ICON
}
