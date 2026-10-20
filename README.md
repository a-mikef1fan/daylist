# daylist

A calm, private to-do list. Sign up with email and password, add tasks with a due date and priority, and work through them by filter or search. Each user only sees their own tasks.

## Features

- Email and password sign-up and sign-in
- Create tasks with a title (1-180 characters), optional due date, and priority (`low`, `normal`, `high`)
- Mark tasks complete (with a short bell sound) or delete them
- Optionally assign a task to a member of your Slack workspace (display only: the assignee does not get access to the task)
- Filter by All tasks, Today, Upcoming, Urgent, Assigned, and Completed; search by text
- Per-user data: every task query is scoped to the signed-in user

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
| `SLACK_BOT_TOKEN` | No | Slack bot token (`xoxb-...`) with the `users:read` scope, used to list workspace members for task assignees. Members are cached in memory for 5 minutes. Without it, the assignee picker shows "Slack not connected" and tasks can't be newly assigned |
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
- App table: `tasks` (`id`, `userId`, `title`, `description`, `dueDate`, `priority`, `completed`, `assigneeSlackId`, `assigneeName`, `assigneeImage`, `createdAt`, `updatedAt`)

Column names are camelCase (for example `"userId"`), so they are case-sensitive and must be quoted in SQL.

The three `assignee*` columns are nullable. If your `tasks` table predates task assignees, add them with:

```sql
ALTER TABLE tasks ADD COLUMN "assigneeSlackId" text, ADD COLUMN "assigneeName" text, ADD COLUMN "assigneeImage" text;
```

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
  actions/tasks.ts            Server actions: getTasks, createTask, updateTaskCompletion, updateTaskAssignee, deleteTask
  actions/slack.ts            Server action: listSlackMembers (assignee picker)
  api/auth/[...all]/route.ts  Better Auth route handler
components/
  auth-screen.tsx             Sign-in / sign-up UI
  todo-app.tsx                Task list UI (filters, search, create, complete, assign, delete)
  assignee-picker.tsx         Slack member picker and avatar
  ui/                         Shared UI primitives
lib/
  auth.ts                     Better Auth server config (Drizzle adapter, trusted origins)
  auth-client.ts              Better Auth React client
  slack.ts                    Slack users.list lookup with in-memory cache
  db/index.ts                 pg pool and Drizzle client
  db/schema.ts                Drizzle schema and task types
  utils.ts                    Helpers
```
