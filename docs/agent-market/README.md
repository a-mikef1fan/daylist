# Agent Market Intel

A small read-only web app that catalogues AI agent products, groups them into segments, compares them feature by
feature and shows a SWOT per segment and per product. Every claim links to its source, and every page shows a
confidence level and the dataset's "as of" date.

| Route | What it shows |
| --- | --- |
| `/market` | Segment cards with product counts, market summary, data freshness |
| `/market/segments/[slug]` | Products in a segment, segment SWOT |
| `/market/products/[slug]` | Summary, feature support (with notes and source links), SWOT, sources and confidence |
| `/market/matrix` | Feature x product grid; filter by segment and feature category (`?segment=&category=`) |
| `/market/swot` | Browse SWOT by segment or product |
| `/api/market/health` | Verifiable status: `{status, db, counts, commit, dataAsOf}` |

In Daylist the module is additive: it lives under `market` paths and nothing in the todo app links to it. Open `/market` directly.

## Architecture

```
app/market/**              routes + own layout and scoped stylesheet (market.css)
app/api/market/health/     health endpoint
components/market/**       presentational components (support icons, SWOT grid, source links, ...)
lib/market/schema.ts       Drizzle table definitions, all in the Postgres schema `agent_market`
lib/market/bootstrap-sql.ts  plain idempotent DDL (CREATE SCHEMA/TABLE IF NOT EXISTS)
lib/market/db.ts           pg Pool + drizzle (node-postgres); returns null when no DB URL is set
lib/market/queries.ts      per-request dataset loader and `loadState` (never throws into a page)
lib/market/seed.ts         validate + load data/market.json (Node only, used by the script)
scripts/market-bootstrap.ts  `pnpm db:market-seed`
data/market.json           the dataset (override with SEED_FILE)
```

- Next.js App Router, React server components, Tailwind 4, TypeScript.
- Postgres through `pg` and `drizzle-orm/node-postgres`. No drizzle-kit, no ORM migrations.
- All pages are dynamic server components; filters are plain GET forms, so there is no client-side data code.
- All tables live in the `agent_market` schema, so the app can share a database with other apps. The bootstrap script
  only ever creates and writes objects inside that schema.
- Without a database URL the build still succeeds and every page renders a "Database not configured" notice.
  `/api/market/health` reports `db: "unconfigured"`.

### Data model

`segments`, `features`, `products` (FK to segment; `source_urls text[]`, `confidence`), `product_features`
(product x feature, `support` is `yes|partial|no|unknown`, `note`, `source_url`), `swot_entries`
(`scope` is `product|segment`, four text arrays, `source_urls text[]`) and `meta` (key/value; holds the dataset's
`generatedAt` and the seed file name).

A missing product/feature pair is displayed as "unknown / not assessed", never as "not supported".

## Local development

Requirements: Node 20+ (tested on 22), pnpm, a Postgres you can write to.

```bash
pnpm install
export DATABASE_URL=postgres://user:pass@localhost:5432/daylist_dev   # Next also reads .env.local
pnpm db:market-seed           # creates schema agent_market and loads data/market.json
pnpm dev                      # http://localhost:3000  -> /market
curl localhost:3000/api/market/health
```

Other commands: `pnpm build`, `pnpm start`. `pnpm db:market-seed` is safe to re-run.

## Deploy to Vercel

1. Daylist's Vercel project already has a database; the build reads `DATABASE_URL` (`POSTGRES_URL` is a fallback). Previews
   may share the production database, so the build only ever writes inside the `agent_market` schema.
2. Deploy. The `vercel-build` script in `package.json` runs
   `tsx scripts/market-bootstrap.ts --if-configured && next build`. With a database URL present, the build creates the
   `agent_market` schema and loads the dataset, so a preview comes up with data. Without one, the bootstrap step is a
   no-op and the app shows the "not configured" notice. If a database URL is set but the bootstrap fails, the build
   fails on purpose.
3. Verify: open `https://<deployment>/api/market/health`. Expect `"db":"ok"`, non-zero `counts`, `dataAsOf` equal to the
   dataset's `generatedAt`, and `commit` equal to the deployed git SHA (`VERCEL_GIT_COMMIT_SHA`).

If the host build uses plain `next build`, run `pnpm db:market-seed` as part of the deploy instead.

## How the data is sourced and refreshed

The dataset is **curated**, not scraped live: a research pass produces `data/market.json` (schema below), each
product, feature rating and SWOT carries source URLs, and each product has a confidence level. The app shows
`generatedAt` as the "as of" date everywhere. Nothing refreshes automatically, so the data is only as fresh as the last
refresh.

```jsonc
{
  "generatedAt": "ISO timestamp",
  "segments": [{ "slug", "name", "description" }],
  "features": [{ "slug", "name", "category", "description" }],
  "products": [{ "slug", "name", "vendor", "segmentSlug", "summary", "pricingModel", "openSource", "website", "sourceUrls": [], "confidence" }],
  "productFeatures": [{ "productSlug", "featureSlug", "support": "yes|partial|no|unknown", "note", "sourceUrl" }],
  "swot": [{ "scope": "product|segment", "refSlug", "strengths": [], "weaknesses": [], "opportunities": [], "threats": [], "sourceUrls": [] }]
}
```

To refresh: replace `data/market.json` (bump `generatedAt`), commit, and deploy. The build re-seeds, replacing the
contents of `agent_market` in a single transaction. To refresh without a deploy, run
`DATABASE_URL=... pnpm db:market-seed` against the target database. `SEED_FILE=path/to/file.json` seeds from another file.

Seed validation: duplicate or empty slugs, an invalid `generatedAt`, or a product pointing at an unknown segment abort
the seed (nothing is changed). Feature rows or SWOT entries that point at unknown products, features or segments are
skipped with a warning. `confidence` may be `high|medium|low` or a number (0 to 1, or 0 to 100); it is stored as given
and bucketed for display.

See [TRADEOFFS.md](./TRADEOFFS.md) for the engineering decisions behind this.
