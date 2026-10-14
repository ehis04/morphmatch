import { z } from "zod";
import type { SavedComp } from "./types";

const text = (max: number) => z.string().trim().min(1).max(max);
const athleteId = text(200).regex(/^[a-z0-9][a-z0-9-]*$/);

const subjectSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("custom"),
    label: text(80),
    stats: z.object({
      heightCm: z.number().min(120).max(240),
      weightKg: z.number().min(30).max(200),
      wingspanCm: z.number().min(120).max(260),
      gender: z.enum(["m", "f"]),
    }),
    wingspanEstimated: z.boolean().optional(),
  }),
  z.object({ kind: z.literal("athlete"), athleteId }),
]);

export const comparisonInputSchema = z.object({
  title: text(200),
  subject: subjectSchema,
  target_athlete_id: athleteId,
  mode: z.enum(["overlay", "side", "table"]),
});

const savedComparisonSchema = comparisonInputSchema.extend({
  id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
});

const savedIdentitySchema = z.object({
  id: z.uuid(),
  title: text(200).catch("Unavailable comparison"),
});

export type UnavailableSavedComp = z.infer<typeof savedIdentitySchema>;

/** Stored JSON is untrusted, including rows saved before validation was added. */
export function parseSavedComparisons(rows: unknown[]): {
  comps: SavedComp[];
  invalid: number;
  unavailable: UnavailableSavedComp[];
} {
  const comps: SavedComp[] = [];
  const unavailable: UnavailableSavedComp[] = [];
  let invalid = 0;
  for (const row of rows) {
    const result = savedComparisonSchema.safeParse(row);
    if (result.success) comps.push(result.data);
    else {
      invalid++;
      const identity = savedIdentitySchema.safeParse(row);
      if (identity.success) unavailable.push(identity.data);
    }
  }
  return { comps, invalid, unavailable };
}
