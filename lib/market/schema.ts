import {
  boolean,
  integer,
  pgSchema,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

/**
 * Everything lives in a dedicated Postgres schema so this app can share a
 * database with other apps. Keep in sync with lib/market/bootstrap-sql.ts.
 */
export const SCHEMA = "agent_market";
export const market = pgSchema(SCHEMA);

export const segments = market.table("segments", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  position: integer("position").notNull().default(0),
});

export const features = market.table("features", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull().default("General"),
  description: text("description").notNull().default(""),
  position: integer("position").notNull().default(0),
});

export const products = market.table("products", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  vendor: text("vendor").notNull().default(""),
  segmentSlug: text("segment_slug")
    .notNull()
    .references(() => segments.slug),
  summary: text("summary").notNull().default(""),
  pricingModel: text("pricing_model").notNull().default(""),
  openSource: boolean("open_source").notNull().default(false),
  website: text("website").notNull().default(""),
  sourceUrls: text("source_urls").array().notNull().default([]),
  confidence: text("confidence").notNull().default("unknown"),
});

export const productFeatures = market.table(
  "product_features",
  {
    productSlug: text("product_slug")
      .notNull()
      .references(() => products.slug, { onDelete: "cascade" }),
    featureSlug: text("feature_slug")
      .notNull()
      .references(() => features.slug, { onDelete: "cascade" }),
    support: text("support").notNull().default("unknown"),
    note: text("note").notNull().default(""),
    sourceUrl: text("source_url").notNull().default(""),
  },
  (t) => [primaryKey({ columns: [t.productSlug, t.featureSlug] })],
);

export const swotEntries = market.table(
  "swot_entries",
  {
    id: serial("id").primaryKey(),
    scope: text("scope").notNull(),
    refSlug: text("ref_slug").notNull(),
    strengths: text("strengths").array().notNull().default([]),
    weaknesses: text("weaknesses").array().notNull().default([]),
    opportunities: text("opportunities").array().notNull().default([]),
    threats: text("threats").array().notNull().default([]),
    sourceUrls: text("source_urls").array().notNull().default([]),
  },
  (t) => [unique("swot_scope_ref_uq").on(t.scope, t.refSlug)],
);

export const meta = market.table("meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
