-- Theseus & the Minotaur leaderboard: each user's best verified solution per level.
-- This repo has no migration runner (see "Database setup" in the README), so run this once against the database,
-- for example: psql "$DATABASE_URL" -f lib/db/migrations/0001_theseus_progress.sql
-- It is idempotent and only adds a table; it does not touch existing data. Column names are camelCase and quoted
-- to match lib/db/schema.ts.
CREATE TABLE IF NOT EXISTS "theseus_progress" (
  "userId" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "level" integer NOT NULL,
  "bestMoves" integer NOT NULL,
  "moves" text NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("userId", "level")
);
