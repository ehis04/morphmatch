"use client";

import { AthleteCard } from "./AthleteCard";
import { useUnits } from "./UnitsProvider";
import { getAthlete } from "@/data";

const OUTLIER_IDS = ["victor-wembanyama", "muggsy-bogues", "peter-crouch", "florent-manaudou"];

export function OutliersRow() {
  const { system } = useUnits();
  const outliers = OUTLIER_IDS.map(getAthlete).filter((a) => a != null);

  return (
    <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {outliers.map((a) => (
        <AthleteCard key={a.id} athlete={a} system={system} />
      ))}
    </div>
  );
}
