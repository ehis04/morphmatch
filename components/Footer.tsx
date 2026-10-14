export function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-card">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-ink-soft">
        <p className="max-w-3xl leading-relaxed">
          <strong className="text-ink">About the data.</strong> This reference dataset is a
          snapshot; league and career labels may have changed. Listed measurements vary between
          sources and over a career. Wingspans marked <span className="font-mono">≈</span> are
          estimates. Silhouettes approximate body shape. Photos include Wikimedia source and licence
          credits.
        </p>
        <p className="mt-4 text-xs text-ink-faint">
          MorphMatch · MIT licensed ·{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            Privacy & data
          </Link>
        </p>
      </div>
    </footer>
  );
}
import Link from "next/link";
