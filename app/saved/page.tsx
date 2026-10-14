"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ComparisonStage, type StageSubject } from "@/components/ComparisonStage";
import { StatTable } from "@/components/StatTable";
import { useUnits } from "@/components/UnitsProvider";
import { getAthlete } from "@/data";
import { getSupabase } from "@/lib/supabase/client";
import { SPORT_COLOR } from "@/lib/sport";
import type { SavedComp } from "@/lib/types";
import { parseSavedComparisons, type UnavailableSavedComp } from "@/lib/comparisons";
import { scoreAthlete } from "@/lib/similarity";
import { parseComparisonMode, versusHref } from "@/lib/comparison";
import { useProfile } from "@/lib/profile";

export default function SavedPage() {
  const { session, loading, configured } = useAuth();
  const { system } = useUnits();
  const userId = session?.user.id;
  const [result, setResult] = useState<{
    userId: string;
    comps: SavedComp[];
    invalid: number;
    unavailable: UnavailableSavedComp[];
    error: string | null;
  } | null>(null);
  const [reload, setReload] = useState(0);
  const [deleting, setDeleting] = useState<string[]>([]);
  const currentResult = result?.userId === userId ? result : null;
  const comps = currentResult?.comps;
  const error = currentResult?.error;

  useEffect(() => {
    if (!userId) return;
    const supabase = getSupabase();
    if (!supabase) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        // Page through the API's row limit so older saves remain accessible.
        const rows: unknown[] = [];
        const batchSize = 500;
        for (let offset = 0; ; offset += batchSize) {
          const { data, error: err } = await supabase
            .from("saved_comps")
            .select("id,title,subject,target_athlete_id,mode,created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
            .range(offset, offset + batchSize - 1)
            .abortSignal(controller.signal);
          if (err) throw err;
          rows.push(...(data ?? []));
          if ((data?.length ?? 0) < batchSize) break;
        }
        if (!controller.signal.aborted) {
          setResult({ userId, ...parseSavedComparisons(rows), error: null });
        }
      } catch {
        if (!controller.signal.aborted) {
          setResult({
            userId,
            comps: [],
            invalid: 0,
            unavailable: [],
            error: "Your comparisons could not be loaded. Please try again in a moment.",
          });
        }
      }
    };
    void load();
    return () => controller.abort();
  }, [userId, reload]);

  const remove = async (id: string) => {
    const supabase = getSupabase();
    if (!supabase || !userId || deleting.includes(id)) return;
    setDeleting((ids) => [...ids, id]);
    try {
      const { data, error: err } = await supabase
        .from("saved_comps")
        .delete()
        .eq("id", id)
        .eq("user_id", userId)
        .select("id");
      if (err || data?.length !== 1) throw err ?? new Error("Comparison was not deleted");
      setResult((previous) =>
        previous?.userId === userId
          ? {
              ...previous,
              comps: previous.comps.filter((comp) => comp.id !== id),
              invalid:
                previous.invalid - Number(previous.unavailable.some((comp) => comp.id === id)),
              unavailable: previous.unavailable.filter((comp) => comp.id !== id),
              error: null,
            }
          : previous
      );
    } catch {
      setResult((previous) =>
        previous?.userId === userId
          ? { ...previous, error: "That comparison could not be deleted. Please try again." }
          : previous
      );
    } finally {
      setDeleting((ids) => ids.filter((item) => item !== id));
    }
  };

  if (!configured) {
    return (
      <Empty
        title="Accounts are switched off"
        body="Saving comparisons is currently unavailable. You can still find matches and compare athletes."
        cta={{ href: "/match", label: "Back to matching" }}
      />
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Saved comparisons</h1>
        <p role="status" className="my-4 text-ink-soft">
          Checking your account…
        </p>
        <div className="h-40 animate-pulse rounded-lg bg-line/50" aria-hidden />
      </div>
    );
  }

  if (!session) {
    return (
      <Empty
        title="Sign in to see your saved comparisons"
        body="Comparisons you save — for yourself, friends or head-to-heads — live here on your account."
        cta={{ href: "/login?next=%2Fsaved", label: "Sign in" }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Saved comparisons</h1>
        <p className="mt-1 break-words text-ink-soft">{session.user.email}</p>
      </header>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-md bg-record/10 px-3 py-2 text-sm font-medium text-record"
        >
          {error}{" "}
          <button type="button" onClick={() => setReload((n) => n + 1)} className="underline">
            Reload comparisons
          </button>
        </p>
      )}

      {currentResult && currentResult.invalid > 0 && (
        <p role="status" className="mb-4 text-sm text-ink-soft">
          {currentResult.invalid} older{" "}
          {currentResult.invalid === 1 ? "comparison could" : "comparisons could"} not be displayed
          because the saved measurements are incomplete.
          {currentResult.unavailable.length > 0 && " You can delete unavailable saves below."}
        </p>
      )}

      {!currentResult && (
        <p role="status" className="text-ink-soft">
          Loading comparisons…
        </p>
      )}

      {!error && comps && comps.length === 0 && currentResult?.unavailable.length === 0 && (
        <Empty
          title="Nothing saved yet"
          body="Find a match or set up a head-to-head, then press “Save comparison” to pin it here."
          cta={{ href: "/match", label: "Find my match" }}
          bare
        />
      )}

      <div className="space-y-4">
        {comps?.map((comp) => (
          <SavedRow
            key={comp.id}
            comp={comp}
            system={system}
            deleting={deleting.includes(comp.id)}
            onDelete={() => remove(comp.id)}
          />
        ))}
        {currentResult?.unavailable.map((comp) => (
          <article key={comp.id} className="rounded-lg border border-line bg-card p-4 shadow-card">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="min-w-0 basis-full break-words font-display text-lg font-bold sm:flex-1 sm:basis-auto">
                {comp.title}
              </h2>
              <button
                type="button"
                onClick={() => remove(comp.id)}
                disabled={deleting.includes(comp.id)}
                aria-label={`Delete ${comp.title}`}
                className="min-h-11 rounded-md border border-line px-3 py-2 text-xs font-bold text-record transition-colors hover:border-record disabled:opacity-50"
              >
                {deleting.includes(comp.id) ? "Deleting…" : "Delete"}
              </button>
            </div>
            <p className="mt-2 text-sm text-ink-soft">
              This saved comparison is unavailable because its measurements are incomplete.
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

function SavedRow({
  comp,
  system,
  onDelete,
  deleting,
}: {
  comp: SavedComp;
  system: "metric" | "imperial";
  onDelete: () => void;
  deleting: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setProfile } = useProfile();
  const target = getAthlete(comp.target_athlete_id);
  const subjectAthlete =
    comp.subject.kind === "athlete" ? getAthlete(comp.subject.athleteId) : null;

  const leftStats = comp.subject.kind === "custom" ? comp.subject.stats : subjectAthlete;
  const subjects: StageSubject[] | undefined =
    leftStats && target
      ? [
          {
            label:
              comp.subject.kind === "custom"
                ? comp.subject.label
                : subjectAthlete!.name.split(" ").slice(-1)[0],
            stats: leftStats,
            color: subjectAthlete ? SPORT_COLOR[subjectAthlete.sport] : "var(--color-ink)",
            wingspanEstimated:
              comp.subject.kind === "custom"
                ? comp.subject.wingspanEstimated
                : subjectAthlete?.wingspanEstimated,
          },
          {
            label: target.name.split(" ").slice(-1)[0],
            stats: target,
            color:
              subjectAthlete?.sport === target.sport
                ? "var(--color-ink)"
                : SPORT_COLOR[target.sport],
            wingspanEstimated: target.wingspanEstimated,
          },
        ]
      : undefined;

  return (
    <article className="rounded-lg border border-line bg-card shadow-card">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <div className="min-w-0 basis-full sm:flex-1 sm:basis-auto">
          <h2 className="break-words font-display text-lg font-bold">{comp.title}</h2>
          <p className="text-xs text-ink-faint">
            Saved {new Date(comp.created_at).toLocaleDateString()} ·{" "}
            {comp.mode === "side" ? "side by side" : comp.mode === "table" ? "numbers" : comp.mode}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="min-h-11 rounded-md border border-line px-3 py-2 text-xs font-bold transition-colors hover:border-ink"
        >
          {open ? "Hide" : "View"}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          aria-label={`Delete ${comp.title}`}
          className="min-h-11 rounded-md border border-line px-3 py-2 text-xs font-bold text-record transition-colors hover:border-record disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
      {open && (
        <div className="border-t border-line p-4">
          {subjects ? (
            <>
              {comp.mode === "table" && target ? (
                <StatTable
                  left={{
                    label: subjects[0].label,
                    stats: subjects[0].stats,
                    wingspanEstimated: subjects[0].wingspanEstimated,
                  }}
                  right={{
                    label: target.name,
                    stats: target,
                    wingspanEstimated: target.wingspanEstimated,
                  }}
                  delta={
                    scoreAthlete(subjects[0].stats, target, !subjects[0].wingspanEstimated).delta
                  }
                  system={system}
                />
              ) : (
                <div className="ruled rounded-lg border border-line p-3">
                  <ComparisonStage
                    mode={comp.mode === "side" ? "side" : "overlay"}
                    system={system}
                    subjects={subjects}
                  />
                </div>
              )}
              {subjectAthlete && target && (
                <Link
                  href={versusHref("", { a: subjectAthlete.id, b: target.id, mode: comp.mode })}
                  className="mt-4 inline-flex min-h-11 items-center text-sm font-bold underline"
                >
                  Open head-to-head
                </Link>
              )}
              {comp.subject.kind === "custom" && target && (
                <div className="mt-4">
                  <button
                    type="button"
                    className="min-h-11 text-sm font-bold underline"
                    onClick={() => {
                      if (comp.subject.kind !== "custom") return;
                      setProfile({
                        heightCm: comp.subject.stats.heightCm,
                        weightKg: comp.subject.stats.weightKg,
                        gender: comp.subject.stats.gender,
                        wingspanCm: comp.subject.wingspanEstimated
                          ? undefined
                          : comp.subject.stats.wingspanCm,
                      });
                      router.push(
                        `/match?athlete=${target.id}&mode=${parseComparisonMode(comp.mode)}`
                      );
                    }}
                  >
                    Open in matching
                  </button>
                  <p className="text-xs text-ink-soft">
                    Restores these measurements on this device.
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-ink-soft">
              This comparison references an athlete that’s no longer in the database.
            </p>
          )}
        </div>
      )}
    </article>
  );
}

function Empty({
  title,
  body,
  cta,
  bare = false,
}: {
  title: string;
  body: string;
  cta: { href: string; label: string };
  bare?: boolean;
}) {
  const inner = (
    <div className="rounded-lg border border-dashed border-line-strong bg-card p-10 text-center">
      {bare ? (
        <h2 className="font-display text-xl font-bold">{title}</h2>
      ) : (
        <h1 className="font-display text-xl font-bold">{title}</h1>
      )}
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">{body}</p>
      <Link
        href={cta.href}
        className="mt-5 inline-block rounded-md bg-ink px-4 py-2 text-sm font-bold text-paper"
      >
        {cta.label}
      </Link>
    </div>
  );
  if (bare) return inner;
  return <div className="mx-auto max-w-4xl px-4 py-8">{inner}</div>;
}
