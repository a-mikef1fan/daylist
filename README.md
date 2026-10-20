# daylist

A calm, private to-do list. Sign up with email and password, add tasks with a due date and priority, and work through them by filter or search. Each user only sees their own tasks.

## Features

- Email and password sign-up and sign-in
- Create tasks with a title (1-180 characters), optional due date, and priority (`low`, `normal`, `high`)
- Repeat a task Daily, on Weekdays (Mon-Fri), or Weekly; completing it adds the next occurrence
- Mark tasks complete (with a short bell sound) or delete them
- Filter by All tasks, Today, Upcoming, and Completed; search by text
- Per-user data: every task query is scoped to the signed-in user
- Admin-only usage dashboard at `/admin/usage` (page views, feature usage, top pages, recent events)

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
| `ADMIN_EMAILS` | No | Comma-separated emails allowed to open `/admin/usage` and see its menu link. Unset means nobody can. List only accounts that already exist, since sign-up does not verify email addresses |
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
- App table: `tasks` (`id`, `userId`, `title`, `description`, `dueDate`, `priority`, `completed`, `createdAt`, `updatedAt`)

- Usage table: `usage_events` (`id`, `name`, `path`, `userId`, `metadata`, `createdAt`). Apply `migrations/0001_create_usage_events.sql` (idempotent) with `psql "$DATABASE_URL" -f migrations/0001_create_usage_events.sql`. Until it is applied, the app works normally (tracking failures are logged and ignored) and the dashboard shows an "unavailable" notice.

A task's repeat rule (daily, weekdays, weekly) is stored in the `description` column as a one-line marker (`[daylist:v1 repeat=weekly]`), so no extra column or migration is needed. The marker is stripped before tasks reach the UI, and ordinary descriptions are left as they are.

Column names are camelCase (for example `"userId"`), so they are case-sensitive and must be quoted in SQL.

### Usage dashboard

Signed-in admins (see `ADMIN_EMAILS`) get a "Usage dashboard" item in the account menu, or can open `/admin/usage` directly with a `?range=24h|7d|30d` selector. Everyone else gets a 404. Events are recorded in `usage_events`: `page_view` from a small beacon in the root layout (`POST /api/track`, skipped on `/admin` pages), task events from the server actions, and filter, search, and game events reported by the client through the same endpoint. Only event names, page paths, an optional user id, and small enum or number fields are stored; task titles and other content are never logged. Writes never block or fail a user action.

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
  actions/tasks.ts            Server actions: getTasks, createTask, updateTaskCompletion (adds the next occurrence of repeating tasks), deleteTask
  api/auth/[...all]/route.ts  Better Auth route handler
  api/track/route.ts          Validates and records client usage events
  admin/usage/page.tsx        Admin-only usage dashboard
components/
  auth-screen.tsx             Sign-in / sign-up UI
  todo-app.tsx                Task list UI (filters, search, create, complete, delete)
  ui/                         Shared UI primitives
lib/
  auth.ts                     Better Auth server config (Drizzle adapter, trusted origins)
  auth-client.ts              Better Auth React client
  db/index.ts                 pg pool and Drizzle client
  db/schema.ts                Drizzle schema and task types
  usage.ts                    trackEvent helper and event names
  usage-stats.ts              Dashboard aggregate queries
  admin.ts                    ADMIN_EMAILS check
  recurrence.ts               Repeat options, how the rule is stored in `description`, and next-occurrence date math
  utils.ts                    Helpers
migrations/                   Hand-applied SQL for tables added after the initial schema
```
