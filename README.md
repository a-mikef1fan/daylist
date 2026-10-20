# daylist

A calm, private to-do list. Sign up with email and password, add tasks with a due date and priority, and work through them by filter or search. Each user only sees their own tasks.

## Features

- Email and password sign-up and sign-in
- Create tasks with a title (1-180 characters), optional due date, and priority (`low`, `normal`, `high`)
- Repeat a task Daily, on Weekdays (Mon-Fri), or Weekly; completing it adds the next occurrence
- Group tasks under Goals (title, optional description and target date) with a progress bar; link a task to a goal when adding it, or change or clear its goal from the task list, and filter tasks by goal
- Mark tasks complete (with a short sound you can choose in User preferences: Ding, Chime, Bell, Pop, or Blip) or delete them
- Filter by All tasks, Today, Upcoming, and Completed; search by text
- Per-user data: every task query is scoped to the signed-in user
- Color themes: pick one of eight palettes from account menu > User preferences; the choice is remembered per browser (`localStorage`)

## Tech stack

- [Next.js](https://nextjs.org) 16 (App Router, server actions) with React 19 and TypeScript
- [Better Auth](https://www.better-auth.com) for authentication (email and password)
- [Drizzle ORM](https://orm.drizzle.team) with PostgreSQL via `pg`
- Tailwind CSS 4, shadcn/ui config, Base UI, and lucide-react for the UI
- Vercel Analytics (enabled only when `NODE_ENV` is `production`)
- pnpm for package management

## Getting started

### Prerequisites

- Node.js
- pnpm (`packageManager` is pinned in `package.json`)
- A PostgreSQL database

### Environment variables

Create `.env.local` (git-ignored) in the project root:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string, used by `lib/db/index.ts` |
| `BETTER_AUTH_URL` | No | Public base URL for auth. On Vercel preview deployments (`VERCEL_ENV=preview`) the branch URL (`VERCEL_BRANCH_URL`, else `VERCEL_URL`) takes precedence. Otherwise falls back to `VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_URL`, `V0_RUNTIME_URL`, then `http://localhost:3000` |

#### Preview test user (optional)

To skip creating an account on every Vercel preview URL, a "Sign in as test user (preview only)" button can be enabled. It is active only when `VERCEL_ENV` is `preview` and both variables below are set; otherwise the button is hidden and `POST /api/preview-login` returns 404 (production and local dev are unaffected).

| Variable | Purpose |
| --- | --- |
| `PREVIEW_TEST_EMAIL` | Email of the test account (created on first use if it does not exist) |
| `PREVIEW_TEST_PASSWORD` | Password of the test account (at least 8 characters) |

Set these in Vercel for the **Preview** environment only, and use a dedicated throwaway account. Previews may share the production database, so do not reuse a real account. Preview URLs are reachable by anyone with the link unless Deployment Protection is enabled.

Better Auth also reads its own secret from the environment (`BETTER_AUTH_SECRET`); this is a Better Auth convention rather than something referenced in this repo's code, so check the [Better Auth docs](https://www.better-auth.com/docs/reference/options) and set it for any non-local deployment.

Deployment origins are trusted from `VERCEL_URL`, `VERCEL_BRANCH_URL`, and `VERCEL_PROJECT_PRODUCTION_URL`. In development, `http://localhost:3000` and the `V0_RUNTIME_URL`, `V0_DEV_APP_URL`, `V0_BUILD_URL`, and `V0_SANDBOX_URL` origins are trusted.

### Database setup

The schema is defined in `lib/db/schema.ts` (Drizzle `pgTable` definitions). This repo has no Drizzle config, no `drizzle-kit` dependency, and no migrations, so there is no migration command. Create these tables in your database yourself, matching the schema:

- Auth tables used by Better Auth: `user`, `session`, `account`, `verification`
- App table: `tasks` (`id`, `userId`, `title`, `description`, `dueDate`, `priority`, `completed`, `createdAt`, `updatedAt`, `goalId`)
- App table: `goals` (`id`, `userId`, `title`, `description`, `targetDate`, `createdAt`, `updatedAt`)

`tasks.goalId` is a nullable foreign key to `goals.id` with `ON DELETE SET NULL`, so deleting a goal keeps its tasks and just unlinks them. If you already have a `tasks` table, run `migrations/0001_create_goals.sql` (idempotent, safe to re-run) to add the `goals` table and the `goalId` column before deploying: `psql "$DATABASE_URL" -f migrations/0001_create_goals.sql`.

A task's repeat rule (daily, weekdays, weekly) is stored in the `description` column as a one-line marker (`[daylist:v1 repeat=weekly]`), so no extra column or migration is needed. The marker is stripped before tasks reach the UI, and ordinary descriptions are left as they are.

Column names are camelCase (for example `"userId"`), so they are case-sensitive and must be quoted in SQL.

### Run

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000.

## Scripts

| Script | Command | Description |
| --- | --- | --- |
| `pnpm dev` | `next dev` | Start the development server |
| `pnpm build` | `next build` | Create a production build |
| `pnpm start` | `next start` | Serve the production build |

## Project structure

```
app/
  page.tsx                    Shows the auth screen or the signed-in task list
  layout.tsx                  Root layout and metadata
  themes.css                  Hue definitions for each color theme
  actions/goals.ts            Server actions: getGoals (with progress), createGoal, updateGoal, deleteGoal, setTaskGoal
  actions/tasks.ts            Server actions: getTasks, createTask, updateTaskCompletion (adds the next occurrence of repeating tasks), deleteTask
  api/auth/[...all]/route.ts  Better Auth route handler
components/
  auth-screen.tsx             Sign-in / sign-up UI
  theme-provider.tsx          Applies and persists the selected color theme (`data-theme` on `<html>`)
  theme-picker.tsx            Color theme swatch picker, shown in User preferences
  todo-app.tsx                Task list UI (filters, search, create, complete, delete)
  goals-view.tsx              Goals page: add, edit, delete goals and see progress
  task-goal.tsx               Goal chip on task rows and the goal filter chip
  ui/                         Shared UI primitives
lib/
  auth.ts                     Better Auth server config (Drizzle adapter, trusted origins)
  auth-client.ts              Better Auth React client
  db/index.ts                 pg pool and Drizzle client
  db/schema.ts                Drizzle schema and task types
  themes.ts                   Theme ids, storage key, and the pre-paint init script
  goals.ts                    Goal limits, date helpers, and per-goal progress counts
  recurrence.ts               Repeat options, how the rule is stored in `description`, and next-occurrence date math
  utils.ts                    Helpers
```
