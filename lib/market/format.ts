export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "unknown";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export type ConfidenceLevel = "high" | "medium" | "low" | "unknown";

/** Accepts "high"/"medium"/"low" or a 0..1 / 0..100 number stored as text. */
export function normaliseConfidence(raw: string): ConfidenceLevel {
  const v = raw.trim().toLowerCase();
  if (v === "high" || v === "medium" || v === "low") return v;
  if (v === "med") return "medium";
  const n = Number(v);
  if (!Number.isNaN(n) && v !== "") {
    const x = n > 1 ? n / 100 : n;
    return x >= 0.75 ? "high" : x >= 0.4 ? "medium" : "low";
  }
  return "unknown";
}

export const SUPPORT_LABEL = {
  yes: "Supported",
  partial: "Partial support",
  no: "Not supported",
  unknown: "Unknown",
} as const;
