import { getAthlete } from "@/data";
import { versusHref, type ComparisonMode } from "./comparison";

/** A public comparison link contains only athlete IDs and its display mode. */
export function publicComparisonHref(aId: string, bId: string, mode: ComparisonMode): string {
  if (!getAthlete(aId) || !getAthlete(bId)) throw new Error("Choose two athletes before sharing.");
  return versusHref("", { a: aId, b: bId, mode });
}
