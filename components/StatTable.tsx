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
  left: { label: string; stats: BodyStats };
  right: { label: string; stats: BodyStats; wingspanEstimated?: boolean };
  delta: StatDelta;
  system: UnitSystem;
}

/** The "numbers" comparison view: measurement rows with signed deltas. */
export function StatTable({ left, right, delta, system }: StatTableProps) {
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
      l: formatHeight(left.stats.wingspanCm, system),
      r: (right.wingspanEstimated ? "≈" : "") + formatHeight(right.stats.wingspanCm, system),
      d: formatLengthDelta(delta.wingspan, system),
      magnitude: Math.min(1, Math.abs(delta.wingspan) / 16),
      note: right.wingspanEstimated ? "estimated" : undefined,
    },
    {
      name: "Ape index",
      l: formatLengthDelta(left.stats.wingspanCm - left.stats.heightCm, system),
      r: formatLengthDelta(right.stats.wingspanCm - right.stats.heightCm, system),
      d: formatLengthDelta(delta.apeIndex, system),
      magnitude: Math.min(1, Math.abs(delta.apeIndex) / 10),
      note: "wingspan minus height",
    },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-paper text-left">
            <th className="px-3 py-2 font-semibold">Measurement</th>
            <th className="px-3 py-2 font-semibold">{left.label}</th>
            <th className="px-3 py-2 font-semibold">{right.label}</th>
            <th className="px-3 py-2 font-semibold">Difference</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-b border-line/60 bg-card last:border-b-0">
              <td className="px-3 py-2.5">
                <span className="font-semibold">{row.name}</span>
                {row.note && <span className="ml-1.5 text-xs text-ink-faint">({row.note})</span>}
              </td>
              <td className="px-3 py-2.5 font-mono tabular-nums">{row.l}</td>
              <td className="px-3 py-2.5 font-mono tabular-nums">{row.r}</td>
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
  );
}
