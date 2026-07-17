import type { Athlete, RawAthlete, Sport } from "@/lib/types";
import { WINGSPAN_FACTORS } from "@/lib/types";
import { football } from "./football";
import { basketball } from "./basketball";
import { tennis } from "./tennis";
import { swimming } from "./swimming";

function enrich(raw: RawAthlete): Athlete {
  if (raw.wingspanCm != null) {
    return { ...raw, wingspanCm: raw.wingspanCm, wingspanEstimated: false };
  }
  return {
    ...raw,
    wingspanCm: Math.round(raw.heightCm * WINGSPAN_FACTORS[raw.sport]),
    wingspanEstimated: true,
  };
}

/** The full, enriched athlete database. */
export const ATHLETES: Athlete[] = [...football, ...basketball, ...tennis, ...swimming].map(enrich);

const byId = new Map(ATHLETES.map((a) => [a.id, a]));

export function getAthlete(id: string): Athlete | undefined {
  return byId.get(id);
}

export function athleteCount(sport?: Sport): number {
  if (!sport) return ATHLETES.length;
  return ATHLETES.filter((a) => a.sport === sport).length;
}

/** Unique leagues, optionally narrowed to given sports, sorted by frequency. */
export function leaguesFor(sports: Sport[]): string[] {
  const pool = sports.length > 0 ? ATHLETES.filter((a) => sports.includes(a.sport)) : ATHLETES;
  const counts = new Map<string, number>();
  for (const a of pool) counts.set(a.league, (counts.get(a.league) ?? 0) + 1);
  return [...counts.entries()].sort((x, y) => y[1] - x[1]).map(([league]) => league);
}

/** Unique country codes present in the (optionally sport-narrowed) pool. */
export function countriesFor(sports: Sport[]): string[] {
  const pool = sports.length > 0 ? ATHLETES.filter((a) => sports.includes(a.sport)) : ATHLETES;
  return [...new Set(pool.map((a) => a.country))].sort();
}
