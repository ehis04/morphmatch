"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ATHLETES } from "@/data";
import { countryName, flagEmoji } from "@/lib/countries";
import { DEFAULT_PROFILE, toBodyStats, useProfile } from "@/lib/profile";
import { parseComparisonMode, type ComparisonMode } from "@/lib/comparison";
import { findMatches, matchTier, selectMatchTarget, surpriseMatch } from "@/lib/similarity";
import { validateProfile } from "@/lib/profile-validation";
import { SPORT_COLOR } from "@/lib/sport";
import { DEFAULT_FILTERS, type MatchFilters, type MatchResult } from "@/lib/types";
import { AthletePhoto, WikiCredit } from "./AthletePhoto";
import { ComparisonStage } from "./ComparisonStage";
import { FilterPanel } from "./FilterPanel";
import { SaveCompButton } from "./SaveCompButton";
import { ScoreRing } from "./ScoreRing";
import { StatForm } from "./StatForm";
import { StatTable } from "./StatTable";
import { useUnits } from "./UnitsProvider";

export function MatchTool() {
  const { system } = useUnits();
  const { profile, setProfile, hydrated } = useProfile();
  const params = useSearchParams();
  const pinnedId = params.get("athlete");

  const [filters, setFilters] = useState<MatchFilters>(DEFAULT_FILTERS);
  const [selection, setSelection] = useState<{ id: string; pinnedId: string | null } | null>(null);
  const mode = parseComparisonMode(params.get("mode"));
  const setMode = (next: ComparisonMode) => {
    const query = new URLSearchParams(params.toString());
    if (next === "overlay") query.delete("mode");
    else query.set("mode", next);
    window.history.replaceState(
      null,
      "",
      `/match${query.size ? `?${query}` : ""}${window.location.hash}`
    );
  };

  if (selection && selection.pinnedId !== pinnedId) {
    setSelection(null);
  }

  const invalid = validateProfile(profile) !== null;
  const stats = useMemo(() => toBodyStats(profile), [profile]);
  const hasWingspan = profile.wingspanCm != null;
  const selectedId = selection?.pinnedId === pinnedId ? selection.id : null;
  const selectAthlete = (id: string) => setSelection({ id, pinnedId });

  const results = useMemo(
    () =>
      !hydrated || invalid
        ? []
        : findMatches(stats, ATHLETES, filters, { userProvidedWingspan: hasWingspan }),
    [stats, filters, invalid, hydrated, hasWingspan]
  );

  // The comparison target: explicit selection > URL pin > best match.
  const target: MatchResult | null = useMemo(
    () => selectMatchTarget(results, selectedId, pinnedId),
    [results, selectedId, pinnedId]
  );

  const tier = target ? matchTier(target.score) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8" aria-busy={!hydrated}>
      <header className="mb-6">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Find my match</h1>
        <p className="mt-1 text-ink-soft">
          Your measurements against {ATHLETES.length} professionals. Adjust the filters to pick the
          pool.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* ── Left: measurements + filters ── */}
        <aside className="min-w-0 space-y-6 lg:sticky lg:top-20 lg:self-start">
          <section className="rounded-lg border border-line bg-card p-4 shadow-card">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold">Your measurements</h2>
              <button
                type="button"
                disabled={!hydrated}
                title="Restore the default measurements and clear your wingspan"
                onClick={() => {
                  setProfile({ ...DEFAULT_PROFILE });
                  setSelection(null);
                }}
                className="min-h-10 text-xs font-semibold text-ink-soft underline underline-offset-2 transition-colors hover:text-ink disabled:opacity-50"
              >
                Reset measurements
              </button>
            </div>
            {hydrated ? (
              <StatForm profile={profile} onChange={setProfile} system={system} />
            ) : (
              <div className="h-64 animate-pulse rounded-md bg-line/50" aria-hidden />
            )}
            {results.length > 0 && (
              <a
                href="#match-results"
                onClick={() =>
                  document.getElementById("match-results")?.focus({ preventScroll: true })
                }
                className="mt-4 flex min-h-11 items-center justify-between gap-2 rounded-md bg-ink px-3 py-2 text-sm font-semibold text-paper lg:hidden"
              >
                <span>View my matches ↓</span>
                <span className="font-mono text-xs">{results.length} athletes</span>
              </a>
            )}
          </section>
          <section className="rounded-lg border border-line bg-card p-4 shadow-card">
            <FilterPanel filters={filters} onChange={setFilters} />
          </section>
        </aside>

        {/* ── Right: comparison + results ── */}
        <div id="match-results" tabIndex={-1} className="min-w-0 scroll-mt-24 space-y-6">
          {target ? (
            <section className="rounded-lg border border-line bg-card shadow-card">
              <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
                <div className="flex w-full min-w-0 items-center gap-3 sm:w-auto sm:flex-1">
                  <div className="shrink-0">
                    <ScoreRing score={target.score} />
                  </div>
                  <div className="min-w-0">
                    <p className="break-words font-display text-xl font-extrabold leading-tight">
                      {target.athlete.name}
                    </p>
                    <p className="text-sm text-ink-soft">
                      <span aria-hidden>{flagEmoji(target.athlete.country)}</span>{" "}
                      {countryName(target.athlete.country)} · {target.athlete.league}
                      {target.athlete.position ? ` · ${target.athlete.position}` : ""}
                    </p>
                    <div className="mt-1 break-words">
                      <WikiCredit athlete={target.athlete} />
                    </div>
                  </div>
                </div>
                {tier && (
                  <span className="rounded-full bg-tape px-3 py-1 text-xs font-bold">
                    {tier.label}
                  </span>
                )}
                <div className="ml-auto flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      const pick = surpriseMatch(results, target.athlete.id);
                      if (pick) selectAthlete(pick.athlete.id);
                    }}
                    disabled={!results.some((r) => r.athlete.id !== target.athlete.id)}
                    className="rounded-md border border-ink px-3 py-1.5 text-xs font-bold transition-colors hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    🎲 Surprise me
                  </button>
                  <SaveCompButton
                    title={`Me vs ${target.athlete.name}`}
                    subject={{
                      kind: "custom",
                      label: "Me",
                      stats,
                      wingspanEstimated: !hasWingspan,
                    }}
                    targetAthleteId={target.athlete.id}
                    mode={mode}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-[minmax(0,1fr)_150px]">
                <div className="min-w-0">
                  <ViewTabs mode={mode} setMode={setMode} />
                  <div className="mt-4">
                    {mode === "table" ? (
                      <StatTable
                        left={{ label: "You", stats, wingspanEstimated: !hasWingspan }}
                        right={{
                          label: target.athlete.name,
                          stats: target.athlete,
                          wingspanEstimated: target.athlete.wingspanEstimated,
                        }}
                        delta={target.delta}
                        system={system}
                      />
                    ) : (
                      <div className="ruled rounded-lg border border-line p-3">
                        <ComparisonStage
                          mode={mode}
                          system={system}
                          subjects={[
                            {
                              label: "You",
                              stats,
                              color: "var(--color-ink)",
                              wingspanEstimated: !hasWingspan,
                            },
                            {
                              label: target.athlete.name.split(" ").slice(-1)[0],
                              stats: target.athlete,
                              color: SPORT_COLOR[target.athlete.sport],
                              wingspanEstimated: target.athlete.wingspanEstimated,
                            },
                          ]}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="hidden md:block">
                  <AthletePhoto
                    athlete={target.athlete}
                    className="aspect-[3/4] rounded-lg"
                    sizes="150px"
                  />
                </div>
              </div>
            </section>
          ) : (
            <section className="rounded-lg border border-dashed border-line-strong bg-card p-10 text-center">
              <p className="font-display text-xl font-bold">
                {!hydrated
                  ? "Loading your measurements…"
                  : invalid
                    ? "Fix your measurements to see matches"
                    : "No athletes match these filters"}
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                {!hydrated
                  ? "Your saved preferences will appear in a moment."
                  : invalid
                    ? "The form on the left will point out what's out of range."
                    : "Widen the sport, league or country filters and the wall will fill back up."}
              </p>
              {hydrated && !invalid && (
                <button
                  type="button"
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="mt-4 rounded-md bg-ink px-4 py-2 text-sm font-bold text-paper"
                >
                  Reset filters
                </button>
              )}
            </section>
          )}

          {/* ── Results list ── */}
          {results.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-xl font-bold">
                Your top matches{" "}
                <span className="font-mono text-sm font-normal text-ink-faint">
                  ({results.length} in pool)
                </span>
              </h2>
              <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {results.slice(0, 12).map((r, i) => {
                  const active = target?.athlete.id === r.athlete.id;
                  return (
                    <li key={r.athlete.id} className="min-w-0">
                      <button
                        type="button"
                        onClick={() => selectAthlete(r.athlete.id)}
                        aria-pressed={active}
                        className={`flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors ${
                          active
                            ? "border-ink bg-card shadow-card"
                            : "border-line bg-card hover:border-ink-faint"
                        }`}
                      >
                        <span className="w-5 text-center font-mono text-xs text-ink-faint">
                          {i + 1}
                        </span>
                        <AthletePhoto
                          athlete={r.athlete}
                          className="h-11 w-11 shrink-0 rounded-md"
                          sizes="44px"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold">{r.athlete.name}</span>
                          <span className="block truncate text-xs text-ink-soft">
                            <span
                              className="mr-1 inline-block h-2 w-2 rounded-full align-middle"
                              style={{ backgroundColor: SPORT_COLOR[r.athlete.sport] }}
                              aria-hidden
                            />
                            {r.athlete.league} · {matchTier(r.score).label}
                          </span>
                        </span>
                        <ScoreRing score={r.score} size={44} />
                      </button>
                      <div className="px-2.5 pb-1 pt-0.5 leading-tight">
                        <WikiCredit athlete={r.athlete} />
                      </div>
                    </li>
                  );
                })}
              </ol>
              <p className="mt-4 text-sm text-ink-soft">
                Want to browse instead?{" "}
                <Link href="/athletes" className="font-semibold underline underline-offset-2">
                  See the full athlete wall →
                </Link>
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function ViewTabs({
  mode,
  setMode,
}: {
  mode: ComparisonMode;
  setMode: (m: ComparisonMode) => void;
}) {
  const tabs: [ComparisonMode, string][] = [
    ["overlay", "Overlay"],
    ["side", "Side by side"],
    ["table", "Numbers"],
  ];
  return (
    <div
      className="flex w-full min-w-0 rounded-md border border-line bg-paper p-0.5 sm:w-auto"
      role="group"
      aria-label="Comparison view"
    >
      {tabs.map(([value, label]) => (
        <button
          key={value}
          type="button"
          aria-pressed={mode === value}
          onClick={() => setMode(value)}
          className={`min-h-11 min-w-0 flex-1 rounded px-2 py-2 text-sm font-semibold transition-colors sm:flex-none sm:px-3 ${
            mode === value ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
