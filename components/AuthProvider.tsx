"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  configured: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  loading: true,
  configured: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let active = true;
    let receivedEvent = false;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!active) return;
      receivedEvent = true;
      setSession(currentSession);
      setLoading(false);
    });
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active || receivedEvent) return;
        setSession(data.session);
        setLoading(false);
      })
      .catch(() => {
        if (active && !receivedEvent) setLoading(false);
      });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, configured: isSupabaseConfigured }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
