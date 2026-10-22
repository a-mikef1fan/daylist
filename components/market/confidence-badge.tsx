import { normaliseConfidence } from "@/lib/market/format";

export function ConfidenceBadge({ value }: { value: string }) {
  const level = normaliseConfidence(value);
  return (
    <span className="m-chip" data-level={level} title="How well-sourced this entry is">
      <span aria-hidden="true">{level === "high" ? "●●●" : level === "medium" ? "●●○" : level === "low" ? "●○○" : "○○○"}</span>
      <span>{level === "unknown" ? "Confidence unknown" : `${level[0].toUpperCase()}${level.slice(1)} confidence`}</span>
    </span>
  );
}
