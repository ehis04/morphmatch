import { getAthlete } from "@/data";
import type { Athlete } from "./types";

export type ComparisonMode = "overlay" | "side" | "table";

export function parseComparisonMode(value: string | null): ComparisonMode {
  return value === "side" || value === "table" ? value : "overlay";
}

export function readVersusSelection(params: Pick<URLSearchParams, "get">): {
  a?: Athlete;
  b?: Athlete;
  mode: ComparisonMode;
  invalid: boolean;
} {
  const aId = params.get("a");
  const bId = params.get("b");
  const a = aId ? getAthlete(aId) : undefined;
  const b = bId ? getAthlete(bId) : undefined;
  return {
    a,
    b,
    mode: parseComparisonMode(params.get("mode")),
    invalid: Boolean((aId && !a) || (bId && !b)),
  };
}

/** Preserve other query parameters when changing a shared comparison. */
export function versusHref(
  current: string,
  changes: Partial<Record<"a" | "b" | "mode", string | null>>
): string {
  const params = new URLSearchParams(current);
  for (const [key, value] of Object.entries(changes)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  return `/versus${params.size ? `?${params}` : ""}`;
}
