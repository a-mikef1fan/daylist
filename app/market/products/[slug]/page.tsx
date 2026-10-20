import Link from "next/link";
import { notFound } from "next/navigation";
import { getDataset, loadState } from "@/lib/market/queries";
import { formatDate, hostname, isHttpUrl } from "@/lib/market/format";
import { StateNotice } from "@/components/market/state-notice";
import { ConfidenceBadge } from "@/components/market/confidence-badge";
import { SourceLinks } from "@/components/market/source-links";
import { SupportIcon } from "@/components/market/support-icon";
import { SwotGrid } from "@/components/market/swot-grid";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const state = await loadState(getDataset);
  if (state.status !== "ok") return <StateNotice state={state} />;
  const d = state.data;
  const product = d.products.find((p) => p.slug === slug);
  if (!product) notFound();
  const segment = d.segments.find((s) => s.slug === product.segmentSlug);
  const rows = new Map(d.productFeatures.filter((r) => r.productSlug === slug).map((r) => [r.featureSlug, r]));
  const swot = d.swot.find((x) => x.scope === "product" && x.refSlug === slug);
  const byCategory = new Map<string, typeof d.features>();
  for (const f of d.features) byCategory.set(f.category, [...(byCategory.get(f.category) ?? []), f]);

  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-sm m-muted">
        <Link href="/market" className="m-link">Overview</Link> /{" "}
        {segment && <><Link href={`/market/segments/${segment.slug}`} className="m-link">{segment.name}</Link> / </>}
        {product.name}
      </nav>

      <header>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">{product.name}</h1>
          <ConfidenceBadge value={product.confidence} />
        </div>
        <p className="mt-1 m-muted">
          {product.vendor}
          {product.openSource ? " · open source" : ""}
          {product.pricingModel ? ` · ${product.pricingModel}` : ""}
        </p>
        <p className="mt-3 max-w-2xl">{product.summary}</p>
        <p className="mt-2 text-sm">
          {isHttpUrl(product.website) && (
            <a className="m-link" href={product.website} target="_blank" rel="noopener noreferrer">{hostname(product.website)}</a>
          )}
        </p>
        <p className="text-sm m-muted">Data as of {formatDate(d.generatedAt)}</p>
      </header>

      <section aria-labelledby="features">
        <h2 id="features" className="mb-3 text-xl font-semibold">Features</h2>
        <div className="space-y-5">
          {[...byCategory.entries()].map(([cat, fs]) => (
            <div key={cat}>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider m-muted">{cat}</h3>
              <ul className="m-card divide-y divide-(--m-line) !p-0">
                {fs.map((f) => {
                  const r = rows.get(f.slug);
                  return (
                    <li key={f.slug} className="grid gap-1 px-4 py-3 sm:grid-cols-[14rem_9rem_1fr] sm:gap-4">
                      <span className="font-medium">{f.name}</span>
                      <SupportIcon support={r?.support ?? "unknown"} withLabel />
                      <span className="text-sm m-muted">
                        {r ? r.note : "Not assessed."}
                        {r?.sourceUrl && isHttpUrl(r.sourceUrl) && (
                          <>{r.note ? " " : ""}<a className="m-link" href={r.sourceUrl} target="_blank" rel="noopener noreferrer">source ({hostname(r.sourceUrl)})</a></>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="swot">
        <h2 id="swot" className="mb-3 text-xl font-semibold">SWOT</h2>
        {swot ? <SwotGrid swot={swot} asOf={formatDate(d.generatedAt)} /> : <p className="m-muted">No SWOT recorded for this product.</p>}
      </section>

      <section aria-labelledby="sources">
        <h2 id="sources" className="mb-2 text-xl font-semibold">Sources</h2>
        <div className="flex flex-wrap items-center gap-3">
          <ConfidenceBadge value={product.confidence} />
          <span className="text-sm m-muted">as of {formatDate(d.generatedAt)}</span>
        </div>
        <SourceLinks urls={product.sourceUrls} label="Product sources" />
      </section>
    </div>
  );
}
