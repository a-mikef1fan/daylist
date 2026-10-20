-- Goals: a user-owned goal that tasks can optionally be linked to.
--
-- Run this once against your PostgreSQL database BEFORE deploying the Goals
-- feature (the app selects tasks."goalId", so the column must exist first).
-- It is idempotent: safe to run more than once.
--
--   psql "$DATABASE_URL" -f migrations/0001_create_goals.sql
--
-- Column names are camelCase and quoted, matching lib/db/schema.ts.

BEGIN;

CREATE TABLE IF NOT EXISTS goals (
  id           text PRIMARY KEY,
  "userId"     text NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  title        text NOT NULL,
  description  text,
  "targetDate" date,
  "createdAt"  timestamp NOT NULL DEFAULT now(),
  "updatedAt"  timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS goals_user_id_idx ON goals ("userId");

-- Nullable link from a task to a goal.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "goalId" text;

-- ON DELETE SET NULL: deleting a goal keeps its tasks and just unlinks them.
-- ADD CONSTRAINT has no IF NOT EXISTS, so guard it for re-runs.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_goal_id_goals_id_fk'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_goal_id_goals_id_fk
      FOREIGN KEY ("goalId") REFERENCES goals (id) ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS tasks_goal_id_idx ON tasks ("goalId");

COMMIT;
