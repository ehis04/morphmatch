export type Sport = "football" | "basketball" | "tennis" | "swimming";

export type Gender = "m" | "f";

/** Physical stats used everywhere: user input, athletes, comparisons. */
export interface BodyStats {
  heightCm: number;
  weightKg: number;
  /** Fingertip-to-fingertip, arms horizontal. */
  wingspanCm: number;
  gender: Gender;
}

/** How an athlete is stored in the seed data files (before enrichment). */
export interface RawAthlete {
  id: string;
  name: string;
  sport: Sport;
  gender: Gender;
  /** ISO 3166-1 alpha-2 country code. */
  country: string;
  /** Primary league / tour, current or the one they are known for. */
  league: string;
  /** Position, stroke, or playing style. Optional. */
  position?: string;
  heightCm: number;
  weightKg: number;
  /**
   * Only present when a published/measured figure exists (e.g. NBA combine).
   * When absent, a sport-typical estimate is derived at load time.
   */
  wingspanCm?: number;
  /** Birth year, used for era context. */
  born: number;
  active: boolean;
  /** English Wikipedia article slug, for the freely licensed photo lookup. */
  wiki: string;
}

/** Fully enriched athlete as used by the app. */
export interface Athlete extends RawAthlete {
  wingspanCm: number;
  wingspanEstimated: boolean;
}

export interface MatchFilters {
  sports: Sport[];
  genders: Gender[];
  leagues: string[];
  countries: string[];
  /** "all" | "active" | "retired" */
  era: "all" | "active" | "retired";
}

export interface StatDelta {
  /** athlete value minus user value, in cm/kg */
  height: number;
  weight: number;
  wingspan: number;
  apeIndex: number;
}

export interface MatchResult {
  athlete: Athlete;
  /** 0–100 similarity score. */
  score: number;
  delta: StatDelta;
}

/** A comparison subject: either the user's custom stats or a pro athlete. */
export type Subject =
  { kind: "custom"; label: string; stats: BodyStats } | { kind: "athlete"; athleteId: string };

export interface SavedComp {
  id: string;
  title: string;
  subject: Subject;
  target_athlete_id: string;
  mode: string;
  created_at: string;
}

export const DEFAULT_FILTERS: MatchFilters = {
  sports: [],
  genders: [],
  leagues: [],
  countries: [],
  era: "all",
};

export const SPORT_LABELS: Record<Sport, string> = {
  football: "Football",
  basketball: "Basketball",
  tennis: "Tennis",
  swimming: "Swimming",
};

/** Sport-typical wingspan-to-height ratios, used only when no measured figure exists. */
export const WINGSPAN_FACTORS: Record<Sport, number> = {
  football: 1.02,
  basketball: 1.06,
  tennis: 1.02,
  swimming: 1.045,
};
