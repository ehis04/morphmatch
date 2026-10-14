"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  const [signingOut, setSigningOut] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !header.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("keydown", keydown);
    document.addEventListener("pointerdown", outside, { passive: true });
    return () => {
      document.removeEventListener("keydown", keydown);
      document.removeEventListener("pointerdown", outside);
    };
  }, [open]);

  async function signOut() {
    if (signingOut) return;
    const supabase = getSupabase();
    if (!supabase) return;
    setSigningOut(true);
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setOpen(false);
    } catch {
      setAuthError("Could not sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <header
      ref={header}
      className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-3 sm:gap-4 sm:px-4">
        <Link
          href="/"
          className="flex min-h-11 shrink-0 items-center gap-2"
          aria-label="MorphMatch home"
        >
          <Logo />
          <span className="font-display text-lg font-extrabold tracking-tight">MorphMatch</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Main">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={pathname === l.href ? "page" : undefined}
              className={`flex min-h-11 items-center rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
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
                onClick={signOut}
                disabled={signingOut}
                className="hidden rounded-md border border-line px-3 py-1.5 text-sm font-semibold text-ink-soft transition-colors hover:border-ink hover:text-ink sm:block"
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            ) : (
              <Link
                href="/login"
                className="hidden min-h-11 items-center rounded-md bg-ink px-3 py-1.5 text-sm font-bold text-paper transition-opacity hover:opacity-85 sm:flex"
              >
                Sign in
              </Link>
            ))}
          <button
            ref={menuButton}
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-line lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-navigation"
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
        <nav
          id="mobile-navigation"
          className="border-t border-line px-4 py-2 lg:hidden"
          aria-label="Main mobile"
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={pathname === l.href ? "page" : undefined}
              onClick={() => setOpen(false)}
              className={`flex min-h-11 items-center rounded-md px-3 py-2 text-sm font-semibold ${
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
              className="flex min-h-11 items-center rounded-md px-3 py-2 text-sm font-bold"
            >
              Sign in
            </Link>
          )}
          {configured && session && (
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="block min-h-11 w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-ink-soft"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          )}
        </nav>
      )}
      {authError && (
        <p role="alert" className="mx-auto max-w-6xl px-4 pb-2 text-sm text-record">
          {authError}
        </p>
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
          className={`min-h-11 min-w-11 rounded px-1.5 py-1 font-mono text-xs font-semibold transition-colors sm:min-h-0 sm:px-2 ${
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
    <svg
      width="26"
      height="26"
      viewBox="0 0 26 26"
      aria-hidden
      className="hidden shrink-0 min-[360px]:block"
    >
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
