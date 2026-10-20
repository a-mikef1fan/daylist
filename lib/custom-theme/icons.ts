import {
  Anchor, Atom, Bell, BadgeCheck, Bird, Bookmark, Bug, CalendarCheck, CalendarDays, Cat, Check, CheckCheck, Circle,
  CircleCheck, CircleCheckBig, CircleDot, CirclePlus, ClipboardCheck, ClipboardList, Clock3, Cloud, Coffee, Compass,
  Cookie, Crown, Dog, Droplet, Feather, Fish, Flag, Flame, Flower2, Gamepad2, Gem, Ghost, Gift, Heart, Hourglass, Key,
  Leaf, Lightbulb, List, ListChecks, ListTodo, MessageCircle, Moon, Mountain, Music, Orbit, PartyPopper, Pencil, Pizza, Plane, Plus,
  Rocket, Search, Shield, Ship, Skull, Snowflake, Sparkles, Sprout, Square, SquareCheck, Star, Sun, Swords, Target,
  Telescope, Terminal, Trash2, TreePine, Trophy, Umbrella, Waves, Wind, Worm, X, Zap, type LucideIcon,
} from 'lucide-react'

// Allow-list of icons a theme may choose from. Only these names are ever rendered.
export const ICON_REGISTRY = {
  Anchor, Atom, Bell, BadgeCheck, Bird, Bookmark, Bug, CalendarCheck, CalendarDays, Cat, Check, CheckCheck, Circle,
  CircleCheck, CircleCheckBig, CircleDot, CirclePlus, ClipboardCheck, ClipboardList, Clock3, Cloud, Coffee, Compass,
  Cookie, Crown, Dog, Droplet, Feather, Fish, Flag, Flame, Flower2, Gamepad2, Gem, Ghost, Gift, Heart, Hourglass, Key,
  Leaf, Lightbulb, List, ListChecks, ListTodo, MessageCircle, Moon, Mountain, Music, Orbit, PartyPopper, Pencil, Pizza, Plane, Plus,
  Rocket, Search, Shield, Ship, Skull, Snowflake, Sparkles, Sprout, Square, SquareCheck, Star, Sun, Swords, Target,
  Telescope, Terminal, Trash2, TreePine, Trophy, Umbrella, Waves, Wind, Worm, X, Zap,
} satisfies Record<string, LucideIcon>

export type IconName = keyof typeof ICON_REGISTRY
export const ICON_NAMES = Object.keys(ICON_REGISTRY) as [IconName, ...IconName[]]

// Semantic places in the app that can be re-skinned. To theme another icon, add a slot here
// (default icon + a hint for the model) and render it with <ThemedIcon slot="..." />.
export const ICON_SLOTS = {
  brand: { fallback: 'Check', hint: 'logo mark next to the app name' },
  add: { fallback: 'Plus', hint: 'add a task' },
  taskOpen: { fallback: 'Circle', hint: 'an unfinished task checkbox' },
  taskDone: { fallback: 'CircleCheck', hint: 'a finished task checkbox' },
  remove: { fallback: 'Trash2', hint: 'delete a task' },
  dueDate: { fallback: 'CalendarDays', hint: 'due date' },
  search: { fallback: 'Search', hint: 'search field' },
  tip: { fallback: 'Sparkles', hint: 'encouraging tip card in the sidebar' },
  filterAll: { fallback: 'ListTodo', hint: 'sidebar: all tasks' },
  filterToday: { fallback: 'CalendarDays', hint: 'sidebar: due today' },
  filterUpcoming: { fallback: 'Clock3', hint: 'sidebar: upcoming tasks' },
  filterUrgent: { fallback: 'Flame', hint: 'sidebar: urgent tasks' },
  filterDone: { fallback: 'CheckCheck', hint: 'sidebar: completed tasks' },
} as const satisfies Record<string, { fallback: IconName; hint: string }>

export type IconSlot = keyof typeof ICON_SLOTS
export const ICON_SLOT_KEYS = Object.keys(ICON_SLOTS) as [IconSlot, ...IconSlot[]]

