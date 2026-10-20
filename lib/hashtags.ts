import type { TaskPriority } from '@/lib/db/schema'

// Hashtag shortcuts: typing `#p0` in a task title sets its priority and the token is stripped from the saved title.
// Pure helpers only (no React, no storage access) so they are easy to unit test.

export type CustomHashtag = { tag: string; priority: TaskPriority }

export const BUILTIN_HASHTAGS: Readonly<Record<string, TaskPriority>> = {
  p0: 'high',
  p1: 'normal',
  p2: 'low',
  high: 'high',
  normal: 'normal',
  low: 'low',
}

export const HASHTAGS_STORAGE_KEY = 'daylist:hashtag-shortcuts'
export const MAX_CUSTOM_HASHTAGS = 30
export const MAX_TAG_LENGTH = 20

const TAG_NAME_PATTERN = /^[a-z0-9_-]+$/
// A whole token: starts the string or follows whitespace, and ends the string or precedes whitespace.
const HASHTAG_TOKEN = /(^|\s)#([a-z0-9_-]+)(?=\s|$)/gi

export const PRIORITY_LABELS: Record<TaskPriority, string> = { high: 'High', normal: 'Normal', low: 'Low' }

export function isTaskPriority(value: unknown): value is TaskPriority {
  return value === 'low' || value === 'normal' || value === 'high'
}

export type ParsedTitle = {
  /** Title with recognised hashtag tokens removed and whitespace collapsed. Unknown hashtags are kept. */
  title: string
  /** Priority from the last recognised tag, or null when the title has none. */
  priority: TaskPriority | null
  /** Recognised tags (lowercase, without `#`) in the order they appear. */
  tags: string[]
}

export function parseHashtags(input: string, custom: readonly CustomHashtag[] = []): ParsedTitle {
  let priority: TaskPriority | null = null
  const tags: string[] = []
  const stripped = input.replace(HASHTAG_TOKEN, (match, lead: string, name: string) => {
    const tag = name.toLowerCase()
    // Built-ins win, so a stale or hand-edited custom entry can never shadow them.
    const tagPriority = Object.hasOwn(BUILTIN_HASHTAGS, tag) ? BUILTIN_HASHTAGS[tag] : custom.find((item) => item.tag === tag)?.priority
    if (!tagPriority) return match
    priority = tagPriority
    tags.push(tag)
    return lead
  })
  return { title: stripped.replace(/\s+/g, ' ').trim(), priority, tags }
}

/** Normalises user input for a tag name: trims, drops a leading `#`, lowercases. */
export function normalizeTagName(value: string) {
  return value.trim().replace(/^#/, '').toLowerCase()
}

/** Returns an error message, or null when `value` is a valid new custom tag. */
export function validateCustomTag(value: string, existing: readonly CustomHashtag[]): string | null {
  const tag = normalizeTagName(value)
  if (!tag) return 'Enter a tag name.'
  if (tag.length > MAX_TAG_LENGTH) return `Tags can be up to ${MAX_TAG_LENGTH} characters.`
  if (!TAG_NAME_PATTERN.test(tag)) return 'Use only letters, numbers, - and _.'
  if (Object.hasOwn(BUILTIN_HASHTAGS, tag)) return `#${tag} is built in.`
  if (existing.some((item) => item.tag === tag)) return `#${tag} already exists.`
  if (existing.length >= MAX_CUSTOM_HASHTAGS) return `You can add up to ${MAX_CUSTOM_HASHTAGS} shortcuts.`
  return null
}

/** Reads stored JSON defensively, dropping anything invalid or duplicated. */
export function deserializeCustomHashtags(raw: string | null): CustomHashtag[] {
  if (!raw) return []
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(data)) return []
  const result: CustomHashtag[] = []
  for (const item of data) {
    if (!item || typeof item !== 'object') continue
    const { tag, priority } = item as Record<string, unknown>
    if (typeof tag !== 'string' || !isTaskPriority(priority)) continue
    if (validateCustomTag(tag, result) !== null || normalizeTagName(tag) !== tag) continue
    result.push({ tag, priority })
  }
  return result
}
