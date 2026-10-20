-- Gamification: XP, levels and daily streaks.
-- Idempotent: safe to run more than once. Run it against the database before deploying.
-- Column names are camelCase and must stay quoted.

create table if not exists "xp_awards" (
  "id" text primary key,
  "userId" text not null references "user"("id") on delete cascade,
  "kind" text not null,
  "xp" integer not null,
  "awardedOn" date not null,
  "createdAt" timestamp not null default now()
);

create index if not exists "xp_awards_user_idx" on "xp_awards" ("userId", "awardedOn");

create table if not exists "user_stats" (
  "userId" text primary key references "user"("id") on delete cascade,
  "totalXp" integer not null default 0,
  "tasksCompleted" integer not null default 0,
  "currentStreak" integer not null default 0,
  "bestStreak" integer not null default 0,
  "lastActiveDate" date,
  "updatedAt" timestamp not null default now()
);

-- Backfill: give XP for tasks that were already completed before this feature existed,
-- using the same rule as the app (10 base, +5 high priority, +5 if finished on or before
-- the due date) and the last-updated date (UTC) as the day they were finished.
-- user_stats rows are created lazily the first time each user loads the app.
insert into "xp_awards" ("id", "userId", "kind", "xp", "awardedOn")
select
  'task:' || t."id",
  t."userId",
  'task',
  10
    + case when t."priority" = 'high' then 5 else 0 end
    + case when t."dueDate" is not null and t."updatedAt"::date <= t."dueDate" then 5 else 0 end,
  t."updatedAt"::date
from "tasks" t
join "user" u on u."id" = t."userId"
where t."completed"
on conflict ("id") do nothing;
