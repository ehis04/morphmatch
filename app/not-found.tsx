import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="font-mono text-sm text-ink-faint">404</p>
      <h1 className="mt-2 font-display text-4xl font-extrabold">Off the ruler</h1>
      <p className="mt-3 text-ink-soft">This page isn’t on the measuring wall.</p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-md bg-ink px-5 py-2.5 font-bold text-paper"
      >
        Back to the start
      </Link>
    </div>
  );
}
