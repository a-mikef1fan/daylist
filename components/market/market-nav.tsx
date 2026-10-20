import Link from "next/link";

const LINKS = [
  { href: "/market", label: "Overview" },
  { href: "/market/matrix", label: "Compare" },
  { href: "/market/swot", label: "SWOT" },
];

export function MarketNav() {
  return (
    <nav aria-label="Primary" className="m-nav flex gap-1 text-sm">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className="rounded-md px-3 py-1.5 hover:bg-(--m-head)">
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
