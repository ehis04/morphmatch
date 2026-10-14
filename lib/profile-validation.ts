import { z } from "zod";
import type { BodyStats } from "./types";

export interface Profile extends Omit<BodyStats, "wingspanCm"> {
  /** Undefined when the user hasn't entered one. */
  wingspanCm?: number;
}

export const DEFAULT_PROFILE: Profile = { heightCm: 178, weightKg: 75, gender: "m" };

const profileSchema = z.object({
  heightCm: z
    .number({ error: "Enter your height" })
    .min(120, "Height must be at least 120 cm / 3′11.3″")
    .max(240, "Height must be at most 240 cm / 7′10.5″"),
  weightKg: z
    .number({ error: "Enter your weight" })
    .min(30, "Weight must be at least 30 kg / 66.2 lb")
    .max(200, "Weight must be at most 200 kg / 440.9 lb"),
  wingspanCm: z
    .number({ error: "Enter a valid wingspan, or leave it blank" })
    .min(120, "Wingspan must be at least 120 cm / 3′11.3″")
    .max(260, "Wingspan must be at most 260 cm / 8′6.4″")
    .optional(),
  gender: z.enum(["m", "f"]),
});

export function validateProfile(profile: Profile): string | null {
  const result = profileSchema.safeParse(profile);
  return result.success ? null : (result.error.issues[0]?.message ?? "Check your measurements");
}

/** Keep every field's error so assistive technology can describe the right input. */
export function getProfileErrors(profile: Profile): Partial<Record<keyof Profile, string>> {
  const result = profileSchema.safeParse(profile);
  if (result.success) return {};
  const errors: Partial<Record<keyof Profile, string>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (
      field === "heightCm" ||
      field === "weightKg" ||
      field === "wingspanCm" ||
      field === "gender"
    ) {
      errors[field] ??= issue.message;
    }
  }
  return errors;
}

/** Stored measurements are untrusted; never merge arbitrary JSON into UI state. */
export function parseStoredProfile(raw: string | null): Profile {
  if (!raw) return { ...DEFAULT_PROFILE };
  try {
    const result = profileSchema.safeParse(JSON.parse(raw));
    if (result.success) return result.data;
  } catch {
    // Invalid JSON falls back to the same defaults as invalid measurements.
  }
  return { ...DEFAULT_PROFILE };
}
