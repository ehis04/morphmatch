"use client";

import { useEffect, useState } from "react";
import type { BodyStats } from "./types";

export interface Profile extends Omit<BodyStats, "wingspanCm"> {
  /** Undefined when the user hasn't entered one. */
  wingspanCm?: number;
}

export const DEFAULT_PROFILE: Profile = { heightCm: 178, weightKg: 75, gender: "m" };

/** The user's own stats, persisted locally so they survive reloads. */
export function useProfile() {
  const [profile, setProfileState] = useState<Profile>(DEFAULT_PROFILE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("mm.profile");
      // One-time hydration from localStorage after mount (avoids SSR mismatch).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setProfileState({ ...DEFAULT_PROFILE, ...JSON.parse(raw) });
    } catch {
      // corrupted storage — fall back to defaults
    }
    setHydrated(true);
  }, []);

  const setProfile = (p: Profile) => {
    setProfileState(p);
    window.localStorage.setItem("mm.profile", JSON.stringify(p));
  };

  return { profile, setProfile, hydrated };
}

/** Canonical BodyStats with the wingspan default applied. */
export function toBodyStats(p: Profile): BodyStats {
  return {
    heightCm: p.heightCm,
    weightKg: p.weightKg,
    wingspanCm: p.wingspanCm ?? p.heightCm,
    gender: p.gender,
  };
}
