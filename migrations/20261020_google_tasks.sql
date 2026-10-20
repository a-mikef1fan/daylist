-- Google Tasks integration. Purely additive and safe to re-run.
-- Run once against your database (for example with psql -f). Column names are
-- camelCase and quoted, matching lib/db/schema.ts.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "googleTaskId" text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "googleListId" text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "googleSyncedAt" timestamp;

CREATE UNIQUE INDEX IF NOT EXISTS tasks_user_google_task_idx
  ON tasks ("userId", "googleTaskId")
  WHERE "googleTaskId" IS NOT NULL;

CREATE TABLE IF NOT EXISTS google_tasks_sync (
  "userId" text PRIMARY KEY REFERENCES "user" (id) ON DELETE CASCADE,
  "listId" text NOT NULL DEFAULT '@default',
  "lastSyncedAt" timestamp,
  "lastResult" jsonb
);
