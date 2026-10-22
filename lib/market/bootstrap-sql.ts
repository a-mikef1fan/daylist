import { SCHEMA } from "./schema";

/**
 * Plain, idempotent DDL. Every statement is schema-qualified with `agent_market`
 * and uses IF NOT EXISTS, so it never touches objects outside that schema and is
 * safe to run on every deploy. Keep in sync with lib/market/schema.ts.
 *
 * To evolve the schema, append new idempotent statements (e.g.
 * `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`) rather than editing old ones.
 */
export const BOOTSTRAP_SQL = `
CREATE SCHEMA IF NOT EXISTS ${SCHEMA};

CREATE TABLE IF NOT EXISTS ${SCHEMA}.segments (
  slug        text PRIMARY KEY,
  name        text NOT NULL,
  description text NOT NULL DEFAULT '',
  position    integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ${SCHEMA}.features (
  slug        text PRIMARY KEY,
  name        text NOT NULL,
  category    text NOT NULL DEFAULT 'General',
  description text NOT NULL DEFAULT '',
  position    integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ${SCHEMA}.products (
  slug          text PRIMARY KEY,
  name          text NOT NULL,
  vendor        text NOT NULL DEFAULT '',
  segment_slug  text NOT NULL REFERENCES ${SCHEMA}.segments(slug),
  summary       text NOT NULL DEFAULT '',
  pricing_model text NOT NULL DEFAULT '',
  open_source   boolean NOT NULL DEFAULT false,
  website       text NOT NULL DEFAULT '',
  source_urls   text[] NOT NULL DEFAULT '{}',
  confidence    text NOT NULL DEFAULT 'unknown'
);

CREATE TABLE IF NOT EXISTS ${SCHEMA}.product_features (
  product_slug text NOT NULL REFERENCES ${SCHEMA}.products(slug) ON DELETE CASCADE,
  feature_slug text NOT NULL REFERENCES ${SCHEMA}.features(slug) ON DELETE CASCADE,
  support      text NOT NULL DEFAULT 'unknown',
  note         text NOT NULL DEFAULT '',
  source_url   text NOT NULL DEFAULT '',
  PRIMARY KEY (product_slug, feature_slug)
);

CREATE TABLE IF NOT EXISTS ${SCHEMA}.swot_entries (
  id            serial PRIMARY KEY,
  scope         text NOT NULL,
  ref_slug      text NOT NULL,
  strengths     text[] NOT NULL DEFAULT '{}',
  weaknesses    text[] NOT NULL DEFAULT '{}',
  opportunities text[] NOT NULL DEFAULT '{}',
  threats       text[] NOT NULL DEFAULT '{}',
  source_urls   text[] NOT NULL DEFAULT '{}',
  CONSTRAINT swot_scope_ref_uq UNIQUE (scope, ref_slug)
);

CREATE TABLE IF NOT EXISTS ${SCHEMA}.meta (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
`;
