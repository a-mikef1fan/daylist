// Node-only: used by scripts/market-bootstrap.ts, never imported by the app.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import type { Pool } from "pg";
import { BOOTSTRAP_SQL } from "./bootstrap-sql";
import * as s from "./schema";
import type { MarketFile, Support } from "./types";

const SUPPORT: Support[] = ["yes", "partial", "no", "unknown"];
const LOCK_KEY = "agent_market_bootstrap";

export interface SeedSource {
  file: string;
  name: string;
}

/** SEED_FILE (path relative to the repo root), else data/market.json. */
export function resolveSeedSource(root = process.cwd()): SeedSource {
  const file = process.env.SEED_FILE
    ? path.resolve(root, process.env.SEED_FILE)
    : path.join(root, "data/market.json");
  if (!existsSync(file)) throw new Error(`No seed file found at ${path.relative(root, file) || file}`);
  return { file, name: path.basename(file) };
}

const str = (v: unknown, d = "") => (typeof v === "string" ? v : v == null ? d : String(v));
const strs = (v: unknown) => (Array.isArray(v) ? v.map((x) => str(x)).filter(Boolean) : []);

/** Normalises and validates the file. Dangling references are dropped with a warning. */
export function normalise(raw: Partial<MarketFile>, warn: (m: string) => void = console.warn) {
  if (!raw || typeof raw !== "object") throw new Error("Seed file is not a JSON object");
  const generatedAt = str(raw.generatedAt);
  if (!generatedAt || Number.isNaN(Date.parse(generatedAt))) {
    throw new Error("Seed file needs a valid generatedAt timestamp");
  }

  const segments = (raw.segments ?? []).map((x, i) => ({
    slug: str(x.slug), name: str(x.name), description: str(x.description), position: i,
  }));
  const segSlugs = new Set(segments.map((x) => x.slug));
  if (segSlugs.size !== segments.length || segSlugs.has("")) throw new Error("Segments need unique, non-empty slugs");

  const features = (raw.features ?? []).map((x, i) => ({
    slug: str(x.slug), name: str(x.name), category: str(x.category, "General"),
    description: str(x.description), position: i,
  }));
  const featSlugs = new Set(features.map((x) => x.slug));
  if (featSlugs.size !== features.length || featSlugs.has("")) throw new Error("Features need unique, non-empty slugs");

  const products = (raw.products ?? []).map((x) => ({
    slug: str(x.slug), name: str(x.name), vendor: str(x.vendor), segmentSlug: str(x.segmentSlug),
    summary: str(x.summary), pricingModel: str(x.pricingModel), openSource: Boolean(x.openSource),
    website: str(x.website), sourceUrls: strs(x.sourceUrls), confidence: str(x.confidence, "unknown"),
  }));
  const prodSlugs = new Set(products.map((x) => x.slug));
  if (prodSlugs.size !== products.length || prodSlugs.has("")) throw new Error("Products need unique, non-empty slugs");
  for (const p of products) {
    if (!segSlugs.has(p.segmentSlug)) throw new Error(`Product ${p.slug} references unknown segment "${p.segmentSlug}"`);
  }

  const pf = new Map<string, (typeof s.productFeatures.$inferInsert)>();
  for (const x of raw.productFeatures ?? []) {
    if (!prodSlugs.has(x.productSlug) || !featSlugs.has(x.featureSlug)) {
      warn(`skipping productFeature with unknown ref: ${x.productSlug} / ${x.featureSlug}`);
      continue;
    }
    const support = SUPPORT.includes(x.support) ? x.support : "unknown";
    pf.set(`${x.productSlug}\u0000${x.featureSlug}`, {
      productSlug: x.productSlug, featureSlug: x.featureSlug, support,
      note: str(x.note), sourceUrl: str(x.sourceUrl),
    });
  }

  const swot = new Map<string, (typeof s.swotEntries.$inferInsert)>();
  for (const x of raw.swot ?? []) {
    const known = x.scope === "product" ? prodSlugs : x.scope === "segment" ? segSlugs : null;
    if (!known || !known.has(x.refSlug)) {
      warn(`skipping swot with unknown ref: ${x.scope} / ${x.refSlug}`);
      continue;
    }
    swot.set(`${x.scope}\u0000${x.refSlug}`, {
      scope: x.scope, refSlug: x.refSlug, strengths: strs(x.strengths), weaknesses: strs(x.weaknesses),
      opportunities: strs(x.opportunities), threats: strs(x.threats), sourceUrls: strs(x.sourceUrls),
    });
  }

  return { generatedAt, segments, features, products, productFeatures: [...pf.values()], swot: [...swot.values()] };
}

function chunk<T>(rows: T[], size = 500): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

/**
 * Creates the agent_market schema/tables (idempotent) and replaces its contents
 * with the seed file, all in one transaction. Only agent_market.* is touched.
 */
export async function bootstrapAndSeed(pool: Pool, opts: { log?: (m: string) => void } = {}) {
  const log = opts.log ?? console.log;
  const source = resolveSeedSource();
  const data = normalise(JSON.parse(readFileSync(source.file, "utf8")));
  log(`seed file: ${path.relative(process.cwd(), source.file)} (generatedAt ${data.generatedAt})`);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [LOCK_KEY]);
    await client.query(BOOTSTRAP_SQL);
    log("schema agent_market ready");

    const db = drizzle(client, { schema: s });

    // Scoped deletes (children first). Nothing outside agent_market is referenced.
    await db.delete(s.productFeatures);
    await db.delete(s.swotEntries);
    await db.delete(s.products);
    await db.delete(s.features);
    await db.delete(s.segments);
    await db.delete(s.meta);

    for (const c of chunk(data.segments)) await db.insert(s.segments).values(c);
    for (const c of chunk(data.features)) await db.insert(s.features).values(c);
    for (const c of chunk(data.products)) await db.insert(s.products).values(c);
    for (const c of chunk(data.productFeatures)) await db.insert(s.productFeatures).values(c);
    for (const c of chunk(data.swot)) await db.insert(s.swotEntries).values(c);
    await db.insert(s.meta).values([
      { key: "generatedAt", value: data.generatedAt },
      { key: "source", value: source.name },
    ]);
    await client.query("COMMIT");
    log(
      `seeded ${data.segments.length} segments, ${data.features.length} features, ${data.products.length} products, ` +
        `${data.productFeatures.length} product-features, ${data.swot.length} swot entries`,
    );
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
