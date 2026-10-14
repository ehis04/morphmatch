"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useAuth } from "./AuthProvider";
import { getSupabase } from "@/lib/supabase/client";
import type { Subject } from "@/lib/types";
import { comparisonInputSchema } from "@/lib/comparisons";

interface SaveCompButtonProps {
  title: string;
  subject: Subject;
  targetAthleteId: string;
  mode: string;
}

/**
 * Saves the current comparison to the signed-in user's account.
 * Degrades honestly: hidden when Supabase isn't configured, links to sign-in
 * when signed out, and reports save state inline.
 */
export function SaveCompButton(props: SaveCompButtonProps) {
  return (
    <Suspense fallback={null}>
      <SaveComparisonButton {...props} />
    </Suspense>
  );
}

function SaveComparisonButton({ title, subject, targetAthleteId, mode }: SaveCompButtonProps) {
  const { session, configured, loading } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const next = `${pathname}${searchParams.size ? `?${searchParams}` : ""}`;
  const comparison = { title, subject, target_athlete_id: targetAthleteId, mode };
  const key = JSON.stringify([session?.user.id, comparison]);
  const [result, setResult] = useState<{
    key: string;
    state: "saving" | "saved" | "error";
  } | null>(null);
  const state = result?.key === key ? result.state : "idle";

  if (!configured) return null;

  if (loading) {
    return (
      <button type="button" disabled className="min-h-11 px-3 py-1.5 text-xs text-ink-faint">
        Checking account…
      </button>
    );
  }

  if (!session) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(next)}`}
        className="inline-flex min-h-11 items-center rounded-md border border-line bg-card px-3 py-1.5 text-xs font-bold text-ink-soft transition-colors hover:border-ink hover:text-ink"
      >
        Sign in to save
      </Link>
    );
  }

  const save = async () => {
    const supabase = getSupabase();
    if (!supabase || state === "saving" || state === "saved") return;
    const parsed = comparisonInputSchema.safeParse(comparison);
    if (!parsed.success) {
      setResult({ key, state: "error" });
      return;
    }
    setResult({ key, state: "saving" });
    try {
      const { error } = await supabase.from("saved_comps").insert(parsed.data);
      setResult((previous) =>
        previous?.key === key ? { key, state: error ? "error" : "saved" } : previous
      );
    } catch {
      setResult((previous) => (previous?.key === key ? { key, state: "error" } : previous));
    }
  };

  return (
    <button
      type="button"
      onClick={save}
      disabled={state === "saving" || state === "saved"}
      aria-live="polite"
      className={`min-h-11 rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
        state === "saved"
          ? "bg-pitch text-white"
          : state === "error"
            ? "bg-record text-white"
            : "border border-ink bg-card hover:bg-ink hover:text-paper"
      }`}
    >
      {state === "saving"
        ? "Saving…"
        : state === "saved"
          ? "Saved ✓"
          : state === "error"
            ? "Couldn't save — retry"
            : "Save comparison"}
    </button>
  );
}
