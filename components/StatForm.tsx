"use client";

import { useId, useState } from "react";
import type { Profile } from "@/lib/profile";
import { getProfileErrors } from "@/lib/profile-validation";
import {
  cmToFeetInches,
  kgToLbs,
  lbsToKg,
  parseImperialLength,
  type UnitSystem,
} from "@/lib/units";

export { validateProfile } from "@/lib/profile-validation";

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
  const errors = getProfileErrors(profile);
  const errorId = useId();
  const errorFor = (field: keyof Profile) => (errors[field] ? `${errorId}-${field}` : undefined);

  return (
    <div className="space-y-5">
      <Field label="Height" hint={system === "metric" ? "cm" : "ft / in"}>
        {system === "metric" ? (
          <NumberInput
            value={profile.heightCm}
            onChange={(v) => onChange({ ...profile, heightCm: v })}
            min={120}
            max={240}
            ariaLabel="Height in centimetres"
            errorId={errorFor("heightCm")}
          />
        ) : (
          <FeetInches
            cm={profile.heightCm}
            onChange={(cm) => onChange({ ...profile, heightCm: cm })}
            ariaLabel="Height"
            errorId={errorFor("heightCm")}
          />
        )}
      </Field>

      <Field label="Weight" hint={system === "metric" ? "kg" : "lb"}>
        <NumberInput
          key={system}
          value={system === "metric" ? profile.weightKg : kgToLbs(profile.weightKg)}
          onChange={(v) => onChange({ ...profile, weightKg: system === "metric" ? v : lbsToKg(v) })}
          min={system === "metric" ? 30 : 66.2}
          max={system === "metric" ? 200 : 440.9}
          ariaLabel={`Weight in ${system === "metric" ? "kilograms" : "pounds"}`}
          errorId={errorFor("weightKg")}
        />
      </Field>

      <Field
        label="Wingspan"
        hint="optional"
        sub="Fingertip to fingertip, arms out. Leave blank to assume it equals your height."
      >
        {system === "metric" ? (
          <NumberInput
            value={profile.wingspanCm ?? ""}
            onChange={(v) => onChange({ ...profile, wingspanCm: v })}
            onClear={() => onChange({ ...profile, wingspanCm: undefined })}
            min={120}
            max={260}
            placeholder={`≈ ${Math.round(profile.heightCm)}`}
            ariaLabel="Wingspan in centimetres"
            errorId={errorFor("wingspanCm")}
          />
        ) : (
          <FeetInches
            cm={profile.wingspanCm ?? null}
            placeholderCm={profile.heightCm}
            onChange={(cm) => onChange({ ...profile, wingspanCm: cm })}
            onClear={() => onChange({ ...profile, wingspanCm: undefined })}
            ariaLabel="Wingspan"
            errorId={errorFor("wingspanCm")}
          />
        )}
      </Field>

      <Field label="Build proportions" sub="Used to shape your silhouette, nothing else.">
        <div
          className="grid grid-cols-2 gap-2"
          role="group"
          aria-label="Build proportions"
          aria-describedby={errorFor("gender")}
        >
          {(
            [
              ["m", "Male"],
              ["f", "Female"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={profile.gender === value}
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

      {Object.keys(errors).length > 0 && (
        <div
          role="alert"
          id={errorId}
          className="rounded-md bg-record/10 px-3 py-2 text-sm font-medium text-record"
        >
          {Object.entries(errors).map(([field, message]) => (
            <p key={field} id={`${errorId}-${field}`}>
              {message}
            </p>
          ))}
        </div>
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
  errorId,
}: {
  value: number | "";
  onChange: (v: number) => void;
  onClear?: () => void;
  min: number;
  max: number;
  placeholder?: string;
  ariaLabel: string;
  errorId?: string;
}) {
  const displayValue =
    value === "" || !Number.isFinite(value) ? "" : String(Number(value.toFixed(2)));
  const [text, setText] = useState(displayValue);
  const [prevValue, setPrevValue] = useState(value);

  // Adjust state during render when the canonical value changes from outside
  // (e.g. a unit switch) — the React-recommended replacement for a sync effect.
  if (!Object.is(prevValue, value)) {
    setPrevValue(value);
    setText(displayValue);
  }

  return (
    <input
      type="number"
      inputMode="decimal"
      value={text}
      min={min}
      max={max}
      step="any"
      required={!onClear}
      placeholder={placeholder}
      aria-label={ariaLabel}
      aria-invalid={errorId ? true : undefined}
      aria-describedby={errorId}
      onChange={(e) => {
        const t = e.target.value;
        setText(t);
        if (t === "") {
          if (onClear && !e.target.validity.badInput) onClear();
          else onChange(Number.NaN);
          return;
        }
        const v = Number(t);
        onChange(v);
      }}
      className={`w-full rounded-md border ${errorId ? "border-record" : "border-line"} bg-card px-3 py-2 font-mono text-base tabular-nums outline-none transition-colors focus:border-ink`}
    />
  );
}

function FeetInches({
  cm,
  placeholderCm,
  onChange,
  onClear,
  ariaLabel,
  errorId,
}: {
  cm: number | null;
  placeholderCm?: number;
  onChange: (cm: number) => void;
  onClear?: () => void;
  ariaLabel: string;
  errorId?: string;
}) {
  const toDraft = (value: number | null) => {
    if (value == null || !Number.isFinite(value)) return { feet: "", inches: "" };
    const fi = cmToFeetInches(value);
    return { feet: String(fi.feet), inches: String(fi.inches) };
  };
  const [draft, setDraft] = useState(() => toDraft(cm));
  const [previousCm, setPreviousCm] = useState(cm);
  const ph =
    placeholderCm != null && Number.isFinite(placeholderCm) ? cmToFeetInches(placeholderCm) : null;

  if (!Object.is(previousCm, cm)) {
    setPreviousCm(cm);
    setDraft(toDraft(cm));
  }

  const update = (part: "feet" | "inches", text: string, badInput: boolean) => {
    const next = { ...draft, [part]: text };
    setDraft(next);
    if (next.feet === "" && next.inches === "" && onClear && !badInput) {
      setPreviousCm(null);
      onClear();
      return;
    }
    const value = parseImperialLength(next.feet, next.inches);
    // Preserve the two draft fields through our own canonical updates.
    setPreviousCm(value);
    onChange(value);
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="relative">
        <input
          type="number"
          inputMode="numeric"
          min={3}
          max={8}
          step={1}
          required={!onClear || draft.inches !== ""}
          value={draft.feet}
          placeholder={ph ? String(ph.feet) : undefined}
          aria-label={`${ariaLabel} feet`}
          aria-invalid={errorId ? true : undefined}
          aria-describedby={errorId}
          onChange={(e) => update("feet", e.target.value, e.target.validity.badInput)}
          className={`w-full rounded-md border ${errorId ? "border-record" : "border-line"} bg-card px-3 py-2 pr-8 font-mono text-base tabular-nums outline-none transition-colors focus:border-ink`}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-faint">
          ft
        </span>
      </div>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          max={11.99}
          step="any"
          required={!onClear || draft.feet !== ""}
          value={draft.inches}
          placeholder={ph ? String(ph.inches) : undefined}
          aria-label={`${ariaLabel} inches`}
          aria-invalid={errorId ? true : undefined}
          aria-describedby={errorId}
          onChange={(e) => update("inches", e.target.value, e.target.validity.badInput)}
          className={`w-full rounded-md border ${errorId ? "border-record" : "border-line"} bg-card px-3 py-2 pr-8 font-mono text-base tabular-nums outline-none transition-colors focus:border-ink`}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-faint">
          in
        </span>
      </div>
    </div>
  );
}
