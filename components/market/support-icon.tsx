import type { Support } from "@/lib/market/types";
import { SUPPORT_LABEL } from "@/lib/market/format";

const COLOR: Record<Support, string> = {
  yes: "var(--m-yes)",
  partial: "var(--m-partial)",
  no: "var(--m-no)",
  unknown: "var(--m-unknown)",
};

/** Shape + text label + colour, so meaning never relies on colour alone. */
export function SupportIcon({ support, withLabel = false }: { support: string; withLabel?: boolean }) {
  const key = (["yes", "partial", "no", "unknown"].includes(support) ? support : "unknown") as Support;
  const label = SUPPORT_LABEL[key];
  const c = COLOR[key];
  return (
    <span className="inline-flex items-center gap-1.5" style={{ color: c }}>
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
        {key === "yes" && (
          <>
            <circle cx="9" cy="9" r="8" fill="currentColor" />
            <path d="M5 9.3l2.8 2.7L13 6.5" fill="none" stroke="var(--m-card)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
        {key === "partial" && (
          <>
            <circle cx="9" cy="9" r="7.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M9 1.8a7.2 7.2 0 0 1 0 14.4z" fill="currentColor" />
          </>
        )}
        {key === "no" && (
          <>
            <rect x="1.5" y="1.5" width="15" height="15" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M6 6l6 6M12 6l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </>
        )}
        {key === "unknown" && (
          <>
            <circle cx="9" cy="9" r="7.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="2.5 2" />
            <text x="9" y="12.6" textAnchor="middle" fontSize="10" fontWeight="700" fill="currentColor">?</text>
          </>
        )}
      </svg>
      {withLabel ? <span className="text-sm">{label}</span> : <span className="sr-only">{label}</span>}
    </span>
  );
}

export function SupportLegend() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm m-muted" aria-label="Legend">
      {(["yes", "partial", "no", "unknown"] as Support[]).map((k) => (
        <li key={k}>
          <SupportIcon support={k} withLabel />
        </li>
      ))}
    </ul>
  );
}
