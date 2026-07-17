import type { Sport } from "./types";

/** CSS color tokens per sport, used for pro silhouettes, chips and accents. */
export const SPORT_COLOR: Record<Sport, string> = {
  football: "var(--color-pitch)",
  basketball: "var(--color-court)",
  tennis: "var(--color-clay)",
  swimming: "var(--color-pool)",
};

export const SPORT_ICON: Record<Sport, string> = {
  football: "⚽",
  basketball: "🏀",
  tennis: "🎾",
  swimming: "🏊",
};
