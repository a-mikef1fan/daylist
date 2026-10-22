import { cache } from "react";
import { asc, eq } from "drizzle-orm";
import { DbUnconfiguredError, requireDb } from "./db";
import * as s from "./schema";

export type Segment = typeof s.segments.$inferSelect;
export type Feature = typeof s.features.$inferSelect;
export type Product = typeof s.products.$inferSelect;
export type ProductFeature = typeof s.productFeatures.$inferSelect;
export type Swot = typeof s.swotEntries.$inferSelect;

export interface Dataset {
  segments: Segment[];
  features: Feature[];
  products: Product[];
  productFeatures: ProductFeature[];
  swot: Swot[];
  generatedAt: string | null;
  source: string | null;
}

/**
 * The whole dataset is a few hundred rows, so each request loads it once
 * (memoised per request via React cache) and pages derive what they need.
 */
export const getDataset = cache(async (): Promise<Dataset> => {
  const db = requireDb();
  const [segments, features, products, productFeatures, swot, meta] = await Promise.all([
    db.select().from(s.segments).orderBy(asc(s.segments.position)),
    db.select().from(s.features).orderBy(asc(s.features.position)),
    db.select().from(s.products).orderBy(asc(s.products.name)),
    db.select().from(s.productFeatures),
    db.select().from(s.swotEntries).orderBy(asc(s.swotEntries.id)),
    db.select().from(s.meta),
  ]);
  const m = new Map(meta.map((r) => [r.key, r.value]));
  return {
    segments, features, products, productFeatures, swot,
    generatedAt: m.get("generatedAt") ?? null,
    source: m.get("source") ?? null,
  };
});

export type LoadState<T> =
  | { status: "ok"; data: T }
  | { status: "unconfigured" }
  | { status: "error"; message: string };

/** Never throws: pages render a notice instead of crashing. */
export async function loadState<T>(fn: () => Promise<T>): Promise<LoadState<T>> {
  try {
    return { status: "ok", data: await fn() };
  } catch (e) {
    if (e instanceof DbUnconfiguredError) return { status: "unconfigured" };
    // Drizzle wraps driver errors; the useful text (e.g. "relation ... does not exist") is on `cause`.
    const cause = e instanceof Error && e.cause instanceof Error ? e.cause.message : "";
    const message = cause || (e instanceof Error ? e.message : String(e));
    return { status: "error", message };
  }
}

export async function healthCounts() {
  const db = requireDb();
  const [a, b, c, d, e, meta] = await Promise.all([
    db.$count(s.segments),
    db.$count(s.features),
    db.$count(s.products),
    db.$count(s.productFeatures),
    db.$count(s.swotEntries),
    db.select().from(s.meta).where(eq(s.meta.key, "generatedAt")),
  ]);
  return {
    counts: { segments: a, features: b, products: c, productFeatures: d, swotEntries: e },
    dataAsOf: meta[0]?.value ?? null,
  };
}
