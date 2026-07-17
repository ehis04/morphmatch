"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ATHLETES } from "@/data";
import { findMatches } from "@/lib/similarity";
import { DEFAULT_FILTERS, type BodyStats } from "@/lib/types";
import { SPORT_COLOR } from "@/lib/sport";
import { formatHeight } from "@/lib/units";
import { ComparisonStage } from "./ComparisonStage";
import { useUnits } from "./UnitsProvider";

/**
 * The landing hero's live demo: drag the tape slider and watch your
 * silhouette morph while the nearest pro updates in real time.
 */
export function HeroDemo() {
  const { system } = useUnits();
  const [heightCm, setHeightCm] = useState(178);

  const stats: BodyStats = useMemo(
    () => ({
      heightCm,
      // demo weight tracks a fit BMI of 23 so the slider stays one-handed
      weightKg: Math.round(23 * (heightCm / 100) ** 2),
      wingspanCm: heightCm,
      gender: "m",
    }),
    [heightCm]
  );

  const best = useMemo(
    () =>
      findMatches(stats, ATHLETES, DEFAULT_FILTERS, { userProvidedWingspan: false, limit: 1 })[0],
    [stats]
  );

  const pct = ((heightCm - 150) / (215 - 150)) * 100;

  return (
    <div className="rounded-xl border border-line bg-card p-4 shadow-lift sm:p-5">
      <ComparisonStage
        mode="overlay"
        system={system}
        subjects={[
          { label: "You", stats, color: "var(--color-ink)" },
          {
            label: best.athlete.name.split(" ").slice(-1)[0],
            stats: best.athlete,
            color: SPORT_COLOR[best.athlete.sport],
            wingspanEstimated: best.athlete.wingspanEstimated,
          },
        ]}
      />

      <div className="mt-4">
        <div className="mb-1.5 flex items-baseline justify-between">
          <label htmlFor="hero-height" className="text-sm font-semibold">
            Your height
          </label>
          <span className="font-mono text-sm font-bold tabular-nums">
            {formatHeight(heightCm, system)}
          </span>
        </div>
        <input
          id="hero-height"
          type="range"
          min={150}
          max={215}
          value={heightCm}
          onChange={(e) => setHeightCm(Number(e.target.value))}
          className="tape-slider w-full"
          style={{ "--fill": `${pct}%` } as React.CSSProperties}
        />
        <p className="mt-3 text-sm text-ink-soft">
          Closest build right now: <strong className="text-ink">{best.athlete.name}</strong>{" "}
          <span className="font-mono">({Math.round(best.score)}% match)</span> —{" "}
          <Link href="/match" className="font-semibold underline underline-offset-2">
            add your weight and wingspan for the real answer
          </Link>
        </p>
      </div>
    </div>
  );
}
