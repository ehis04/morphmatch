"use client";

import { useState } from "react";
import { z } from "zod";
import type { Profile } from "@/lib/profile";
import { cmToFeetInches, feetInchesToCm, kgToLbs, lbsToKg, type UnitSystem } from "@/lib/units";

const profileSchema = z.object({
  heightCm: z
    .number()
    .min(120, "Height must be at least 120 cm / 3′11″")
    .max(240, "Height must be at most 240 cm / 7′10″"),
  weightKg: z
    .number()
    .min(30, "Weight must be at least 30 kg / 66 lb")
    .max(200, "Weight must be at most 200 kg / 441 lb"),
  wingspanCm: z
    .number()
    .min(120, "Wingspan must be at least 120 cm")
    .max(260, "Wingspan must be at most 260 cm")
    .optional(),
  gender: z.enum(["m", "f"]),
});

export function validateProfile(p: Profile): string | null {
  const result = profileSchema.safeParse(p);
  if (result.success) return null;
  return result.error.issues[0]?.message ?? "Check your measurements";
}

interface StatFormProps {
  profile: Profile;
  onChange: (p: Profile) => void;
  system: UnitSystem;
}

/**
 * The measurement form. All values are held canonically in metric; imperial
 * mode converts at the input boundary so switching units never loses data.
 */
export function StatForm({ profile, onChange, system }: StatFormProps) {
  const error = validateProfile(profile);

  return (
    <div className="space-y-5">
      <Field label="Height" hint={system === "metric" ? "cm" : "ft / in"}>
        {system === "metric" ? (
          <NumberInput
            value={Math.round(profile.heightCm)}
            onChange={(v) => onChange({ ...profile, heightCm: v })}
            min={120}
            max={240}
            ariaLabel="Height in centimetres"
          />
        ) : (
          <FeetInches
            cm={profile.heightCm}
            onChange={(cm) => onChange({ ...profile, heightCm: cm })}
            ariaLabel="Height"
          />
        )}
      </Field>

      <Field label="Weight" hint={system === "metric" ? "kg" : "lb"}>
        <NumberInput
          value={system === "metric" ? Math.round(profile.weightKg) : kgToLbs(profile.weightKg)}
          onChange={(v) => onChange({ ...profile, weightKg: system === "metric" ? v : lbsToKg(v) })}
          min={system === "metric" ? 30 : 66}
          max={system === "metric" ? 200 : 441}
          ariaLabel={`Weight in ${system === "metric" ? "kilograms" : "pounds"}`}
        />
      </Field>

      <Field
        label="Wingspan"
        hint="optional"
        sub="Fingertip to fingertip, arms out. Leave blank to assume it equals your height."
      >
        {system === "metric" ? (
          <NumberInput
            value={profile.wingspanCm != null ? Math.round(profile.wingspanCm) : ""}
            onChange={(v) => onChange({ ...profile, wingspanCm: v })}
            onClear={() => onChange({ ...profile, wingspanCm: undefined })}
            min={120}
            max={260}
            placeholder={`≈ ${Math.round(profile.heightCm)}`}
            ariaLabel="Wingspan in centimetres"
          />
        ) : (
          <FeetInches
            cm={profile.wingspanCm ?? null}
            placeholderCm={profile.heightCm}
            onChange={(cm) => onChange({ ...profile, wingspanCm: cm })}
            onClear={() => onChange({ ...profile, wingspanCm: undefined })}
            ariaLabel="Wingspan"
          />
        )}
      </Field>

      <Field label="Build proportions" sub="Used to shape your silhouette, nothing else.">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Build proportions">
          {(
            [
              ["m", "Male"],
              ["f", "Female"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={profile.gender === value}
              onClick={() => onChange({ ...profile, gender: value })}
              className={`rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${
                profile.gender === value
                  ? "border-ink bg-ink text-paper"
                  : "border-line bg-card text-ink-soft hover:border-ink-faint"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>

      {error && (
        <p
          role="alert"
          className="rounded-md bg-record/10 px-3 py-2 text-sm font-medium text-record"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  sub,
  children,
}: {
  label: string;
  hint?: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-semibold">{label}</span>
        {hint && <span className="font-mono text-xs text-ink-faint">{hint}</span>}
      </div>
      {children}
      {sub && <p className="mt-1.5 text-xs leading-snug text-ink-faint">{sub}</p>}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  onClear,
  min,
  max,
  placeholder,
  ariaLabel,
}: {
  value: number | "";
  onChange: (v: number) => void;
  onClear?: () => void;
  min: number;
  max: number;
  placeholder?: string;
  ariaLabel: string;
}) {
  const [text, setText] = useState(value === "" ? "" : String(value));
  const [prevValue, setPrevValue] = useState(value);

  // Adjust state during render when the canonical value changes from outside
  // (e.g. a unit switch) — the React-recommended replacement for a sync effect.
  if (prevValue !== value) {
    setPrevValue(value);
    setText(value === "" ? "" : String(value));
  }

  return (
    <input
      type="number"
      inputMode="decimal"
      value={text}
      min={min}
      max={max}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => {
        const t = e.target.value;
        setText(t);
        if (t === "") {
          onClear?.();
          return;
        }
        const v = Number(t);
        if (!Number.isNaN(v)) onChange(v);
      }}
      className="w-full rounded-md border border-line bg-card px-3 py-2 font-mono text-base tabular-nums outline-none transition-colors focus:border-ink"
    />
  );
}

function FeetInches({
  cm,
  placeholderCm,
  onChange,
  onClear,
  ariaLabel,
}: {
  cm: number | null;
  placeholderCm?: number;
  onChange: (cm: number) => void;
  onClear?: () => void;
  ariaLabel: string;
}) {
  const fi = cm != null ? cmToFeetInches(cm) : null;
  const ph = placeholderCm != null ? cmToFeetInches(placeholderCm) : null;

  const update = (feet: number, inches: number) => onChange(feetInchesToCm(feet, inches));

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="relative">
        <input
          type="number"
          inputMode="numeric"
          min={3}
          max={7}
          value={fi?.feet ?? ""}
          placeholder={ph ? String(ph.feet) : undefined}
          aria-label={`${ariaLabel} — feet`}
          onChange={(e) => {
            if (e.target.value === "") {
              onClear?.();
              return;
            }
            const f = Number(e.target.value);
            if (!Number.isNaN(f)) update(f, fi?.inches ?? 0);
          }}
          className="w-full rounded-md border border-line bg-card px-3 py-2 pr-8 font-mono text-base tabular-nums outline-none transition-colors focus:border-ink"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-faint">
          ft
        </span>
      </div>
      <div className="relative">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={11}
          value={fi?.inches ?? ""}
          placeholder={ph ? String(ph.inches) : undefined}
          aria-label={`${ariaLabel} — inches`}
          onChange={(e) => {
            const i = Number(e.target.value);
            if (!Number.isNaN(i)) update(fi?.feet ?? ph?.feet ?? 5, i);
          }}
          className="w-full rounded-md border border-line bg-card px-3 py-2 pr-8 font-mono text-base tabular-nums outline-none transition-colors focus:border-ink"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-faint">
          in
        </span>
      </div>
    </div>
  );
}
