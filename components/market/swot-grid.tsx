import type { Swot } from "@/lib/market/queries";
import { SourceLinks } from "./source-links";

const QUADRANTS = [
  { key: "strengths", title: "Strengths", mark: "+" },
  { key: "weaknesses", title: "Weaknesses", mark: "−" },
  { key: "opportunities", title: "Opportunities", mark: "↗" },
  { key: "threats", title: "Threats", mark: "!" },
] as const;

export function SwotGrid({ swot, asOf }: { swot: Swot; asOf?: string }) {
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        {QUADRANTS.map((q) => (
          <section key={q.key} className="m-card" aria-labelledby={`${swot.scope}-${swot.refSlug}-${q.key}`}>
            <h3 id={`${swot.scope}-${swot.refSlug}-${q.key}`} className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <span aria-hidden="true" className="inline-grid h-5 w-5 place-items-center rounded bg-(--m-head) text-xs">
                {q.mark}
              </span>
              {q.title}
            </h3>
            {swot[q.key].length === 0 ? (
              <p className="text-sm m-muted">None recorded.</p>
            ) : (
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {swot[q.key].map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      <div className="mt-2">
        <SourceLinks urls={swot.sourceUrls} />
        {asOf && <p className="text-sm m-muted">As of {asOf}</p>}
      </div>
    </div>
  );
}
