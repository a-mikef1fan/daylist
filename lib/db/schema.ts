import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  dueDate: date('dueDate'),
  priority: text('priority').notNull().default('normal'),
  completed: boolean('completed').notNull().default(false),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

// One row per XP grant (a completed task). Stats are derived
// from these rows, so un-completing deletes the row and takes exactly that XP away.
// `id` is `task:<taskId>`, which makes grants idempotent.
// `awardedOn` is the user's local calendar date when the XP was earned (see lib/gamification.ts).
export const xpAwards = pgTable(
  'xp_awards',
  {
    id: text('id').primaryKey(),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    xp: integer('xp').notNull(),
    awardedOn: date('awardedOn').notNull(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => [index('xp_awards_user_idx').on(table.userId, table.awardedOn)],
)

// Cached per-user totals, recomputed from xp_awards on every change.
export const userStats = pgTable('user_stats', {
  userId: text('userId')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  totalXp: integer('totalXp').notNull().default(0),
  tasksCompleted: integer('tasksCompleted').notNull().default(0),
  currentStreak: integer('currentStreak').notNull().default(0),
  bestStreak: integer('bestStreak').notNull().default(0),
  lastActiveDate: date('lastActiveDate'),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export type Task = typeof tasks.$inferSelect
export type TaskPriority = 'low' | 'normal' | 'high'
export type NewTaskInput = {
  title: string
  dueDate: string
  priority: TaskPriority
}

export const authSchema = { user, session, account, verification }
export const appSchema = { tasks, xpAwards, userStats }
export const schema = { ...authSchema, ...appSchema }
