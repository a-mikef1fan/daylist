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
- Just for fun, behind the same sign-in: Snake, Theseus & the Minotaur, and an arcade F1 Grand Prix with the full 2026 grid (22 drivers, 11 teams), AI rivals, laps, lap times, and a finishing order
- Describe a theme: click **Theme** in the top bar, describe a mood in plain words (for example "cozy autumn cabin") and Claude restyles the whole app: colours, fonts, corner radius and icons. Preview it, keep or revert it, reset to the default. Saved in this browser's `localStorage`

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
| `ANTHROPIC_API_KEY` | No | Enables **Describe a theme** (the Theme button in the top bar). Used only on the server by `POST /api/theme/generate`; without it that route returns 503 and the panel shows a friendly message |
| `ANTHROPIC_THEME_MODEL` | No | Overrides the Claude model used for theme generation (default `claude-opus-5-5`; a smaller model is cheaper and faster) |

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

A task's repeat rule (daily, weekdays, weekly) is stored in the `description` column as a one-line marker (`[daylist:v1 repeat=weekly]`), so no extra column or migration is needed. The marker is stripped before tasks reach the UI, and ordinary descriptions are left as they are.

Theseus & the Minotaur progress needs no table of its own (a demo shortcut): each player's progress is one reserved row in `tasks` with `id` and `userId` set to `theseus:<user id>` and a JSON payload in `description`. Because every task query filters on the signed-in user's real id, these rows never appear in task lists and cannot be changed by the task actions. See `lib/theseus-store.ts`; moving to a dedicated table later means copying each payload's levels into rows and deleting the `theseus:%` task rows.

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
  actions/tasks.ts            Server actions: getTasks, createTask, updateTaskCompletion (adds the next occurrence of repeating tasks), deleteTask
  api/auth/[...all]/route.ts  Better Auth route handler
  api/theme/generate/route.ts Signed-in, rate-limited route that asks Claude for a theme and returns it validated
  api/theseus/progress/route.ts     GET own best steps per level; POST a level completion (move list, verified by replay)
  api/theseus/leaderboard/route.ts  GET the top players plus the signed-in user's own row
components/
  auth-screen.tsx             Sign-in / sign-up UI
  theme-provider.tsx          Applies and persists the selected color theme (`data-theme` on `<html>`)
  theme-picker.tsx            Color theme swatch picker, shown in User preferences
  custom-theme-provider.tsx   Applies, previews and persists a generated theme
  theme-studio.tsx            The Describe a theme panel
  themed-icon.tsx             <ThemedIcon slot="..."/>: icon chosen by the active theme
  todo-app.tsx                Task list UI (filters, search, create, complete, delete)
  snake-game.tsx              Snake
  theseus-game.tsx            Theseus & the Minotaur
  f1-game.tsx                 F1 Grand Prix: driver select, race loop, HUD, results (styles in f1-game.css)
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
  f1-grid.ts                  The 2026 F1 grid: teams, car names, colors, drivers (name, number, code, nationality)
  f1.ts                       F1 race engine: circuit, car physics, AI, laps and classification
  f1-render.ts                F1 canvas drawing (track layer and cars)
  recurrence.ts               Repeat options, how the rule is stored in `description`, and next-occurrence date math
  custom-theme/               Theme schema + sanitising, colour/contrast maths, CSS compiler, font and icon allow-lists, Claude call
  rate-limit.ts               In-memory sliding-window limiter
  utils.ts                    Helpers
```

## Describe a theme

The **Theme** button in the top bar opens a panel with a text box (up to 300 characters), example prompts, and a live preview of the result with **Keep theme** / **Revert**. **Reset to default** returns to the built-in look; kept themes are listed for one-click switching (up to 8). Picking a colour theme in User preferences replaces a generated theme.

- `POST /api/theme/generate` requires a signed-in session, limits input to 300 characters and 10 requests per user per 10 minutes (per server instance), and calls Claude with `ANTHROPIC_API_KEY`.
- A theme is plain data: validated colours (hex or `oklch()`), font ids from an allow-list of Google Fonts, icon names from an allow-list of lucide icons per app slot, a corner radius and an icon stroke width. `lib/custom-theme/schema.ts` sanitises it (unknown icons and fonts fall back to defaults, numbers are clamped) and repairs text colours below 4.5:1 contrast. Only canonical colour strings and allow-listed font stacks are written into CSS variables, so a generated theme cannot inject CSS or script.
- It overrides the same CSS variables the colour themes use (`app/globals.css`, including the derived tokens near the top). The active theme and saved list live in `localStorage` (`daylist:custom-theme*`) and an inline script in `app/layout.tsx` applies it before first paint. It is per browser, not per account.
- To theme another icon, add a slot to `ICON_SLOTS` in `lib/custom-theme/icons.ts` and render it with `<ThemedIcon slot="..." />`.
