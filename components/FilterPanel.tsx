"use client";

import { useMemo } from "react";
import { countriesFor, leaguesFor } from "@/data";
import { countryName, flagEmoji } from "@/lib/countries";
import { SPORT_COLOR } from "@/lib/sport";
import {
  DEFAULT_FILTERS,
  SPORT_LABELS,
  type Gender,
  type MatchFilters,
  type Sport,
} from "@/lib/types";

const ALL_SPORTS: Sport[] = ["football", "basketball", "tennis", "swimming"];

interface FilterPanelProps {
  filters: MatchFilters;
  onChange: (f: MatchFilters) => void;
}

export function activeFilterCount(f: MatchFilters): number {
  return (
    f.sports.length +
    f.genders.length +
    f.leagues.length +
    f.countries.length +
    (f.era !== "all" ? 1 : 0)
  );
}

export function FilterPanel({ filters, onChange }: FilterPanelProps) {
  const leagues = useMemo(() => leaguesFor(filters.sports), [filters.sports]);
  const countries = useMemo(() => countriesFor(filters.sports), [filters.sports]);
  const count = activeFilterCount(filters);

  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Filter the pros</span>
        {count > 0 && (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="text-xs font-semibold text-ink-soft underline-offset-2 hover:underline"
          >
            Reset ({count})
          </button>
        )}
      </div>

      {/* Sports */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sports">
        {ALL_SPORTS.map((sport) => {
          const on = filters.sports.includes(sport);
          return (
            <button
              key={sport}
              type="button"
              aria-pressed={on}
              onClick={() =>
                onChange({ ...filters, sports: toggle(filters.sports, sport), leagues: [] })
              }
              className={`rounded-full border px-3 py-1 text-sm font-semibold transition-colors ${
                on
                  ? "border-transparent text-white"
                  : "border-line bg-card text-ink-soft hover:border-ink-faint"
              }`}
              style={on ? { backgroundColor: SPORT_COLOR[sport] } : undefined}
            >
              {SPORT_LABELS[sport]}
            </button>
          );
        })}
      </div>

      {/* Gender + era */}
      <div className="grid grid-cols-2 gap-3">
        <Segmented
          label="Gender"
          options={[
            ["", "All"],
            ["m", "Men"],
            ["f", "Women"],
          ]}
          value={filters.genders.length === 1 ? filters.genders[0] : ""}
          onChange={(v) => onChange({ ...filters, genders: v === "" ? [] : [v as Gender] })}
        />
        <Segmented
          label="Era"
          options={[
            ["all", "All"],
            ["active", "Active"],
            ["retired", "Retired"],
          ]}
          value={filters.era}
          onChange={(v) => onChange({ ...filters, era: v as MatchFilters["era"] })}
        />
      </div>

      {/* League */}
      <div>
        <label htmlFor="league-select" className="mb-1.5 block text-xs font-semibold text-ink-soft">
          League / tour
        </label>
        <select
          id="league-select"
          value={filters.leagues[0] ?? ""}
          onChange={(e) =>
            onChange({ ...filters, leagues: e.target.value ? [e.target.value] : [] })
          }
          className="w-full rounded-md border border-line bg-card px-3 py-2 text-sm outline-none transition-colors focus:border-ink"
        >
          <option value="">Any league</option>
          {leagues.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {/* Country */}
      <div>
        <label
          htmlFor="country-select"
          className="mb-1.5 block text-xs font-semibold text-ink-soft"
        >
          Country
        </label>
        <select
          id="country-select"
          value={filters.countries[0] ?? ""}
          onChange={(e) =>
            onChange({ ...filters, countries: e.target.value ? [e.target.value] : [] })
          }
          className="w-full rounded-md border border-line bg-card px-3 py-2 text-sm outline-none transition-colors focus:border-ink"
        >
          <option value="">Any country</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {flagEmoji(c)} {countryName(c)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function Segmented({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: [string, string][];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-semibold text-ink-soft">{label}</span>
      <div
        className="flex rounded-md border border-line bg-card p-0.5"
        role="group"
        aria-label={label}
      >
        {options.map(([v, text]) => (
          <button
            key={v}
            type="button"
            aria-pressed={value === v}
            onClick={() => onChange(v)}
            className={`flex-1 rounded px-1.5 py-1 text-xs font-semibold transition-colors ${
              value === v ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
