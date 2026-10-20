import Link from "next/link";
import { getDataset, loadState } from "@/lib/market/queries";
import { formatDate } from "@/lib/market/format";
import { StateNotice } from "@/components/market/state-notice";
import { SwotGrid } from "@/components/market/swot-grid";

export const dynamic = "force-dynamic";
export const metadata = { title: "SWOT" };

type SP = Promise<{ scope?: string | string[]; ref?: string | string[] }>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function SwotPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const state = await loadState(getDataset);
  if (state.status !== "ok") return <StateNotice state={state} />;
  const d = state.data;

  const scope = first(sp.scope) === "product" ? "product" : "segment";
  const names = new Map<string, string>(
    scope === "segment" ? d.segments.map((s) => [s.slug, s.name]) : d.products.map((p) => [p.slug, p.name]),
  );
  const entries = d.swot.filter((x) => x.scope === scope && names.has(x.refSlug));
  const withSwot = new Set(entries.map((e) => e.refSlug));
  const refs = [...names.keys()].filter((k) => withSwot.has(k));
  const selected = refs.includes(first(sp.ref)) ? first(sp.ref) : (refs[0] ?? "");
  const current = entries.find((e) => e.refSlug === selected);
  const asOf = formatDate(d.generatedAt);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">SWOT</h1>
        <p className="mt-1 text-sm m-muted">Strengths, weaknesses, opportunities and threats, with sources. Data as of {asOf}.</p>
      </header>

      <div role="tablist" aria-label="Scope" className="flex gap-1 text-sm">
        {(["segment", "product"] as const).map((s) => (
          <Link key={s} href={`/market/swot?scope=${s}`} aria-current={scope === s ? "page" : undefined} className="m-tab rounded-md border border-(--m-line) px-3 py-1.5">
            By {s}
          </Link>
        ))}
      </div>

      {refs.length === 0 ? (
        <p className="m-muted">No {scope}-level SWOT entries recorded.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-[14rem_1fr]">
          <nav aria-label={`${scope}s with SWOT`}>
            <ul className="space-y-1 text-sm">
              {refs.map((r) => (
                <li key={r}>
                  <Link
                    href={`/market/swot?scope=${scope}&ref=${r}`}
                    aria-current={r === selected ? "page" : undefined}
                    className="m-tab block rounded-md px-3 py-1.5 hover:bg-(--m-head)"
                  >
                    {names.get(r)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <section aria-labelledby="swot-title">
            <h2 id="swot-title" className="mb-3 text-xl font-semibold">
              {names.get(selected)}{" "}
              <Link className="m-link text-sm font-normal" href={scope === "segment" ? `/market/segments/${selected}` : `/market/products/${selected}`}>
                view {scope}
              </Link>
            </h2>
            {current && <SwotGrid swot={current} asOf={asOf} />}
          </section>
        </div>
      )}
    </div>
  );
}
