"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ATHLETES, getAthlete } from "@/data";
import { countryName, flagEmoji } from "@/lib/countries";
import { scoreAthlete } from "@/lib/similarity";
import { SPORT_COLOR } from "@/lib/sport";
import type { Athlete } from "@/lib/types";
import { formatHeight } from "@/lib/units";
import { AthletePhoto, WikiCredit } from "./AthletePhoto";
import { ComparisonStage } from "./ComparisonStage";
import { SaveCompButton } from "./SaveCompButton";
import { StatTable } from "./StatTable";
import { useUnits } from "./UnitsProvider";

export function VersusTool() {
  const { system } = useUnits();
  const params = useSearchParams();

  const [aId, setAId] = useState<string | null>(params.get("a"));
  const [bId, setBId] = useState<string | null>(params.get("b"));
  const [mode, setMode] = useState<"overlay" | "side">("overlay");

  const a = aId ? getAthlete(aId) : undefined;
  const b = bId ? getAthlete(bId) : undefined;

  // Keep the URL shareable as picks change.
  useEffect(() => {
    const qs = new URLSearchParams();
    if (aId) qs.set("a", aId);
    if (bId) qs.set("b", bId);
    window.history.replaceState(null, "", qs.size ? `/versus?${qs}` : "/versus");
  }, [aId, bId]);

  const result = useMemo(() => {
    if (!a || !b) return null;
    return scoreAthlete(a, b, true);
  }, [a, b]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Head-to-head</h1>
        <p className="mt-1 text-ink-soft">
          Put any two pros on the wall — across sports, eras and leagues.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <AthletePicker
          label="First athlete"
          selected={a}
          exclude={bId}
          onSelect={(id) => setAId(id)}
        />
        <AthletePicker
          label="Second athlete"
          selected={b}
          exclude={aId}
          onSelect={(id) => setBId(id)}
        />
      </div>

      {a && b && result ? (
        <section className="mt-6 rounded-lg border border-line bg-card shadow-card">
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
            <p className="font-display text-xl font-extrabold">
              {a.name} <span className="text-ink-faint">vs</span> {b.name}
            </p>
            <span className="rounded-full bg-tape px-3 py-1 font-mono text-xs font-bold">
              {Math.round(result.score)}% build similarity
            </span>
            <div className="ml-auto flex items-center gap-2">
              <div
                className="inline-flex rounded-md border border-line bg-paper p-0.5"
                role="tablist"
              >
                {(
                  [
                    ["overlay", "Overlay"],
                    ["side", "Side by side"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={mode === value}
                    onClick={() => setMode(value)}
                    className={`rounded px-3 py-1.5 text-sm font-semibold transition-colors ${
                      mode === value ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <SaveCompButton
                title={`${a.name} vs ${b.name}`}
                subject={{ kind: "athlete", athleteId: a.id }}
                targetAthleteId={b.id}
                mode={mode}
              />
            </div>
          </div>

          <div className="grid gap-4 p-4 lg:grid-cols-[150px_1fr_150px]">
            <SidePhoto athlete={a} />
            <div className="ruled min-w-0 rounded-lg border border-line p-3">
              <ComparisonStage
                mode={mode}
                system={system}
                subjects={[
                  {
                    label: a.name.split(" ").slice(-1)[0],
                    stats: a,
                    color: aId === bId ? "var(--color-ink)" : SPORT_COLOR[a.sport],
                    wingspanEstimated: a.wingspanEstimated,
                  },
                  {
                    label: b.name.split(" ").slice(-1)[0],
                    stats: b,
                    color: a.sport === b.sport ? "var(--color-ink)" : SPORT_COLOR[b.sport],
                    wingspanEstimated: b.wingspanEstimated,
                  },
                ]}
              />
            </div>
            <SidePhoto athlete={b} right />
          </div>

          <div className="border-t border-line p-4">
            <StatTable
              left={{ label: a.name, stats: a }}
              right={{ label: b.name, stats: b, wingspanEstimated: b.wingspanEstimated }}
              delta={result.delta}
              system={system}
            />
          </div>
        </section>
      ) : (
        <section className="mt-6 rounded-lg border border-dashed border-line-strong bg-card p-10 text-center">
          <p className="font-display text-xl font-bold">Pick two athletes to compare</p>
          <p className="mt-2 text-sm text-ink-soft">
            Try a cross-sport classic: Messi vs Muggsy Bogues, or Wembanyama vs Peter Crouch.
          </p>
        </section>
      )}
    </div>
  );
}

function SidePhoto({ athlete, right = false }: { athlete: Athlete; right?: boolean }) {
  return (
    <div className={`hidden lg:block ${right ? "text-left" : "text-right"}`}>
      <AthletePhoto athlete={athlete} className="aspect-[3/4] rounded-lg" sizes="150px" />
      <div className="mt-1.5">
        <WikiCredit athlete={athlete} />
      </div>
    </div>
  );
}

function AthletePicker({
  label,
  selected,
  exclude,
  onSelect,
}: {
  label: string;
  selected?: Athlete;
  exclude: string | null;
  onSelect: (id: string) => void;
}) {
  const { system } = useUnits();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = ATHLETES.filter((x) => x.id !== exclude);
    if (!q) return pool.slice(0, 8);
    return pool
      .filter(
        (x) =>
          x.name.toLowerCase().includes(q) ||
          x.league.toLowerCase().includes(q) ||
          countryName(x.country).toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [query, exclude]);

  return (
    <div ref={wrapRef} className="relative">
      <label className="mb-1.5 block text-sm font-semibold">{label}</label>
      {selected && !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 rounded-lg border border-line bg-card p-2.5 text-left transition-colors hover:border-ink-faint"
        >
          <AthletePhoto athlete={selected} className="h-11 w-11 shrink-0 rounded-md" sizes="44px" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-bold">{selected.name}</span>
            <span className="block truncate text-xs text-ink-soft">
              {flagEmoji(selected.country)} {selected.league} ·{" "}
              {formatHeight(selected.heightCm, system)}
            </span>
          </span>
          <span className="text-xs font-semibold text-ink-soft">Change</span>
        </button>
      ) : (
        <input
          type="text"
          value={query}
          placeholder="Search name, league or country…"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          aria-label={label}
          className="w-full rounded-lg border border-line bg-card px-3 py-3 text-sm outline-none transition-colors focus:border-ink"
        />
      )}
      {open && (
        <ul className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-lg border border-line bg-card shadow-lift">
          {matches.length === 0 && (
            <li className="px-3 py-3 text-sm text-ink-soft">No athletes found for “{query}”.</li>
          )}
          {matches.map((x) => (
            <li key={x.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(x.id);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-paper"
              >
                <span
                  aria-hidden
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: SPORT_COLOR[x.sport] }}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{x.name}</span>
                <span className="shrink-0 font-mono text-xs text-ink-faint">
                  {formatHeight(x.heightCm, system)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
