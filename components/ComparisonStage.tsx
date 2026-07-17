"use client";

import { useMemo } from "react";
import type { BodyStats } from "@/lib/types";
import { buildFigure } from "@/lib/silhouette";
import { formatHeight, formatWeight, type UnitSystem } from "@/lib/units";
import { Silhouette } from "./Silhouette";

export interface StageSubject {
  label: string;
  stats: BodyStats;
  color: string;
  /** Show a "≈" estimation hint next to the wingspan in the legend. */
  wingspanEstimated?: boolean;
}

interface ComparisonStageProps {
  subjects: StageSubject[];
  mode: "overlay" | "side";
  system: UnitSystem;
  className?: string;
}

const RAIL = 34; // ruler rail width on each side (cm units)
const TOP = 26; // headroom above the tallest figure
const BOTTOM = 10;
const FT = 30.48;

/**
 * The measuring wall: figures rendered at true relative scale (1 SVG unit =
 * 1 cm) between a cm rail and a ft/in rail, with a dashed growth-chart line
 * marking each person's height.
 */
export function ComparisonStage({ subjects, mode, system, className }: ComparisonStageProps) {
  const layout = useMemo(() => {
    const figures = subjects.map((s) => buildFigure(s.stats));
    const maxH = Math.max(...figures.map((f) => f.heightCm), 100);
    let slots: { cx: number }[];
    let contentW: number;
    if (mode === "overlay") {
      const w = 2 * Math.max(...figures.map((f) => f.halfWidth)) + 30;
      contentW = w;
      slots = figures.map(() => ({ cx: RAIL + w / 2 }));
    } else {
      let x = RAIL;
      slots = figures.map((f) => {
        const w = 2 * f.halfWidth + 18;
        const slot = { cx: x + w / 2 };
        x += w;
        return slot;
      });
      contentW = x - RAIL;
    }
    return { figures, maxH, slots, totalW: RAIL * 2 + contentW };
  }, [subjects, mode]);

  const { figures, maxH, slots, totalW } = layout;
  const top = -(maxH + TOP);
  const totalH = maxH + TOP + BOTTOM;
  const innerL = RAIL;
  const innerR = totalW - RAIL;

  const gridlines = [];
  for (let h = 10; h <= maxH + TOP - 10; h += 10) {
    gridlines.push(h);
  }
  const feet = [];
  for (let f = 3; f * FT <= maxH + TOP - 10; f++) {
    feet.push(f);
  }

  const label = subjects
    .map((s) => `${s.label}: ${formatHeight(s.stats.heightCm, system)}`)
    .join(" vs ");

  return (
    <div className={className}>
      <svg
        viewBox={`0 ${top} ${totalW} ${totalH}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Height comparison — ${label}`}
      >
        {/* horizontal gridlines */}
        {gridlines.map((h) => (
          <line
            key={h}
            x1={h % 50 === 0 ? innerL - 8 : innerL}
            y1={-h}
            x2={h % 50 === 0 ? innerR + 8 : innerR}
            y2={-h}
            stroke={h % 50 === 0 ? "var(--color-line-strong)" : "var(--color-line)"}
            strokeWidth={h % 50 === 0 ? 0.8 : 0.5}
          />
        ))}

        {/* left rail: centimetres */}
        {gridlines
          .filter((h) => h % 50 === 0)
          .map((h) => (
            <text
              key={h}
              x={innerL - 11}
              y={-h + 2.2}
              textAnchor="end"
              fontSize={6}
              fill="var(--color-ink-faint)"
              fontFamily="var(--font-mono)"
            >
              {h}
            </text>
          ))}
        <text
          x={innerL - 11}
          y={top + 8}
          textAnchor="end"
          fontSize={5.5}
          fill="var(--color-ink-faint)"
          fontFamily="var(--font-mono)"
        >
          cm
        </text>

        {/* right rail: feet */}
        {feet.map((f) => (
          <g key={f}>
            <line
              x1={innerR}
              y1={-f * FT}
              x2={innerR + 6}
              y2={-f * FT}
              stroke="var(--color-line-strong)"
              strokeWidth={0.8}
            />
            <text
              x={innerR + 9}
              y={-f * FT + 2.2}
              fontSize={6}
              fill="var(--color-ink-faint)"
              fontFamily="var(--font-mono)"
            >
              {f}′
            </text>
          </g>
        ))}

        {/* height marker lines, growth-chart style */}
        {subjects.map((s, i) => {
          const y = -s.stats.heightCm;
          const atStart = i % 2 === 0;
          return (
            <g key={s.label + i}>
              <line
                x1={innerL}
                y1={y}
                x2={innerR}
                y2={y}
                stroke={s.color}
                strokeWidth={0.9}
                strokeDasharray="4 3.5"
              />
              <text
                x={atStart ? innerL + 3 : innerR - 3}
                y={y - 2.5}
                textAnchor={atStart ? "start" : "end"}
                fontSize={6.4}
                fontWeight={700}
                fill={s.color}
                fontFamily="var(--font-mono)"
              >
                {s.label} · {formatHeight(s.stats.heightCm, system)}
              </text>
            </g>
          );
        })}

        {/* figures */}
        {subjects.map((s, i) => (
          <Silhouette
            key={s.label + i}
            figure={figures[i]}
            color={s.color}
            transform={`translate(${slots[i].cx} 0)`}
            opacity={mode === "overlay" ? 0.66 : 0.97}
            blend={mode === "overlay"}
          />
        ))}

        {/* floor */}
        <line
          x1={innerL - 10}
          y1={0}
          x2={innerR + 10}
          y2={0}
          stroke="var(--color-ink)"
          strokeWidth={1.6}
        />
      </svg>

      {/* legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        {subjects.map((s, i) => (
          <div key={s.label + i} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: s.color }}
            />
            <span className="font-semibold">{s.label}</span>
            <span className="font-mono text-ink-soft">
              {formatHeight(s.stats.heightCm, system)} · {formatWeight(s.stats.weightKg, system)} ·{" "}
              {s.wingspanEstimated ? "≈" : ""}
              {formatHeight(s.stats.wingspanCm, system)} span
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
