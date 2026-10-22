-- Adds the Kanban status to tasks (todo / in_progress / done).
-- Safe to run more than once. Existing completed tasks become 'done'; everything else stays 'todo'.
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'todo';
UPDATE "tasks" SET "status" = 'done' WHERE "completed" = true AND "status" <> 'done';
