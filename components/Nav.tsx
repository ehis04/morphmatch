"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { useUnits } from "./UnitsProvider";
import { getSupabase } from "@/lib/supabase/client";

const LINKS = [
  { href: "/match", label: "Find my match" },
  { href: "/versus", label: "Head-to-head" },
  { href: "/athletes", label: "Athletes" },
  { href: "/saved", label: "Saved" },
];

export function Nav() {
  const pathname = usePathname();
  const { system, setSystem } = useUnits();
  const { session, configured } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2" aria-label="MorphMatch home">
          <Logo />
          <span className="font-display text-lg font-extrabold tracking-tight">MorphMatch</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Main">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                pathname === l.href ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <UnitToggle system={system} setSystem={setSystem} />
          {configured &&
            (session ? (
              <button
                type="button"
                onClick={() => getSupabase()?.auth.signOut()}
                className="hidden rounded-md border border-line px-3 py-1.5 text-sm font-semibold text-ink-soft transition-colors hover:border-ink hover:text-ink sm:block"
              >
                Sign out
              </button>
            ) : (
              <Link
                href="/login"
                className="hidden rounded-md bg-ink px-3 py-1.5 text-sm font-bold text-paper transition-opacity hover:opacity-85 sm:block"
              >
                Sign in
              </Link>
            ))}
          <button
            type="button"
            className="rounded-md border border-line p-2 md:hidden"
            aria-expanded={open}
            aria-label="Toggle menu"
            onClick={() => setOpen((o) => !o)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
              <path
                d="M2 4h12M2 8h12M2 12h12"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-line px-4 py-2 md:hidden" aria-label="Main mobile">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`block rounded-md px-3 py-2 text-sm font-semibold ${
                pathname === l.href ? "bg-ink text-paper" : "text-ink-soft"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {configured && !session && (
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2 text-sm font-bold"
            >
              Sign in
            </Link>
          )}
          {configured && session && (
            <button
              type="button"
              onClick={() => {
                getSupabase()?.auth.signOut();
                setOpen(false);
              }}
              className="block w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-ink-soft"
            >
              Sign out
            </button>
          )}
        </nav>
      )}
    </header>
  );
}

function UnitToggle({
  system,
  setSystem,
}: {
  system: "metric" | "imperial";
  setSystem: (s: "metric" | "imperial") => void;
}) {
  return (
    <div
      className="flex rounded-md border border-line bg-card p-0.5"
      role="group"
      aria-label="Units"
    >
      {(
        [
          ["metric", "cm/kg"],
          ["imperial", "ft/lb"],
        ] as const
      ).map(([value, label]) => (
        <button
          key={value}
          type="button"
          aria-pressed={system === value}
          onClick={() => setSystem(value)}
          className={`rounded px-2 py-1 font-mono text-xs font-semibold transition-colors ${
            system === value ? "bg-tape text-ink" : "text-ink-soft hover:text-ink"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** Ruler-tick logo mark. */
function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden className="shrink-0">
      <rect x="1" y="1" width="24" height="24" rx="5" fill="var(--color-ink)" />
      <path
        d="M6 19V7M6 19h4M6 15h3M6 11h3M6 7h4"
        stroke="var(--color-tape)"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="17.5" cy="9" r="2.4" fill="var(--color-paper)" />
      <path d="M17.5 12.2c-2.6 0-4 1.9-4 4.3h8c0-2.4-1.4-4.3-4-4.3Z" fill="var(--color-paper)" />
    </svg>
  );
}
