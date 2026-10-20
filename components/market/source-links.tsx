import { hostname, isHttpUrl } from "@/lib/market/format";

export function SourceLinks({ urls, label = "Sources" }: { urls: string[]; label?: string }) {
  const unique = [...new Set(urls.filter(Boolean))];
  if (unique.length === 0) {
    return <p className="text-sm m-muted">{label}: none cited</p>;
  }
  return (
    <p className="text-sm m-muted">
      {label}:{" "}
      {unique.map((u, i) => (
        <span key={u}>
          {i > 0 && ", "}
          {isHttpUrl(u) ? (
            <a className="m-link" href={u} target="_blank" rel="noopener noreferrer">
              {hostname(u)}
            </a>
          ) : (
            u
          )}
        </span>
      ))}
    </p>
  );
}
