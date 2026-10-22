import { sql } from 'drizzle-orm'
import type { SyncSummary } from '@/lib/google-tasks'
import {
  boolean,
  date,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
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
  // Google Tasks link (null for tasks that did not come from Google).
  googleTaskId: text('googleTaskId'),
  googleListId: text('googleListId'),
  googleSyncedAt: timestamp('googleSyncedAt'),
}, (table) => [
  uniqueIndex('tasks_user_google_task_idx')
    .on(table.userId, table.googleTaskId)
    .where(sql`${table.googleTaskId} is not null`),
])

// Per-user Google Tasks sync state: which list to sync and the last result.
export const googleTasksSync = pgTable('google_tasks_sync', {
  userId: text('userId')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  listId: text('listId').notNull().default('@default'),
  lastSyncedAt: timestamp('lastSyncedAt'),
  lastResult: jsonb('lastResult').$type<SyncSummary>(),
})

export type Task = typeof tasks.$inferSelect
export type TaskPriority = 'low' | 'normal' | 'high'
export type NewTaskInput = {
  title: string
  dueDate: string
  priority: TaskPriority
}

export const authSchema = { user, session, account, verification }
export const appSchema = { tasks, googleTasksSync }
export const schema = { ...authSchema, ...appSchema }
