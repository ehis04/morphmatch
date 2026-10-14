"use client";

import { useSearchParams } from "next/navigation";
import { useDeferredValue, useMemo, useState } from "react";
import { ATHLETES } from "@/data";
import { applyFilters } from "@/lib/similarity";
import { countryName } from "@/lib/countries";
import { normalizeSearch } from "@/lib/search";
import { DEFAULT_FILTERS, type MatchFilters, type Sport } from "@/lib/types";
import { AthleteCard } from "./AthleteCard";
import { FilterPanel } from "./FilterPanel";
import { useUnits } from "./UnitsProvider";

const PAGE = 24;
const SPORTS: Sport[] = ["football", "basketball", "tennis", "swimming"];

export function AthleteBrowser() {
  const params = useSearchParams();
  const value = params.get("sport");
  const sport = value && SPORTS.includes(value as Sport) ? (value as Sport) : null;
  return <BrowserContent key={sport ?? "all"} initialSport={sport} />;
}

function BrowserContent({ initialSport }: { initialSport: Sport | null }) {
  const { system } = useUnits();

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [filters, setFilters] = useState<MatchFilters>(() => ({
    ...DEFAULT_FILTERS,
    sports: initialSport ? [initialSport] : [],
  }));
  const [limit, setLimit] = useState(PAGE);
  const [sort, setSort] = useState<"name" | "height" | "weight" | "wingspan">("name");

  const athletes = useMemo(() => {
    const q = normalizeSearch(deferredQuery);
    let pool = applyFilters(ATHLETES, filters);
    if (q) {
      pool = pool.filter(
        (a) =>
          normalizeSearch(a.name).includes(q) ||
          normalizeSearch(a.league).includes(q) ||
          normalizeSearch(countryName(a.country)).includes(q) ||
          normalizeSearch(a.position ?? "").includes(q)
      );
    }
    const sorted = [...pool];
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "height") sorted.sort((a, b) => b.heightCm - a.heightCm);
    if (sort === "weight") sorted.sort((a, b) => b.weightKg - a.weightKg);
    if (sort === "wingspan") sorted.sort((a, b) => b.wingspanCm - a.wingspanCm);
    return sorted;
  }, [deferredQuery, filters, sort]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">The athlete wall</h1>
        <p className="mt-1 text-ink-soft">
          All {ATHLETES.length} pros in the database. Search, filter, and send anyone to a
          comparison.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-6 lg:sticky lg:top-20 lg:self-start">
          <section className="rounded-lg border border-line bg-card p-4 shadow-card">
            <label htmlFor="athlete-search" className="mb-1.5 block text-sm font-semibold">
              Search
            </label>
            <input
              id="athlete-search"
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setLimit(PAGE);
              }}
              placeholder="Name, league, country, position…"
              className="min-h-11 w-full rounded-md border border-line bg-card px-3 py-2 text-base outline-none transition-colors focus:border-ink sm:text-sm"
            />
            <label htmlFor="athlete-sort" className="mb-1.5 mt-4 block text-sm font-semibold">
              Sort by
            </label>
            <select
              id="athlete-sort"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as typeof sort);
                setLimit(PAGE);
              }}
              className="min-h-11 w-full rounded-md border border-line bg-card px-3 py-2 text-base outline-none transition-colors focus:border-ink sm:text-sm"
            >
              <option value="name">Name (A–Z)</option>
              <option value="height">Tallest first</option>
              <option value="weight">Heaviest first</option>
              <option value="wingspan">Longest wingspan first</option>
            </select>
          </section>
          <section className="rounded-lg border border-line bg-card p-4 shadow-card">
            <FilterPanel
              filters={filters}
              onChange={(f) => {
                setFilters(f);
                setLimit(PAGE);
              }}
            />
          </section>
        </aside>

        <div className="min-w-0">
          <p role="status" className="mb-3 font-mono text-sm text-ink-faint">
            Showing {Math.min(limit, athletes.length)} of {athletes.length} athlete
            {athletes.length === 1 ? "" : "s"}
          </p>
          {athletes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line-strong bg-card p-10 text-center">
              <p className="font-display text-xl font-bold">Nobody on the wall matches</p>
              <p className="mt-2 text-sm text-ink-soft">
                Clear the search or widen the filters to bring the athletes back.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setFilters(DEFAULT_FILTERS);
                  setLimit(PAGE);
                }}
                className="mt-4 min-h-11 rounded-md bg-ink px-4 py-2 text-sm font-bold text-paper"
              >
                Reset search and filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 md:grid-cols-3">
                {athletes.slice(0, limit).map((a) => (
                  <AthleteCard key={a.id} athlete={a} system={system} />
                ))}
              </div>
              {athletes.length > limit && (
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => setLimit((l) => l + PAGE)}
                    className="rounded-md border-2 border-ink px-5 py-2.5 font-bold transition-colors hover:bg-ink hover:text-paper"
                  >
                    Show more ({athletes.length - limit} left)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
