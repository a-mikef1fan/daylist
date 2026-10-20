-- Usage events for the /admin/usage dashboard. Safe to run more than once.
CREATE TABLE IF NOT EXISTS "usage_events" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "path" text,
  "userId" text,
  "metadata" jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "usage_events_createdAt_idx" ON "usage_events" ("createdAt");
CREATE INDEX IF NOT EXISTS "usage_events_name_idx" ON "usage_events" ("name");
