import { ATHLETES } from "../data";
import { buildFigure } from "../lib/silhouette";
import { findMatches, scoreAthlete } from "../lib/similarity";
import { DEFAULT_FILTERS } from "../lib/types";

// 1. Data integrity
const ids = new Set<string>();
let errors = 0;
for (const a of ATHLETES) {
  if (ids.has(a.id)) {
    console.error("DUPLICATE ID:", a.id);
    errors++;
  }
  ids.add(a.id);
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a.id) ||
    !a.name.trim() ||
    !a.league.trim() ||
    !a.wiki.trim()
  ) {
    console.error("INVALID ATHLETE METADATA:", a.id);
    errors++;
  }
  if (!/^[A-Z]{2}$/.test(a.country)) {
    console.error("BAD COUNTRY:", a.id, a.country);
    errors++;
  }
  if (!Number.isFinite(a.heightCm) || a.heightCm < 150 || a.heightCm > 235) {
    console.error("SUSPECT HEIGHT:", a.id, a.heightCm);
    errors++;
  }
  if (!Number.isFinite(a.weightKg) || a.weightKg < 45 || a.weightKg > 150) {
    console.error("SUSPECT WEIGHT:", a.id, a.weightKg);
    errors++;
  }
  if (
    !Number.isFinite(a.wingspanCm) ||
    a.wingspanCm < a.heightCm * 0.92 ||
    a.wingspanCm > a.heightCm * 1.15
  ) {
    console.error("SUSPECT WINGSPAN:", a.id, a.wingspanCm);
    errors++;
  }
}
const bySport: Record<string, number> = {};
for (const a of ATHLETES) bySport[a.sport] = (bySport[a.sport] ?? 0) + 1;
console.log("Total:", ATHLETES.length, bySport);
console.log(
  "Women:",
  ATHLETES.filter((a) => a.gender === "f").length,
  "| Measured wingspans:",
  ATHLETES.filter((a) => !a.wingspanEstimated).length
);

// 2. Geometry sanity: no NaN in any figure
for (const a of ATHLETES) {
  const fig = buildFigure(a);
  const json = JSON.stringify(fig);
  if (json.includes("NaN") || json.includes("Infinity") || /:\s*null\b/.test(json)) {
    console.error("GEOMETRY NaN:", a.id);
    errors++;
  }
}

// 3. Engine spot check: the user's canonical example
const me = { heightCm: 183, weightKg: 85, wingspanCm: 183, gender: "m" as const };
const top = findMatches(me, ATHLETES, DEFAULT_FILTERS, { userProvidedWingspan: false, limit: 5 });
console.log("183cm/85kg top 5:", top.map((r) => `${r.athlete.name} ${r.score}`).join(" | "));
const rashford = ATHLETES.find((a) => a.id === "marcus-rashford")!;
console.log(
  "vs Rashford (185/70):",
  scoreAthlete({ heightCm: 185, weightKg: 70, wingspanCm: 185, gender: "m" }, rashford, false).score
);

if (errors) {
  console.error(errors, "ERRORS");
  process.exit(1);
}
console.log("SMOKE OK");
