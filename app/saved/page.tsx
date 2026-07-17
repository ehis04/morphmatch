"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ComparisonStage } from "@/components/ComparisonStage";
import { useUnits } from "@/components/UnitsProvider";
import { getAthlete } from "@/data";
import { getSupabase } from "@/lib/supabase/client";
import { SPORT_COLOR } from "@/lib/sport";
import type { SavedComp } from "@/lib/types";

export default function SavedPage() {
  const { session, loading, configured } = useAuth();
  const { system } = useUnits();
  const [comps, setComps] = useState<SavedComp[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    const supabase = getSupabase();
    if (!supabase) return;
    supabase
      .from("saved_comps")
      .select("id,title,subject,target_athlete_id,mode,created_at")
      .order("created_at", { ascending: false })
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setComps((data as SavedComp[]) ?? []);
      });
  }, [session]);

  const remove = async (id: string) => {
    const supabase = getSupabase();
    if (!supabase) return;
    setComps((c) => c?.filter((x) => x.id !== id) ?? null);
    await supabase.from("saved_comps").delete().eq("id", id);
  };

  if (!configured) {
    return (
      <Empty
        title="Accounts are switched off"
        body="This deployment has no Supabase project connected, so saved comparisons are disabled. See the README to enable them in five minutes."
        cta={{ href: "/match", label: "Back to matching" }}
      />
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="h-40 animate-pulse rounded-lg bg-line/50" aria-hidden />
      </div>
    );
  }

  if (!session) {
    return (
      <Empty
        title="Sign in to see your saved comparisons"
        body="Comparisons you save — for yourself, friends or head-to-heads — live here on your account."
        cta={{ href: "/login", label: "Sign in" }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Saved comparisons</h1>
        <p className="mt-1 text-ink-soft">{session.user.email}</p>
      </header>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-md bg-record/10 px-3 py-2 text-sm font-medium text-record"
        >
          Couldn’t load your comparisons: {error}. If you just set up Supabase, make sure the
          database migration has been run.
        </p>
      )}

      {comps && comps.length === 0 && (
        <Empty
          title="Nothing saved yet"
          body="Find a match or set up a head-to-head, then press “Save comparison” to pin it here."
          cta={{ href: "/match", label: "Find my match" }}
          bare
        />
      )}

      <div className="space-y-4">
        {comps?.map((comp) => (
          <SavedRow key={comp.id} comp={comp} system={system} onDelete={() => remove(comp.id)} />
        ))}
      </div>
    </div>
  );
}

function SavedRow({
  comp,
  system,
  onDelete,
}: {
  comp: SavedComp;
  system: "metric" | "imperial";
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const target = getAthlete(comp.target_athlete_id);
  const subjectAthlete =
    comp.subject.kind === "athlete" ? getAthlete(comp.subject.athleteId) : null;

  const subjects =
    comp.subject.kind === "custom"
      ? target && [
          { label: comp.subject.label, stats: comp.subject.stats, color: "var(--color-ink)" },
          {
            label: target.name.split(" ").slice(-1)[0],
            stats: target,
            color: SPORT_COLOR[target.sport],
            wingspanEstimated: target.wingspanEstimated,
          },
        ]
      : subjectAthlete &&
        target && [
          {
            label: subjectAthlete.name.split(" ").slice(-1)[0],
            stats: subjectAthlete,
            color: SPORT_COLOR[subjectAthlete.sport],
            wingspanEstimated: subjectAthlete.wingspanEstimated,
          },
          {
            label: target.name.split(" ").slice(-1)[0],
            stats: target,
            color:
              subjectAthlete.sport === target.sport
                ? "var(--color-ink)"
                : SPORT_COLOR[target.sport],
            wingspanEstimated: target.wingspanEstimated,
          },
        ];

  return (
    <article className="rounded-lg border border-line bg-card shadow-card">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-lg font-bold">{comp.title}</h2>
          <p className="text-xs text-ink-faint">
            Saved {new Date(comp.created_at).toLocaleDateString()} ·{" "}
            {comp.mode === "side" ? "side by side" : comp.mode}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="rounded-md border border-line px-3 py-1.5 text-xs font-bold transition-colors hover:border-ink"
        >
          {open ? "Hide" : "View"}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-md border border-line px-3 py-1.5 text-xs font-bold text-record transition-colors hover:border-record"
        >
          Delete
        </button>
      </div>
      {open && (
        <div className="border-t border-line p-4">
          {subjects ? (
            <div className="ruled rounded-lg border border-line p-3">
              <ComparisonStage
                mode={comp.mode === "side" ? "side" : "overlay"}
                system={system}
                subjects={subjects}
              />
            </div>
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
      <p className="font-display text-xl font-bold">{title}</p>
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
