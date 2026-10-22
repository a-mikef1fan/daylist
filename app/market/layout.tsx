import Link from "next/link";
import "./market.css";
import { MarketNav } from "@/components/market/market-nav";

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="market-root">
      <header className="sticky top-0 z-20 border-b border-(--m-line) bg-(--m-bg)/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/market" className="font-semibold tracking-tight">
            Agent Market Intel
          </Link>
          <MarketNav />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      <footer className="mx-auto max-w-6xl px-4 pb-10 text-sm m-muted">
        Curated dataset, not live data. Every claim links to its source; check the &ldquo;as of&rdquo; date.{" "}
        <a className="m-link" href="/api/market/health">Health</a>
      </footer>
    </div>
  );
}
