export function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-card">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-ink-soft">
        <p className="max-w-3xl leading-relaxed">
          <strong className="text-ink">About the data.</strong> Heights and weights are official
          listed figures from leagues, clubs and federations, which vary slightly between sources
          and over a career. Wingspans marked <span className="font-mono">≈</span> are estimates
          from sport-typical proportions — few sports publish them. Photos are loaded from Wikipedia
          under their free licences.
        </p>
        <p className="mt-4 text-xs text-ink-faint">
          MorphMatch · Built with Next.js, Tailwind CSS and Supabase · MIT licensed
        </p>
      </div>
    </footer>
  );
}
