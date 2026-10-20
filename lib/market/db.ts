import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getDatabaseUrl } from "./env";
import * as schema from "./schema";

export type MarketDb = NodePgDatabase<typeof schema>;

const g = globalThis as unknown as { __marketPool?: Pool };

/** Returns a Drizzle client, or null when no database URL is configured. */
export function getDb(): MarketDb | null {
  const url = getDatabaseUrl();
  if (!url) return null;
  g.__marketPool ??= new Pool({
    connectionString: url,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
  });
  return drizzle(g.__marketPool, { schema });
}

export class DbUnconfiguredError extends Error {
  constructor() {
    super("Database not configured");
    this.name = "DbUnconfiguredError";
  }
}

export function requireDb(): MarketDb {
  const db = getDb();
  if (!db) throw new DbUnconfiguredError();
  return db;
}
