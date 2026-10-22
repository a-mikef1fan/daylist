import Link from "next/link";
import { getDataset, loadState } from "@/lib/market/queries";
import { formatDate, normaliseConfidence } from "@/lib/market/format";
import { StateNotice } from "@/components/market/state-notice";

export const dynamic = "force-dynamic";

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="m-card">
      <dt className="text-sm m-muted">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold">{value}</dd>
    </div>
  );
}

export default async function MarketHome() {
  const state = await loadState(getDataset);
  if (state.status !== "ok") return <StateNotice state={state} />;
  const d = state.data;

  const counts = new Map<string, number>();
  for (const p of d.products) counts.set(p.segmentSlug, (counts.get(p.segmentSlug) ?? 0) + 1);

  const openSource = d.products.filter((p) => p.openSource).length;
  const pricingStated = d.products.filter((p) => p.pricingModel.trim()).length;
  const conf = { high: 0, medium: 0, low: 0, unknown: 0 };
  for (const p of d.products) conf[normaliseConfidence(p.confidence)]++;
  const assessed = d.productFeatures.filter((r) => r.support !== "unknown").length;
  const cells = d.products.length * d.features.length;

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">AI agent market map</h1>
        <p className="mt-2 max-w-2xl m-muted">
          Products segmented by what they do, compared feature by feature, with SWOT per segment and product. Data as of{" "}
          <strong className="text-(--m-fg)">{formatDate(d.generatedAt)}</strong>
          {d.source ? <> (from <code>{d.source}</code>)</> : null}.
        </p>
      </section>

      <aside className="m-card text-sm" role="note" aria-label="Data quality">
        <strong>Data quality.</strong> Compiled 2026-10-20 from public sources. Many vendor sites could not be read
        directly, so pricing and some features are medium/low confidence; check the source link before relying on a
        claim.
      </aside>

      <section aria-labelledby="summary">
        <h2 id="summary" className="sr-only">Market summary</h2>
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Products" value={d.products.length} />
          <Stat label="Segments" value={d.segments.length} />
          <Stat label="Features compared" value={d.features.length} />
          <Stat label="Open source" value={`${openSource} of ${d.products.length}`} />
        </dl>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="m-card text-sm">
            <h3 className="font-semibold">Pricing</h3>
            <p className="mt-2">
              {pricingStated} of {d.products.length} products have a pricing note. Pricing is free text, differs a lot
              between vendors and is the least reliable field here; see each product page and its source link.
            </p>
          </div>
          <div className="m-card text-sm">
            <h3 className="font-semibold">Evidence confidence</h3>
            <ul className="mt-2 space-y-1">
              {(["high", "medium", "low", "unknown"] as const).map((k) => (
                <li key={k} className="flex justify-between gap-3"><span className="capitalize">{k}</span><span className="m-muted">{conf[k]}</span></li>
              ))}
            </ul>
          </div>
          <div className="m-card text-sm">
            <h3 className="font-semibold">Comparison coverage</h3>
            <p className="mt-2">
              {assessed} of {cells} product/feature cells have a known answer
              {cells ? ` (${Math.round((assessed / cells) * 100)}%)` : ""}. The rest are shown as unknown, not as unsupported.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="segments">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="segments" className="text-xl font-semibold">Segments</h2>
          <Link href="/market/matrix" className="m-link text-sm">Compare all features</Link>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {d.segments.map((s) => (
            <li key={s.slug}>
              <Link href={`/market/segments/${s.slug}`} className="m-card block h-full">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold">{s.name}</h3>
                  <span className="m-chip">{counts.get(s.slug) ?? 0} products</span>
                </div>
                <p className="mt-2 text-sm m-muted">{s.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
