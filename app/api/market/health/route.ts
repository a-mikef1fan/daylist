import { NextResponse } from "next/server";
import { getDatabaseUrl } from "@/lib/market/env";
import { healthCounts } from "@/lib/market/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const base = { commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null };
  if (!getDatabaseUrl()) {
    return NextResponse.json({ status: "degraded", db: "unconfigured", counts: null, ...base, dataAsOf: null });
  }
  try {
    const { counts, dataAsOf } = await healthCounts();
    const empty = counts.products === 0;
    return NextResponse.json(
      { status: empty ? "empty" : "ok", db: "ok", counts, ...base, dataAsOf },
      { status: empty ? 503 : 200 },
    );
  } catch (e) {
    // Do not leak driver details; they go to the server log.
    console.error("[agent-market] health check failed:", e);
    return NextResponse.json({ status: "error", db: "error", counts: null, ...base, dataAsOf: null }, { status: 503 });
  }
}
