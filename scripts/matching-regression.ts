import assert from "node:assert/strict";
import { ATHLETES } from "../data";
import {
  DEFAULT_PROFILE,
  getProfileErrors,
  parseStoredProfile,
  validateProfile,
} from "../lib/profile-validation";
import {
  applyFilters,
  findMatches,
  scoreAthlete,
  selectMatchTarget,
  surpriseMatch,
} from "../lib/similarity";
import { DEFAULT_FILTERS, type BodyStats, type MatchFilters } from "../lib/types";
import {
  cmToFeetInches,
  feetInchesToCm,
  formatWeight,
  kgToLbs,
  lbsToKg,
  parseImperialLength,
} from "../lib/units";

// Persisted data is an input boundary, including valid JSON with the wrong shape.
for (const raw of [
  null,
  "{",
  "null",
  "[]",
  '"hello"',
  "123",
  "{}",
  '{"heightCm":"178","weightKg":75,"gender":"m"}',
  '{"heightCm":178,"weightKg":null,"gender":"m"}',
  '{"heightCm":178,"weightKg":75,"gender":"x"}',
  '{"heightCm":10000,"weightKg":75,"gender":"m"}',
  '{"heightCm":178,"weightKg":75,"gender":"m","wingspanCm":0}',
]) {
  assert.deepEqual(parseStoredProfile(raw), DEFAULT_PROFILE, `Unexpected stored profile: ${raw}`);
}
const stored = { heightCm: 183.5, weightKg: 80.25, gender: "f" as const, wingspanCm: 190.5 };
assert.deepEqual(parseStoredProfile(JSON.stringify({ ...stored, unknown: "ignored" })), stored);
assert.equal(validateProfile(DEFAULT_PROFILE), null);
assert.equal(validateProfile({ ...DEFAULT_PROFILE, heightCm: Number.NaN }), "Enter your height");
assert.equal(
  validateProfile({ ...DEFAULT_PROFILE, weightKg: Number.POSITIVE_INFINITY }),
  "Enter your weight"
);
assert.notEqual(validateProfile({ ...DEFAULT_PROFILE, wingspanCm: Number.NaN }), null);
assert.equal(validateProfile({ heightCm: 120, weightKg: 30, wingspanCm: 260, gender: "f" }), null);
assert.notEqual(validateProfile({ ...DEFAULT_PROFILE, weightKg: 200.01 }), null);
assert.deepEqual(getProfileErrors(DEFAULT_PROFILE), {});
const fieldErrors = getProfileErrors({
  ...DEFAULT_PROFILE,
  heightCm: Number.NaN,
  weightKg: 20,
  wingspanCm: 270,
});
assert.equal(fieldErrors.heightCm, "Enter your height");
assert.match(fieldErrors.weightKg ?? "", /Weight must be at least/);
assert.match(fieldErrors.wingspanCm ?? "", /Wingspan must be at most/);
assert.equal(fieldErrors.gender, undefined);

// Imperial drafts cannot silently use stale feet, normalize 12 inches, or treat an empty field as zero.
for (const [feet, inches] of [
  ["", "1"],
  ["6", ""],
  ["5.5", "3"],
  ["6", "12"],
  ["6", "-1"],
  ["Infinity", "0"],
  ["6", "NaN"],
]) {
  assert.ok(
    Number.isNaN(parseImperialLength(feet, inches)),
    `Invalid draft accepted: ${feet}/${inches}`
  );
}
assert.equal(parseImperialLength("6", "1.5"), feetInchesToCm(6, 1.5));
assert.equal(
  validateProfile({ ...DEFAULT_PROFILE, wingspanCm: parseImperialLength("8", "6") }),
  null
);
assert.deepEqual(cmToFeetInches(182.8), { feet: 6, inches: 0 });
assert.ok(Math.abs(lbsToKg(150.5) - 150.5 * 0.45359237) < 1e-10);
assert.equal(kgToLbs(75), 165.3);
assert.equal(formatWeight(75, "imperial"), "165 lb");

