"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ATHLETES } from "@/data";
import { applyFilters } from "@/lib/similarity";
import { countryName } from "@/lib/countries";
import { DEFAULT_FILTERS, type MatchFilters, type Sport } from "@/lib/types";
import { AthleteCard } from "./AthleteCard";
import { FilterPanel } from "./FilterPanel";
import { useUnits } from "./UnitsProvider";

const PAGE = 24;
const SPORTS: Sport[] = ["football", "basketball", "tennis", "swimming"];

export function AthleteBrowser() {
  const { system } = useUnits();
  const params = useSearchParams();
  const sportParam = params.get("sport") as Sport | null;

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<MatchFilters>(() => ({
    ...DEFAULT_FILTERS,
    sports: sportParam && SPORTS.includes(sportParam) ? [sportParam] : [],
  }));
  const [limit, setLimit] = useState(PAGE);
  const [sort, setSort] = useState<"name" | "height" | "weight" | "wingspan">("name");

  const athletes = useMemo(() => {
    const q = query.trim().toLowerCase();
    let pool = applyFilters(ATHLETES, filters);
    if (q) {
      pool = pool.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.league.toLowerCase().includes(q) ||
          countryName(a.country).toLowerCase().includes(q) ||
          (a.position ?? "").toLowerCase().includes(q)
      );
    }
    const sorted = [...pool];
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "height") sorted.sort((a, b) => b.heightCm - a.heightCm);
    if (sort === "weight") sorted.sort((a, b) => b.weightKg - a.weightKg);
    if (sort === "wingspan") sorted.sort((a, b) => b.wingspanCm - a.wingspanCm);
    return sorted;
  }, [query, filters, sort]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">The athlete wall</h1>
        <p className="mt-1 text-ink-soft">
          All {ATHLETES.length} pros in the database. Search, filter, and send anyone to a
          comparison.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
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
              className="w-full rounded-md border border-line bg-card px-3 py-2 text-sm outline-none transition-colors focus:border-ink"
            />
            <label htmlFor="athlete-sort" className="mb-1.5 mt-4 block text-sm font-semibold">
              Sort by
            </label>
            <select
              id="athlete-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="w-full rounded-md border border-line bg-card px-3 py-2 text-sm outline-none transition-colors focus:border-ink"
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
          {athletes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line-strong bg-card p-10 text-center">
              <p className="font-display text-xl font-bold">Nobody on the wall matches</p>
              <p className="mt-2 text-sm text-ink-soft">
                Clear the search or widen the filters to bring the athletes back.
              </p>
            </div>
          ) : (
            <>
              <p className="mb-3 font-mono text-sm text-ink-faint">
                {athletes.length} athlete{athletes.length === 1 ? "" : "s"}
              </p>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
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
