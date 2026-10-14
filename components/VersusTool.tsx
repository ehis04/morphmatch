"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ATHLETES } from "@/data";
import { readVersusSelection, versusHref, type ComparisonMode } from "@/lib/comparison";
import { countryName, flagEmoji } from "@/lib/countries";
import { normalizeSearch } from "@/lib/search";
import { scoreAthlete } from "@/lib/similarity";
import { SPORT_COLOR } from "@/lib/sport";
import type { Athlete } from "@/lib/types";
import { formatHeight } from "@/lib/units";
import { AthletePhoto, WikiCredit } from "./AthletePhoto";
import { ComparisonStage } from "./ComparisonStage";
import { SaveCompButton } from "./SaveCompButton";
import { ShareComparisonButton } from "./ShareComparisonButton";
import { StatTable } from "./StatTable";
import { useUnits } from "./UnitsProvider";

export function VersusTool() {
  const { system } = useUnits();
  const params = useSearchParams();

  const { a, b, mode, invalid } = readVersusSelection(params);
  const update = (changes: Partial<Record<"a" | "b" | "mode", string | null>>) => {
    window.history.pushState(null, "", versusHref(window.location.search, changes));
  };

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AthletePicker
          label="First athlete"
          selected={a}
          exclude={b?.id ?? null}
          onSelect={(id) => update({ a: id })}
        />
        <AthletePicker
          label="Second athlete"
          selected={b}
          exclude={a?.id ?? null}
          onSelect={(id) => update({ b: id })}
        />
      </div>

      {invalid && (
        <p role="status" className="mt-4 text-sm text-ink-soft">
          An athlete in this link could not be found. Choose another athlete using the pickers
          above.
        </p>
      )}

      {a && b && result ? (
        <section className="mt-6 rounded-lg border border-line bg-card shadow-card">
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
            <p className="font-display text-xl font-extrabold">
              {a.name} <span className="text-ink-faint">vs</span> {b.name}
            </p>
            <span className="rounded-full bg-tape px-3 py-1 font-mono text-xs font-bold">
              {Math.round(result.score)}% build similarity
            </span>
            <div className="ml-auto flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
              <div
                className="flex w-full min-w-0 rounded-md border border-line bg-paper p-0.5 sm:w-auto"
                role="group"
                aria-label="Comparison view"
              >
                {(
                  [
                    ["overlay", "Overlay"],
                    ["side", "Side by side"],
                    ["table", "Numbers"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={mode === value}
                    onClick={() => update({ mode: value satisfies ComparisonMode })}
                    className={`min-h-11 min-w-0 flex-1 rounded px-2 py-2 text-sm font-semibold transition-colors sm:flex-none sm:px-3 ${
                      mode === value ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <ShareComparisonButton aId={a.id} bId={b.id} mode={mode} />
              <SaveCompButton
                title={`${a.name} vs ${b.name}`}
                subject={{ kind: "athlete", athleteId: a.id }}
                targetAthleteId={b.id}
                mode={mode}
              />
            </div>
          </div>

          {mode !== "table" && (
            <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[150px_minmax(0,1fr)_150px]">
              <SidePhoto athlete={a} />
              <div className="ruled min-w-0 rounded-lg border border-line p-3">
                <ComparisonStage
                  mode={mode}
                  system={system}
                  subjects={[
                    {
                      label: a.name,
                      stats: a,
                      color: SPORT_COLOR[a.sport],
                      wingspanEstimated: a.wingspanEstimated,
                    },
                    {
                      label: b.name,
                      stats: b,
                      color: a.sport === b.sport ? "var(--color-ink)" : SPORT_COLOR[b.sport],
                      wingspanEstimated: b.wingspanEstimated,
                    },
                  ]}
                />
              </div>
              <SidePhoto athlete={b} right />
            </div>
          )}

          <div className="border-t border-line p-4">
            <StatTable
              left={{ label: a.name, stats: a, wingspanEstimated: a.wingspanEstimated }}
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
  const [activeIndex, setActiveIndex] = useState(0);
  const pickerId = useId();
  const listId = `${pickerId}-list`;
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    else if (restoreFocus.current && triggerRef.current) {
      triggerRef.current?.focus();
      restoreFocus.current = false;
    }
  }, [open, selected?.id]);

  useEffect(() => {
    const onClick = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onClick);
    return () => document.removeEventListener("pointerdown", onClick);
  }, []);

  const matches = useMemo(() => {
    const q = normalizeSearch(query);
    const pool = ATHLETES.filter((x) => x.id !== exclude);
    if (!q) return pool.slice(0, 8);
    return pool
      .filter(
        (x) =>
          normalizeSearch(x.name).includes(q) ||
          normalizeSearch(x.league).includes(q) ||
          normalizeSearch(countryName(x.country)).includes(q)
      )
      .slice(0, 8);
  }, [query, exclude]);
  const focusedIndex = Math.min(activeIndex, matches.length - 1);

  useEffect(() => {
    if (!open || focusedIndex < 0) return;
    const option = listRef.current?.children[focusedIndex] as HTMLElement | undefined;
    option?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [open, focusedIndex, query]);

  const choose = (id: string) => {
    onSelect(id);
    restoreFocus.current = true;
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  };

  return (
    <div
      ref={wrapRef}
      className="relative min-w-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <label htmlFor={pickerId} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      {selected && !open ? (
        <button
          id={pickerId}
          ref={triggerRef}
          type="button"
          aria-label={`${label}: ${selected.name}. Change athlete`}
          onClick={() => {
            setQuery("");
            setActiveIndex(0);
            setOpen(true);
          }}
          className="flex w-full items-center gap-3 rounded-lg border border-line bg-card p-2.5 text-left transition-colors hover:border-ink-faint"
        >
          <AthletePhoto athlete={selected} className="h-11 w-11 shrink-0 rounded-md" sizes="44px" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-bold">{selected.name}</span>
            <span className="block truncate text-xs text-ink-soft">
              <span aria-hidden>{flagEmoji(selected.country)}</span> {selected.league} ·{" "}
              {formatHeight(selected.heightCm, system)}
            </span>
          </span>
          <span className="text-xs font-semibold text-ink-soft">Change</span>
        </button>
      ) : (
        <input
          id={pickerId}
          ref={inputRef}
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={
            open && focusedIndex >= 0 ? `${listId}-${focusedIndex}` : undefined
          }
          autoComplete="off"
          value={query}
          placeholder="Search name, league or country…"
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((index) => {
                if (!open || matches.length === 0) return 0;
                return (
                  (index + (event.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length
                );
              });
            } else if (event.key === "Enter" && open && focusedIndex >= 0) {
              event.preventDefault();
              choose(matches[focusedIndex].id);
            } else if (open && (event.key === "Home" || event.key === "End")) {
              event.preventDefault();
              setActiveIndex(event.key === "Home" ? 0 : Math.max(0, matches.length - 1));
            } else if (event.key === "Escape") {
              event.preventDefault();
              restoreFocus.current = Boolean(selected);
              setOpen(false);
            }
          }}
          className="min-h-11 w-full rounded-lg border border-line bg-card px-3 py-3 text-base outline-none transition-colors focus:border-ink sm:text-sm"
        />
      )}
      {selected && !open && (
        <div className="mt-1">
          <WikiCredit athlete={selected} />
        </div>
      )}
      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute z-20 mt-1 max-h-[min(20rem,45dvh)] w-full overflow-auto overscroll-contain rounded-lg border border-line bg-card shadow-lift"
        >
          {matches.length === 0 && (
            <li role="presentation" className="px-3 py-3 text-sm text-ink-soft">
              No athletes found for “{query}”.
            </li>
          )}
          {matches.map((x, index) => (
            <li
              key={x.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === focusedIndex}
              onMouseDown={(event) => event.preventDefault()}
              onMouseMove={() => setActiveIndex(index)}
              onClick={() => choose(x.id)}
              className={`flex min-h-11 w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left transition-colors ${index === focusedIndex ? "bg-paper" : "hover:bg-paper"}`}
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
            </li>
          ))}
        </ul>
      )}
      <p role="status" className="sr-only">
        {open &&
          (matches.length
            ? `${matches.length} suggestions available. Use the arrow keys to choose an athlete and Enter to select.`
            : `No athletes found for ${query}.`)}
      </p>
    </div>
  );
}
