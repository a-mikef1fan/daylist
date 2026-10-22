# Engineering tradeoffs

Only decisions that were actually made in this codebase.

## Data and storage

**Postgres instead of a static JSON import.** The dataset is a few hundred rows and would fit in a bundled JSON file,
which would be simpler, faster and impossible to be "down". Postgres was chosen so the app fits a platform that
already provides a database, the health endpoint can verify real connectivity and row counts, and data can be
refreshed without rebuilding the app. The cost is an operational dependency, a seed step, and a failure mode
(handled by the "not configured / not initialised / error" notices).

**Dedicated `agent_market` schema in a shared database.** This app is deployed next to another app on one Postgres.
All tables are schema-qualified and created with `CREATE SCHEMA/TABLE IF NOT EXISTS`; the seed's deletes are plain
`DELETE` statements on `agent_market` tables only (no `TRUNCATE`, no `drizzle-kit push`, which could alter tables it
does not know about). Cost: names are qualified everywhere, and the app's DB role still has whatever privileges the
shared credential has. Nothing technically stops a bug from touching other schemas; we only ensure this code does not.

**Idempotent SQL bootstrap instead of versioned migrations.** There is no migration history table and no drizzle-kit.
`lib/market/bootstrap-sql.ts` re-runs on every deploy. This is robust for "create if missing", but it cannot express
destructive changes, reorder steps or detect drift. A column change means appending a new idempotent statement
(`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`) and hand-updating `schema.ts`. The two files are kept in sync by hand, so
they can drift; nothing tests that they match.

**Seed at build time instead of a separate migration job.** Running bootstrap + seed in `vercel-build` makes a preview
deploy with data without extra steps. Cost: builds need network access to the database; every build rewrites the
tables (even if the data did not change); a bad dataset or unreachable DB fails the deploy (intentional, so a preview
never silently ships empty); preview deployments that share one database all write the same schema, so the last build
wins. Without a database URL the step is skipped and the build still passes.

**Replace-all (delete + insert in one transaction) instead of per-row upsert.** Simple and guarantees the database
matches the file exactly, including removals. Readers keep seeing the old data until commit (MVCC), and an advisory
lock serialises concurrent builds. Cost: no history, no way to hold manual edits in the DB, and surrogate ids of
`swot_entries` change on every seed.

**Lenient validation of the data file.** Dangling feature/SWOT references are skipped with a warning rather than
failing the build (the dataset is produced by a separate process and one bad row should not block a deploy), while
structural errors (duplicate slugs, product in unknown segment, bad `generatedAt`) abort. This means a typo in a slug
silently drops that cell/SWOT from the app unless someone reads the build log.

**`confidence` stored as free text.** The input schema does not fix its vocabulary, so it is stored as given and
bucketed to high/medium/low/unknown at display time. No DB constraint enforces it. Same for `support`, which is
normalised to `yes|partial|no|unknown` at seed time but has no CHECK constraint.

**Unassessed means unknown.** A missing product/feature pair is rendered as "unknown / not assessed", never as "no".
This avoids overstating gaps but makes the matrix look emptier than a forced yes/no would.

## Application

**Server components and GET-form filters instead of client-side filtering.** The matrix filters (segment, category)
are a plain `<form method="get">`; the server re-renders. Pros: no client JS or data serialisation, shareable URLs,
works without JavaScript. Cons: a full navigation per filter change and no instant filtering.

**Load the whole dataset per request.** `getDataset()` (memoised per request with React `cache`) loads every table and
pages derive what they need in memory. It is far less code than per-page queries and fine at hundreds of rows. It does
not scale to thousands of products, and the product page reads rows it does not show.

**All routes `force-dynamic`.** The data only changes on deploy/seed, so ISR or static generation would be cheaper
and faster. Dynamic rendering was chosen because the build must succeed without a database and because pages should
reflect a re-seed without a redeploy. Cost: every view hits Postgres (pool of max 3 connections per instance).

**Drizzle with `pg` instead of Prisma.** Drizzle is a thin layer with no codegen or engine binary, keeping the
dependency set and cold starts small, and it matches the host app's stack. We give up Prisma's migration tooling
(see above) and use Drizzle only for typed queries.

**Accessible support icons, not colour-only.** Each state has a distinct shape (filled check, half circle, boxed X,
dashed "?"), a visible legend, and screen-reader text; colour is an extra cue. Cells with a source link are anchors
with a descriptive label. This makes cells larger than a bare dot.

**Scoped, hand-written CSS tokens plus Tailwind utilities.** Colours are CSS variables under `.market-root` with
`prefers-color-scheme` dark mode and `m-` prefixed component classes, so the module does not collide with another
app's styles. There is no manual theme toggle, and some styling lives in a CSS file rather than purely in utilities.

**Error detail hidden in production.** Pages show a generic "Database error" in production and the raw message only in
development, to avoid leaking hostnames. Health also hides driver details (logged server-side).

## Product scope

**Read-only, no auth.** There are no write routes and no user accounts, so there is nothing to authenticate. The
dataset is public by design. `/api/market/health` is public and exposes counts, the dataset date and the deployed commit
SHA.

**Curated dataset instead of live scraping.** Curated, source-linked data with a confidence level is more auditable and
cheaper than scraping vendor sites, and avoids terms-of-service and parser-breakage issues. The cost is staleness:
nothing refreshes automatically and nothing warns when the "as of" date gets old (it is shown, not enforced). Ratings
reflect what the sources said on that date, and `unknown` is common where vendors publish little.

**Additive module inside Daylist, no link from the todo UI.** The market pages sit under `/market` and share nothing with
the todo app except the database server and the Next/React/Tailwind toolchain. No existing Daylist file is changed except
`package.json` (dependencies and two scripts). Nothing in the Daylist UI links to `/market`; it is reached by URL.

## Not done

- No automated tests (types and a manual runtime check only).
- No staleness warning, no data-diff view, no history of previous datasets.
- Not tested against Neon's pooled (PgBouncer) endpoint or Vercel itself from this environment.
