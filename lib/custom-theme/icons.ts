import {
  Anchor, Atom, Bell, BadgeCheck, Bird, Bookmark, Bug, CalendarCheck, CalendarDays, Cat, Check, CheckCheck, Circle,
  CircleCheck, CircleCheckBig, CircleDot, CirclePlus, ClipboardCheck, ClipboardList, Clock3, Cloud, Coffee, Compass,
  Cookie, Crown, Dog, Droplet, Feather, Fish, Flag, Flame, Flower2, Gamepad2, Gem, Ghost, Gift, Heart, Hourglass, Key,
  Leaf, Lightbulb, List, ListChecks, ListTodo, Moon, Mountain, Music, Orbit, PartyPopper, Pencil, Pizza, Plane, Plus,
  Rocket, Search, Shield, Ship, Skull, Snowflake, Sparkles, Sprout, Square, SquareCheck, Star, Sun, Swords, Target,
  Telescope, Terminal, Trash2, TreePine, Trophy, Umbrella, Waves, Wind, Worm, X, Zap, type LucideIcon,
} from 'lucide-react'

// Allow-list of icons a theme may choose from. Only these names are ever rendered.
export const ICON_REGISTRY = {
  Anchor, Atom, Bell, BadgeCheck, Bird, Bookmark, Bug, CalendarCheck, CalendarDays, Cat, Check, CheckCheck, Circle,
  CircleCheck, CircleCheckBig, CircleDot, CirclePlus, ClipboardCheck, ClipboardList, Clock3, Cloud, Coffee, Compass,
  Cookie, Crown, Dog, Droplet, Feather, Fish, Flag, Flame, Flower2, Gamepad2, Gem, Ghost, Gift, Heart, Hourglass, Key,
  Leaf, Lightbulb, List, ListChecks, ListTodo, Moon, Mountain, Music, Orbit, PartyPopper, Pencil, Pizza, Plane, Plus,
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