export const isIconName = (value: unknown): value is IconName =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(ICON_REGISTRY, value)

// Ready-made icon sets: a pack fills several slots at once, anything it leaves out keeps the default icon.
export const ICON_PACKS = {
  classic: { label: 'Classic', slots: {} },
  chat: { label: 'Chat', slots: { brand: 'MessageCircle', add: 'CirclePlus', taskDone: 'CircleCheckBig', filterAll: 'ListChecks', filterDone: 'BadgeCheck' } },
  cozy: { label: 'Cozy', slots: { brand: 'Flame', add: 'CirclePlus', taskOpen: 'CircleDot', taskDone: 'Leaf', remove: 'Wind', tip: 'Coffee', filterAll: 'TreePine', filterToday: 'Sun', filterUpcoming: 'Compass', filterUrgent: 'Flame', filterDone: 'Leaf' } },
  arcade: { label: 'Arcade', slots: { brand: 'Gamepad2', add: 'Zap', taskOpen: 'Square', taskDone: 'SquareCheck', remove: 'Skull', dueDate: 'Hourglass', search: 'Telescope', tip: 'Rocket', filterAll: 'List', filterToday: 'Zap', filterUpcoming: 'Orbit', filterUrgent: 'Flame', filterDone: 'Trophy' } },
  cyber: { label: 'Cyber', slots: { brand: 'Terminal', add: 'CirclePlus', taskOpen: 'Square', taskDone: 'SquareCheck', remove: 'X', dueDate: 'Hourglass', search: 'Atom', tip: 'Zap', filterAll: 'List', filterToday: 'Clock3', filterUpcoming: 'Orbit', filterUrgent: 'Zap', filterDone: 'BadgeCheck' } },
  nature: { label: 'Nature', slots: { brand: 'Sprout', add: 'CirclePlus', taskDone: 'Leaf', remove: 'Wind', dueDate: 'Sun', tip: 'Flower2', filterAll: 'TreePine', filterToday: 'Sun', filterUpcoming: 'Cloud', filterUrgent: 'Flame', filterDone: 'Leaf' } },
  ocean: { label: 'Ocean', slots: { brand: 'Anchor', add: 'CirclePlus', taskDone: 'CircleCheckBig', remove: 'Droplet', dueDate: 'Clock3', tip: 'Ship', filterAll: 'ListChecks', filterToday: 'Sun', filterUpcoming: 'Waves', filterUrgent: 'Zap', filterDone: 'Fish' } },
  sweet: { label: 'Sweet', slots: { brand: 'Heart', add: 'CirclePlus', taskDone: 'Heart', remove: 'Feather', tip: 'Flower2', filterAll: 'ListChecks', filterToday: 'Star', filterUpcoming: 'Moon', filterUrgent: 'Flame', filterDone: 'Sparkles' } },
  sunset: { label: 'Sunset', slots: { brand: 'Sun', add: 'CirclePlus', taskDone: 'CircleCheckBig', filterAll: 'ListChecks', filterToday: 'Sun', filterUpcoming: 'Moon', filterUrgent: 'Flame', filterDone: 'BadgeCheck' } },
} as const satisfies Record<string, { label: string; slots: Partial<Record<IconSlot, IconName>> }>

export type IconPackId = keyof typeof ICON_PACKS
export const ICON_PACK_IDS = Object.keys(ICON_PACKS) as IconPackId[]

// The pack whose icons exactly match a theme's slots, or null for a custom mix.
export function matchingIconPack(slots: Partial<Record<IconSlot, IconName>>): IconPackId | null {
  const same = (pack: Partial<Record<IconSlot, IconName>>) =>
    ICON_SLOT_KEYS.every((slot) => (slots[slot] ?? ICON_SLOTS[slot].fallback) === (pack[slot] ?? ICON_SLOTS[slot].fallback))
  return ICON_PACK_IDS.find((id) => same(ICON_PACKS[id].slots)) ?? null
}
