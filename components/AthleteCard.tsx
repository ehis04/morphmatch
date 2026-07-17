"use client";

import Link from "next/link";
import type { Athlete } from "@/lib/types";
import { countryName, flagEmoji } from "@/lib/countries";
import { SPORT_COLOR } from "@/lib/sport";
import { formatHeight, formatWeight, type UnitSystem } from "@/lib/units";
import { AthletePhoto, WikiCredit } from "./AthletePhoto";

export function AthleteCard({ athlete, system }: { athlete: Athlete; system: UnitSystem }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-line bg-card shadow-card transition-shadow hover:shadow-lift">
      <AthletePhoto
        athlete={athlete}
        className="aspect-[4/3]"
        sizes="(max-width: 640px) 50vw, 260px"
      />
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div>
          <h3 className="font-display text-[17px] font-bold leading-tight">{athlete.name}</h3>
          <p className="mt-0.5 text-xs text-ink-soft">
            <span aria-hidden>{flagEmoji(athlete.country)}</span> {countryName(athlete.country)}
            {athlete.position ? ` · ${athlete.position}` : ""}
            {!athlete.active && " · Retired"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
            style={{ backgroundColor: SPORT_COLOR[athlete.sport] }}
          >
            {athlete.league}
          </span>
          <WikiCredit athlete={athlete} />
        </div>
        <p className="font-mono text-[13px] tabular-nums text-ink-soft">
          {formatHeight(athlete.heightCm, system)} · {formatWeight(athlete.weightKg, system)} ·{" "}
          {athlete.wingspanEstimated ? "≈" : ""}
          {formatHeight(athlete.wingspanCm, system)} span
        </p>
        <div className="mt-auto grid grid-cols-2 gap-2 pt-1">
          <Link
            href={`/match?athlete=${athlete.id}`}
            className="rounded-md bg-ink px-2 py-1.5 text-center text-xs font-bold text-paper transition-opacity hover:opacity-85"
          >
            Compare with me
          </Link>
          <Link
            href={`/versus?a=${athlete.id}`}
            className="rounded-md border border-ink px-2 py-1.5 text-center text-xs font-bold transition-colors hover:bg-ink hover:text-paper"
          >
            Head-to-head
          </Link>
        </div>
      </div>
    </article>
  );
}
