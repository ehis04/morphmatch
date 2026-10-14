import type { Athlete, BodyStats, MatchFilters, MatchResult, StatDelta } from "./types";

/**
 * Similarity scoring
 * ------------------
 * Each attribute contributes a component score in [0, 1] based on how far the
 * athlete is from the user, relative to a "full penalty" range chosen so that
 * differences a person would describe as "completely different build" score 0.
 *
 *   height:   ±16 cm range   — 5 cm off still feels like a body double
 *   weight:   ±20 kg range   — listed weights vary by source, so forgiving
 *   wingspan: ±16 cm range
 *   ape index (wingspan − height): ±10 cm — captures limb proportions,
 *             so two people of different absolute size but the same shape
 *             still register as similar builds.
 *
 * Components are combined with weights that sum to 1. When the user has not
 * provided a wingspan, the wingspan and ape-index components are dropped and
 * the remaining weights are renormalised.
 */

const RANGES = { height: 16, weight: 20, wingspan: 16, ape: 10 };
const WEIGHTS = { height: 0.38, weight: 0.27, wingspan: 0.23, ape: 0.12 };

function component(diff: number, range: number): number {
  return Math.max(0, 1 - Math.abs(diff) / range);
}

export function scoreAthlete(user: BodyStats, athlete: Athlete, hasWingspan: boolean): MatchResult {
  if (!validStats(user) || !validStats(athlete)) {
    throw new RangeError("Cannot compare invalid measurements");
  }
  const differences: StatDelta = {
    height: athlete.heightCm - user.heightCm,
    weight: athlete.weightKg - user.weightKg,
    wingspan: athlete.wingspanCm - user.wingspanCm,
    apeIndex: athlete.wingspanCm - athlete.heightCm - (user.wingspanCm - user.heightCm),
  };
  const delta: StatDelta = {
    height: round1(differences.height),
    weight: round1(differences.weight),
    wingspan: round1(differences.wingspan),
    apeIndex: round1(differences.apeIndex),
  };

  let score: number;
  if (hasWingspan) {
    score =
      WEIGHTS.height * component(differences.height, RANGES.height) +
      WEIGHTS.weight * component(differences.weight, RANGES.weight) +
      WEIGHTS.wingspan * component(differences.wingspan, RANGES.wingspan) +
      WEIGHTS.ape * component(differences.apeIndex, RANGES.ape);
  } else {
    const h = WEIGHTS.height / (WEIGHTS.height + WEIGHTS.weight);
    const w = WEIGHTS.weight / (WEIGHTS.height + WEIGHTS.weight);
    score =
      h * component(differences.height, RANGES.height) +
      w * component(differences.weight, RANGES.weight);
  }

  return { athlete, score: Math.round(score * 1000) / 10, delta };
}

export function applyFilters(athletes: Athlete[], filters: MatchFilters): Athlete[] {
  return athletes.filter((a) => {
    if (filters.sports.length > 0 && !filters.sports.includes(a.sport)) return false;
    if (filters.genders.length > 0 && !filters.genders.includes(a.gender)) return false;
    if (filters.leagues.length > 0 && !filters.leagues.includes(a.league)) return false;
    if (filters.countries.length > 0 && !filters.countries.includes(a.country)) return false;
    if (filters.era === "active" && !a.active) return false;
    if (filters.era === "retired" && a.active) return false;
    return true;
  });
}

export interface FindMatchesOptions {
  /** Whether the user actually entered a wingspan (vs. the derived default). */
  userProvidedWingspan: boolean;
  limit?: number;
}

export function findMatches(
  user: BodyStats,
  athletes: Athlete[],
  filters: MatchFilters,
  opts: FindMatchesOptions
): MatchResult[] {
  if (!validStats(user)) return [];
  const pool = applyFilters(athletes, filters);
  const results = pool.map((a) => scoreAthlete(user, a, opts.userProvidedWingspan));
  results.sort((a, b) => b.score - a.score || a.athlete.name.localeCompare(b.athlete.name));
  return opts.limit == null ? results : results.slice(0, Math.max(0, Math.floor(opts.limit)));
}

/** Selections and links must never bypass the current matching filters. */
export function selectMatchTarget(
  results: MatchResult[],
  selectedId: string | null,
  pinnedId: string | null
): MatchResult | null {
  return (
    results.find((result) => result.athlete.id === selectedId) ??
    results.find((result) => result.athlete.id === pinnedId) ??
    results[0] ??
    null
  );
}

/**
 * "Surprise me": pick a random athlete from the strongest matches, weighted
 * towards (but not fixed to) the top, so repeated rolls stay interesting.
 */
export function surpriseMatch(results: MatchResult[], excludeId?: string): MatchResult | null {
  const pool = results.filter((r) => r.athlete.id !== excludeId).slice(0, 12);
  if (pool.length === 0) return null;
  // Quadratic falloff: in a pool of 12, rank 0 is 144x as likely as rank 11.
  const weights = pool.map((_, i) => (pool.length - i) ** 2);
  const total = weights.reduce((s, w) => s + w, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

export function matchTier(score: number): {
  label: string;
  tone: "twin" | "close" | "similar" | "loose";
} {
  if (score >= 92) return { label: "Body double", tone: "twin" };
  if (score >= 84) return { label: "Close match", tone: "close" };
  if (score >= 72) return { label: "Similar build", tone: "similar" };
  return { label: "Loose match", tone: "loose" };
}

/** Default wingspan assumption when the user leaves it blank: equal to height. */
export function defaultWingspan(heightCm: number): number {
  return heightCm;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function validStats(stats: BodyStats): boolean {
  return (
    Number.isFinite(stats.heightCm) &&
    stats.heightCm > 0 &&
    Number.isFinite(stats.weightKg) &&
    stats.weightKg > 0 &&
    Number.isFinite(stats.wingspanCm) &&
    stats.wingspanCm > 0
  );
}
