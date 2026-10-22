/**
 * Creates the `agent_market` schema (plain idempotent SQL) and loads the dataset.
 *
 *   pnpm db:market-seed                     # requires DATABASE_URL
 *   tsx scripts/market-bootstrap.ts --if-configured   # no-op (exit 0) when no DB URL; used at build time
 */
import { Pool } from "pg";
import { getDatabaseUrl } from "../lib/market/env";
import { bootstrapAndSeed } from "../lib/market/seed";

async function main() {
  const url = getDatabaseUrl();
  if (!url) {
    if (process.argv.includes("--if-configured")) {
      console.log("[agent-market] DATABASE_URL not set; skipping schema bootstrap and seed.");
      return;
    }
    console.error("DATABASE_URL (or POSTGRES_URL) is not set.");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 15_000 });
  try {
    await bootstrapAndSeed(pool, { log: (m) => console.log(`[agent-market] ${m}`) });
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error("[agent-market] bootstrap failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
