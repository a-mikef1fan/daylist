# daylist

A calm, private to-do list. Sign up with email and password, add tasks with a due date and priority, and work through them by filter or search. Each user only sees their own tasks.

## Features

- Email and password sign-up and sign-in
- Create tasks with a title (1-180 characters), optional due date, and priority (`low`, `normal`, `high`)
- Repeat a task Daily, on Weekdays (Mon-Fri), or Weekly; completing it adds the next occurrence
- Mark tasks complete (with a short sound you can choose in User preferences: Ding, Chime, Bell, Pop, or Blip) or delete them
- Filter by All tasks, Today, Upcoming, and Completed; search by text
- Per-user data: every task query is scoped to the signed-in user
- Theseus & the Minotaur leaderboard: wins are saved per user; the server replays each submitted move list with the game rules before storing it. Ranked by the farthest level reached with every level before it solved, then fewest total steps (one step is one turn, a move or a wait), then earliest to reach that state
- Color themes: pick one of eight palettes from account menu > User preferences; the choice is remembered per browser (`localStorage`)
- Optional Google Tasks sync: import tasks from a Google Tasks list and keep completion in step (see [Google Tasks integration](#google-tasks-integration))

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
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | No | Google OAuth client for the Google Tasks integration. Both must be set to enable it; without them the Google provider is not registered and the app runs normally (the Google Tasks dialog shows "not set up"). See [Google Tasks integration](#google-tasks-integration) |
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

Google Tasks adds three nullable columns to `tasks` (`googleTaskId`, `googleListId`, `googleSyncedAt`), a partial unique index on (`userId`, `googleTaskId`), and a small `google_tasks_sync` table (selected list and last sync result). They are in `migrations/20261020_google_tasks.sql`, which is additive and safe to re-run. **Run it before deploying this version**, because the app now reads those columns on every task query:

```bash
psql "$DATABASE_URL" -f migrations/20261020_google_tasks.sql
```

A task's repeat rule (daily, weekdays, weekly) is stored in the `description` column as a one-line marker (`[daylist:v1 repeat=weekly]`), so no extra column or migration is needed. The marker is stripped before tasks reach the UI, and ordinary descriptions are left as they are.

Theseus & the Minotaur progress needs no table of its own (a demo shortcut): each player's progress is one reserved row in `tasks` with `id` and `userId` set to `theseus:<user id>` and a JSON payload in `description`. Because every task query filters on the signed-in user's real id, these rows never appear in task lists and cannot be changed by the task actions. See `lib/theseus-store.ts`; moving to a dedicated table later means copying each payload's levels into rows and deleting the `theseus:%` task rows.

Column names are camelCase (for example `"userId"`), so they are case-sensitive and must be quoted in SQL.

### Google Tasks integration

Signed-in users can connect a Google account from the account menu (**Google Tasks**), then press **Sync now**. What it does:

- Imports tasks from the selected Google list (default: the account's default list) as daylist tasks: title, notes (as the description), due date, and completed status. Tasks already imported are matched by Google task ID, so syncing again never duplicates them. Deleted, hidden, and untitled Google tasks are skipped.
- Keeps completion in step both ways. Completing or un-completing an imported task in daylist updates the Google task right away. On **Sync now**, completion changes made in Google are pulled in. If a change made in daylist could not be sent to Google (for example while offline), daylist's version wins and is sent on the next sync.
- Nothing is created in Google, and nothing is deleted anywhere. Edits to titles, notes, and due dates are not synced after the first import. Completing a repeating task in daylist adds its next occurrence as a normal daylist task, which is not linked to Google.
- Sync runs only when the button is pressed (no background job).

Google is registered in Better Auth only to connect Tasks to an existing account: it cannot be used to sign in or sign up, and the Google account does not need to share the daylist email. OAuth tokens stay on the server (the `account` table); the browser only ever sees connection status and sync counts.

#### Setup (repo owners)

1. In the [Google Cloud Console](https://console.cloud.google.com/), create or pick a project and **enable the Google Tasks API** (APIs & Services > Library).
2. Configure the **OAuth consent screen** and add the scope `https://www.googleapis.com/auth/tasks`. While the app is in "Testing" mode, add each person who will connect as a test user. This scope is classed as sensitive, so Google requires app verification before the general public can use it.
3. Create an **OAuth client ID** of type "Web application" (APIs & Services > Credentials) and add these **authorized redirect URIs** (`<BASE_URL>/api/auth/callback/google`):
   - `https://create-to-do-app-dusky.vercel.app/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google`

   Vercel preview deployments have their own URLs; each one you want to connect from needs its redirect URI added too.
4. In Vercel (Project > Settings > Environment Variables), set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` for the environments that should have the feature, and redeploy. Locally, put them in `.env.local`. Never share the secret in chat or commit it.
5. Run `migrations/20261020_google_tasks.sql` (see Database setup).

Users who connect can revoke access any time at https://myaccount.google.com/permissions. **Disconnect** in daylist deletes the stored tokens; imported tasks stay.

API routes (all require a signed-in session): `GET /api/google-tasks/status` returns `{ configured, connected, hasTasksScope, listId, lastSyncedAt, lastResult }`; `GET /api/google-tasks/lists`; `POST /api/google-tasks/sync` (optional body `{ "listId": "..." }`); `POST /api/google-tasks/disconnect`.

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
| `pnpm test` | `node --test lib/google-tasks.test.ts` | Unit tests for the Google Tasks mapping, sync planning, and API client (uses Node's built-in test runner, Node 22.18+) |

## Project structure

```
app/
  page.tsx                    Shows the auth screen or the signed-in task list
  layout.tsx                  Root layout and metadata
  themes.css                  Hue definitions for each color theme
  actions/tasks.ts            Server actions: getTasks, createTask, updateTaskCompletion (adds the next occurrence of repeating tasks), deleteTask
  api/auth/[...all]/route.ts  Better Auth route handler
  api/google-tasks/           Google Tasks routes: status, lists, sync, disconnect
  api/theseus/progress/route.ts     GET own best steps per level; POST a level completion (move list, verified by replay)
  api/theseus/leaderboard/route.ts  GET the top players plus the signed-in user's own row
components/
  auth-screen.tsx             Sign-in / sign-up UI
  theme-provider.tsx          Applies and persists the selected color theme (`data-theme` on `<html>`)
  theme-picker.tsx            Color theme swatch picker, shown in User preferences
  todo-app.tsx                Task list UI (filters, search, create, complete, delete)
  google-tasks-panel.tsx      Google Tasks dialog: connect, sync now, status
  ui/                         Shared UI primitives
lib/
  theseus-moves.ts            Move-list encoding and the replay check that verifies a submitted win
  theseus-ranking.ts          Leaderboard ranking rule and display names
  theseus-store.ts            Where Theseus progress lives (reserved `tasks` rows) and the leaderboard query
  auth.ts                     Better Auth server config (Drizzle adapter, trusted origins)
  auth-client.ts              Better Auth React client
  db/index.ts                 pg pool and Drizzle client
  db/schema.ts                Drizzle schema and task types
  themes.ts                   Theme ids, storage key, and the pre-paint init script
  google-tasks.ts             Google Tasks API client and pure mapping/sync-planning logic (unit tested)
  google-tasks-server.ts      Server glue: connection state, access tokens via Better Auth, the sync, completion push
  recurrence.ts               Repeat options, how the rule is stored in `description`, and next-occurrence date math
  utils.ts                    Helpers
migrations/                   Plain SQL migrations (run by hand with psql)
```
