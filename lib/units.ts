export type UnitSystem = "metric" | "imperial";

const CM_PER_INCH = 2.54;
const KG_PER_LB = 0.45359237;

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / CM_PER_INCH;
  let feet = Math.floor(totalInches / 12);
  let inches = Math.round(totalInches - feet * 12);
  if (inches === 12) {
    feet += 1;
    inches = 0;
  }
  return { feet, inches };
}

export function feetInchesToCm(feet: number, inches: number): number {
  return Math.round((feet * 12 + inches) * CM_PER_INCH * 10) / 10;
}

export function kgToLbs(kg: number): number {
  return Math.round(kg / KG_PER_LB);
}

export function lbsToKg(lbs: number): number {
  return Math.round(lbs * KG_PER_LB * 10) / 10;
}

/** "185 cm" or "6′1″" */
export function formatHeight(cm: number, system: UnitSystem): string {
  if (system === "metric") return `${Math.round(cm)} cm`;
  const { feet, inches } = cmToFeetInches(cm);
  return `${feet}′${inches}″`;
}

/** "82 kg" or "181 lb" */
export function formatWeight(kg: number, system: UnitSystem): string {
  if (system === "metric") return `${Math.round(kg)} kg`;
  return `${kgToLbs(kg)} lb`;
}

/** Length delta such as "+4 cm" / "−1.5 in" */
export function formatLengthDelta(cm: number, system: UnitSystem): string {
  const sign = cm > 0 ? "+" : cm < 0 ? "−" : "±";
  const abs = Math.abs(cm);
  if (system === "metric") return `${sign}${round1(abs)} cm`;
  return `${sign}${round1(abs / CM_PER_INCH)} in`;
}

export function formatWeightDelta(kg: number, system: UnitSystem): string {
  const sign = kg > 0 ? "+" : kg < 0 ? "−" : "±";
  const abs = Math.abs(kg);
  if (system === "metric") return `${sign}${round1(abs)} kg`;
  return `${sign}${Math.round(abs / KG_PER_LB)} lb`;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
