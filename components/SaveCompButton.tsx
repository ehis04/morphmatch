"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { getSupabase } from "@/lib/supabase/client";
import type { Subject } from "@/lib/types";

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
export function SaveCompButton({ title, subject, targetAthleteId, mode }: SaveCompButtonProps) {
  const { session, configured } = useAuth();
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  if (!configured) return null;

  if (!session) {
    return (
      <Link
        href="/login"
        className="rounded-md border border-line bg-card px-3 py-1.5 text-xs font-bold text-ink-soft transition-colors hover:border-ink hover:text-ink"
      >
        Sign in to save
      </Link>
    );
  }

  const save = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    setState("saving");
    const { error } = await supabase.from("saved_comps").insert({
      title,
      subject,
      target_athlete_id: targetAthleteId,
      mode,
    });
    setState(error ? "error" : "saved");
    if (!error) setTimeout(() => setState("idle"), 2500);
  };

  return (
    <button
      type="button"
      onClick={save}
      disabled={state === "saving"}
      className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
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
