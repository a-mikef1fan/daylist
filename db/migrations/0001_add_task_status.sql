-- Adds the Status column used by the "My day" view (Not started, Working on it, Stuck, Done).
-- Run once against the database before deploying this change. Safe to re-run.
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'not_started';
-- Existing completed tasks become Done.
UPDATE "tasks" SET "status" = 'done' WHERE "completed" = true AND "status" = 'not_started';