// Scores are bounded; matching someone's canonical stats must produce 100.
for (const athlete of ATHLETES) {
  assert.equal(scoreAthlete(athlete, athlete, true).score, 100, athlete.id);
}
const user: BodyStats = { heightCm: 183, weightKg: 85, wingspanCm: 183, gender: "m" };
const all = findMatches(user, ATHLETES, DEFAULT_FILTERS, { userProvidedWingspan: false });
assert.equal(all.length, ATHLETES.length);
assert.ok(
  all.every((result) => Number.isFinite(result.score) && result.score >= 0 && result.score <= 100)
);
assert.ok(all.every((result, index) => index === 0 || result.score <= all[index - 1].score));
assert.deepEqual(
  findMatches({ ...user, heightCm: Number.NaN }, ATHLETES, DEFAULT_FILTERS, {
    userProvidedWingspan: false,
  }),
  []
);
assert.throws(
  () => scoreAthlete({ ...user, weightKg: Number.NaN }, ATHLETES[0], false),
  RangeError
);
assert.equal(
  findMatches(user, ATHLETES, DEFAULT_FILTERS, { userProvidedWingspan: false, limit: 0 }).length,
  0
);
assert.equal(
  findMatches(user, ATHLETES, DEFAULT_FILTERS, { userProvidedWingspan: false, limit: -1 }).length,
  0
);
assert.equal(
  findMatches(user, ATHLETES, DEFAULT_FILTERS, { userProvidedWingspan: false, limit: 3 }).length,
  3
);
const athlete = ATHLETES[0];
assert.equal(
  scoreAthlete(user, athlete, false).score,
  scoreAthlete({ ...user, wingspanCm: 250 }, athlete, false).score
);
assert.notEqual(
  scoreAthlete(user, athlete, true).score,
  scoreAthlete({ ...user, wingspanCm: 250 }, athlete, true).score
);
const decimalUser = {
  ...athlete,
  heightCm: athlete.heightCm - 0.049,
  weightKg: athlete.weightKg - 0.049,
};
assert.ok(
  scoreAthlete(decimalUser, athlete, false).score < 100,
  "Displayed delta rounding must not inflate the score"
);

// Every filter combines with the others, and a pin or selection cannot bypass the current pool.
const filters: MatchFilters = {
  sports: [athlete.sport],
  genders: [athlete.gender],
  leagues: [athlete.league],
  countries: [athlete.country],
  era: athlete.active ? "active" : "retired",
};
const pool = applyFilters(ATHLETES, filters);
assert.ok(pool.length > 0);
assert.ok(
  pool.every(
    (a) =>
      a.sport === athlete.sport &&
      a.gender === athlete.gender &&
      a.league === athlete.league &&
      a.country === athlete.country &&
      a.active === athlete.active
  )
);
assert.equal(applyFilters(ATHLETES, { ...DEFAULT_FILTERS, countries: ["XX"] }).length, 0);
const results = findMatches(user, ATHLETES, filters, { userProvidedWingspan: false });
assert.equal(selectMatchTarget(results, athlete.id, null)?.athlete.id, athlete.id);
assert.equal(selectMatchTarget(results, "missing", "missing"), results[0]);
assert.equal(selectMatchTarget([], athlete.id, athlete.id), null);
const excluded = ATHLETES.find((a) => !pool.some((p) => p.id === a.id));
assert.ok(excluded);
assert.equal(selectMatchTarget(results, excluded.id, excluded.id), results[0]);
assert.equal(surpriseMatch([], athlete.id), null);
assert.equal(surpriseMatch([results[0]], results[0].athlete.id), null);
for (let index = 0; index < 50; index++) {
  const pick = surpriseMatch(all, all[0].athlete.id);
  assert.ok(pick && pick.athlete.id !== all[0].athlete.id);
  assert.ok(all.slice(1, 13).includes(pick));
}

console.log(
  "MATCHING REGRESSION OK: storage validation, input ranges, unit conversion, scoring, filters and selection"
);
