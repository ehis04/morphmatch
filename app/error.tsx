"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center" role="alert">
      <h1 className="font-display text-3xl font-extrabold">Something went wrong</h1>
      <p className="mt-3 text-ink-soft">Try loading this view again.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-md bg-ink px-5 py-2.5 font-bold text-paper"
      >
        Try again
      </button>
      <Link href="/" className="ml-4 font-semibold underline">
        Go home
      </Link>
    </div>
  );
}
