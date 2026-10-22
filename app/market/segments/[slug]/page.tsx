import Link from "next/link";
import { notFound } from "next/navigation";
import { getDataset, loadState } from "@/lib/market/queries";
import { formatDate } from "@/lib/market/format";
import { StateNotice } from "@/components/market/state-notice";
import { ConfidenceBadge } from "@/components/market/confidence-badge";
import { SwotGrid } from "@/components/market/swot-grid";

export const dynamic = "force-dynamic";

export default async function SegmentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const state = await loadState(getDataset);
  if (state.status !== "ok") return <StateNotice state={state} />;
  const d = state.data;
  const segment = d.segments.find((s) => s.slug === slug);
  if (!segment) notFound();
  const products = d.products.filter((p) => p.segmentSlug === slug);
  const swot = d.swot.find((x) => x.scope === "segment" && x.refSlug === slug);

  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-sm m-muted">
        <Link href="/market" className="m-link">Overview</Link> / {segment.name}
      </nav>
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">{segment.name}</h1>
        <p className="mt-2 max-w-2xl m-muted">{segment.description}</p>
        <p className="mt-1 text-sm m-muted">Data as of {formatDate(d.generatedAt)}</p>
      </header>

      <section aria-labelledby="products">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="products" className="text-xl font-semibold">Products ({products.length})</h2>
          <Link href={`/market/matrix?segment=${slug}`} className="m-link text-sm">Compare features</Link>
        </div>
        {products.length === 0 ? (
          <p className="m-muted">No products in this segment.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {products.map((p) => (
              <li key={p.slug}>
                <Link href={`/market/products/${p.slug}`} className="m-card block h-full">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-semibold">{p.name}</h3>
                    <ConfidenceBadge value={p.confidence} />
                  </div>
                  <p className="text-sm m-muted line-clamp-2" title={p.pricingModel || undefined}>{p.vendor}{p.openSource ? " · open source" : ""}{p.pricingModel ? ` · ${p.pricingModel}` : ""}</p>
                  <p className="mt-2 text-sm">{p.summary}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="swot">
        <h2 id="swot" className="mb-3 text-xl font-semibold">Segment SWOT</h2>
        {swot ? <SwotGrid swot={swot} asOf={formatDate(d.generatedAt)} /> : <p className="m-muted">No SWOT recorded for this segment.</p>}
      </section>
    </div>
  );
}
