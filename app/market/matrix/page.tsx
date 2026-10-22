import Link from "next/link";
import { getDataset, loadState } from "@/lib/market/queries";
import { formatDate, hostname, isHttpUrl, SUPPORT_LABEL } from "@/lib/market/format";
import type { Support } from "@/lib/market/types";
import { StateNotice } from "@/components/market/state-notice";
import { SupportIcon, SupportLegend } from "@/components/market/support-icon";

export const dynamic = "force-dynamic";
export const metadata = { title: "Compare" };

type SP = Promise<{ segment?: string | string[]; category?: string | string[] }>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function MatrixPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const state = await loadState(getDataset);
  if (state.status !== "ok") return <StateNotice state={state} />;
  const d = state.data;

  const segment = d.segments.some((s) => s.slug === first(sp.segment)) ? first(sp.segment) : "";
  const categories = [...new Set(d.features.map((f) => f.category))];
  const category = categories.includes(first(sp.category)) ? first(sp.category) : "";

  const products = d.products.filter((p) => !segment || p.segmentSlug === segment);
  const features = d.features.filter((f) => !category || f.category === category);
  const cells = new Map(d.productFeatures.map((r) => [`${r.productSlug}|${r.featureSlug}`, r]));
  const segName = new Map(d.segments.map((s) => [s.slug, s.name]));
  const shownCategories = categories.filter((c) => features.some((f) => f.category === c));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Feature comparison</h1>
        <p className="mt-1 text-sm m-muted">
          {features.length} features × {products.length} products · data as of {formatDate(d.generatedAt)}. Each icon links to
          its source where one is recorded. Unknown means no evidence found, not that the feature is missing.
        </p>
      </header>

      <form method="get" className="flex flex-wrap items-end gap-3" aria-label="Filters">
        <label className="text-sm">
          <span className="mb-1 block m-muted">Segment</span>
          <select name="segment" defaultValue={segment} className="m-input">
            <option value="">All segments</option>
            {d.segments.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block m-muted">Feature category</span>
          <select name="category" defaultValue={category} className="m-input">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <button type="submit" className="m-btn">Apply</button>
        {(segment || category) && <Link href="/market/matrix" className="m-link self-center text-sm">Reset</Link>}
      </form>

      <SupportLegend />

      {products.length === 0 || features.length === 0 ? (
        <p className="m-muted">Nothing matches these filters.</p>
      ) : (
        <div className="m-matrix-wrap" tabIndex={0} role="region" aria-label="Feature comparison table (scrollable)">
          <table className="m-matrix">
            <caption className="sr-only">Feature support by product</caption>
            <thead>
              <tr>
                <th scope="col">Feature</th>
                {products.map((p) => (
                  <th key={p.slug} scope="col">
                    <Link href={`/market/products/${p.slug}`} className="m-link">{p.name}</Link>
                    <span className="block text-xs font-normal m-muted">{segName.get(p.segmentSlug)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shownCategories.map((cat) => (
                <CategoryRows
                  key={cat}
                  cat={cat}
                  colSpan={products.length + 1}
                  features={features.filter((f) => f.category === cat)}
                  products={products}
                  cells={cells}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CategoryRows({
  cat, colSpan, features, products, cells,
}: {
  cat: string;
  colSpan: number;
  features: { slug: string; name: string; description: string }[];
  products: { slug: string; name: string }[];
  cells: Map<string, { support: string; note: string; sourceUrl: string }>;
}) {
  return (
    <>
      <tr className="m-cat"><th scope="colgroup" colSpan={colSpan}>{cat}</th></tr>
      {features.map((f) => (
        <tr key={f.slug}>
          <th scope="row" title={f.description}>{f.name}</th>
          {products.map((p) => {
            const r = cells.get(`${p.slug}|${f.slug}`);
            const support = (r?.support ?? "unknown") as Support;
            const tip = `${p.name}: ${SUPPORT_LABEL[support] ?? "Unknown"}${r?.note ? ` — ${r.note}` : r ? "" : " (not assessed)"}`;
            const icon = <SupportIcon support={support} />;
            return (
              <td key={p.slug} title={tip}>
                {r?.sourceUrl && isHttpUrl(r.sourceUrl) ? (
                  <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-block rounded">
                    {icon}
                    <span className="sr-only"> ({tip}; source {hostname(r.sourceUrl)})</span>
                  </a>
                ) : (
                  <>{icon}{r?.note && <span className="sr-only"> ({r.note})</span>}</>
                )}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
