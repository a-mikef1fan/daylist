import type { LoadState } from "@/lib/market/queries";

/** Renders a notice for the unconfigured/error cases; returns null when data loaded. */
export function StateNotice({ state }: { state: LoadState<unknown> }) {
  if (state.status === "ok") return null;
  if (state.status === "unconfigured") {
    return (
      <div role="status" className="m-card">
        <h1 className="text-xl font-semibold">Database not configured</h1>
        <p className="mt-2 m-muted">
          This app reads its data from Postgres, but no <code>DATABASE_URL</code> is set. Add a Postgres database (for
          example Neon via the Vercel Marketplace), redeploy so the build can create the <code>agent_market</code> schema
          and load the dataset, or run <code>npm run db:seed</code> locally. See the README.
        </p>
      </div>
    );
  }
  const missing = /does not exist|relation|schema/i.test(state.message);
  return (
    <div role="alert" className="m-card">
      <h1 className="text-xl font-semibold">{missing ? "Database not initialised" : "Database error"}</h1>
      <p className="mt-2 m-muted">
        {missing
          ? "The agent_market tables were not found. Run npm run db:seed (or redeploy with DATABASE_URL set) to create and load them."
          : "The database could not be queried. Check the connection and try again."}
      </p>
      {process.env.NODE_ENV !== "production" && (
        <pre className="mt-3 overflow-x-auto text-xs m-muted">{state.message}</pre>
      )}
    </div>
  );
}
