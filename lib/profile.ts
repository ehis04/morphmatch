"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { BodyStats } from "./types";
import {
  DEFAULT_PROFILE,
  parseStoredProfile,
  validateProfile,
  type Profile,
} from "./profile-validation";

export { DEFAULT_PROFILE, type Profile } from "./profile-validation";

interface ProfileContextValue {
  profile: Profile;
  setProfile: (profile: Profile) => void;
  hydrated: boolean;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

/** One shared profile lets saved comparisons restore measurements before navigation. */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<Profile>(DEFAULT_PROFILE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      // One-time hydration from localStorage after mount (avoids SSR mismatch).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfileState(parseStoredProfile(window.localStorage.getItem("mm.profile")));
    } catch {
      // corrupted storage — fall back to defaults
    }
    setHydrated(true);
  }, []);

  const setProfile = useCallback((p: Profile) => {
    setProfileState(p);
    // Preserve the last complete profile while a measurement is being edited.
    if (validateProfile(p) !== null) return;
    try {
      window.localStorage.setItem("mm.profile", JSON.stringify(p));
    } catch {
      // Private browsing, browser policy or a full quota must not break the form.
    }
  }, []);

  const value = useMemo(() => ({ profile, setProfile, hydrated }), [profile, setProfile, hydrated]);
  return createElement(ProfileContext.Provider, { value }, children);
}

/** The user's own stats, persisted locally so they survive reloads. */
export function useProfile(): ProfileContextValue {
  const value = useContext(ProfileContext);
  if (!value) throw new Error("useProfile must be used inside ProfileProvider");
  return value;
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
