"use client";

import type { BodyStats, StatDelta } from "@/lib/types";
import {
  formatHeight,
  formatLengthDelta,
  formatWeight,
  formatWeightDelta,
  type UnitSystem,
} from "@/lib/units";

interface StatTableProps {
  left: { label: string; stats: BodyStats; wingspanEstimated?: boolean };
  right: { label: string; stats: BodyStats; wingspanEstimated?: boolean };
  delta: StatDelta;
  system: UnitSystem;
}

/** The "numbers" comparison view: measurement rows with signed deltas. */
export function StatTable({ left, right, delta, system }: StatTableProps) {
  const estimated = left.wingspanEstimated || right.wingspanEstimated;
  const approximate = (value: string, isEstimated?: boolean) => (isEstimated ? "≈" : "") + value;
  const rows: {
    name: string;
    l: string;
    r: string;
    d: string;
    magnitude: number; // 0–1 for the delta bar
    note?: string;
  }[] = [
    {
      name: "Height",
      l: formatHeight(left.stats.heightCm, system),
      r: formatHeight(right.stats.heightCm, system),
      d: formatLengthDelta(delta.height, system),
      magnitude: Math.min(1, Math.abs(delta.height) / 16),
    },
    {
      name: "Weight",
      l: formatWeight(left.stats.weightKg, system),
      r: formatWeight(right.stats.weightKg, system),
      d: formatWeightDelta(delta.weight, system),
      magnitude: Math.min(1, Math.abs(delta.weight) / 20),
    },
    {
      name: "Wingspan",
      l: approximate(formatHeight(left.stats.wingspanCm, system), left.wingspanEstimated),
      r: approximate(formatHeight(right.stats.wingspanCm, system), right.wingspanEstimated),
      d: approximate(formatLengthDelta(delta.wingspan, system), estimated),
      magnitude: Math.min(1, Math.abs(delta.wingspan) / 16),
      note: estimated ? "includes an estimate" : undefined,
    },
    {
      name: "Ape index",
      l: approximate(
        formatLengthDelta(left.stats.wingspanCm - left.stats.heightCm, system),
        left.wingspanEstimated
      ),
      r: approximate(
        formatLengthDelta(right.stats.wingspanCm - right.stats.heightCm, system),
        right.wingspanEstimated
      ),
      d: approximate(formatLengthDelta(delta.apeIndex, system), estimated),
      magnitude: Math.min(1, Math.abs(delta.apeIndex) / 10),
      note: "wingspan minus height",
    },
  ];

  return (
    <div>
      <p className="mb-2 text-xs text-ink-soft sm:hidden">
        Swipe or scroll horizontally to see all measurements.
      </p>
      <div
        className="overflow-x-auto rounded-lg border border-line"
        tabIndex={0}
        role="region"
        aria-label={`Measurement comparison: ${left.label} and ${right.label}`}
      >
        <table className="w-full min-w-[440px] text-sm">
          <caption className="sr-only">
            {left.label} compared with {right.label}. Differences show {right.label} minus{" "}
            {left.label}.
          </caption>
          <thead>
            <tr className="border-b border-line bg-paper text-left">
              <th scope="col" className="px-3 py-2 font-semibold">
                Measurement
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                {left.label}
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                {right.label}
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                Difference
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} className="border-b border-line/60 bg-card last:border-b-0">
                <th scope="row" className="px-3 py-2.5 text-left font-normal">
                  <span className="font-semibold">{row.name}</span>
                  {row.note && <span className="ml-1.5 text-xs text-ink-faint">({row.note})</span>}
                </th>
                <td className="whitespace-nowrap px-3 py-2.5 font-mono tabular-nums">{row.l}</td>
                <td className="whitespace-nowrap px-3 py-2.5 font-mono tabular-nums">{row.r}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-16 font-mono text-xs tabular-nums">{row.d}</span>
                    <span
                      aria-hidden
                      className="hidden h-1.5 rounded-full bg-tape sm:inline-block"
                      style={{
                        width: `${Math.max(4, row.magnitude * 64)}px`,
                        opacity: 0.4 + row.magnitude * 0.6,
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-ink-soft">
        Difference = {right.label} minus {left.label}.
        {estimated && " ≈ marks estimated wingspans and values derived from them."}
      </p>
    </div>
  );
}
