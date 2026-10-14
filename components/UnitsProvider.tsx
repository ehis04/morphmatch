"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { UnitSystem } from "@/lib/units";

interface UnitsContextValue {
  system: UnitSystem;
  setSystem: (s: UnitSystem) => void;
}

const UnitsContext = createContext<UnitsContextValue>({ system: "metric", setSystem: () => {} });

export function UnitsProvider({ children }: { children: ReactNode }) {
  const [system, setSystemState] = useState<UnitSystem>("metric");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("mm.units");
      // One-time hydration from localStorage after mount (avoids SSR mismatch).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored === "imperial" || stored === "metric") setSystemState(stored);
    } catch {
      // Unit switching still works when browser storage is unavailable.
    }
  }, []);

  const setSystem = (s: UnitSystem) => {
    setSystemState(s);
    try {
      window.localStorage.setItem("mm.units", s);
    } catch {
      // Retain the preference in memory for this visit.
    }
  };

  return <UnitsContext.Provider value={{ system, setSystem }}>{children}</UnitsContext.Provider>;
}

export function useUnits() {
  return useContext(UnitsContext);
}
