"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

type Tab = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [tab, setTab] = useState<Tab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string } | null>(null);

  if (!isSupabaseConfigured) {
    return (
      <Shell>
        <h1 className="font-display text-3xl font-extrabold">Accounts are switched off</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          This deployment has no Supabase project connected, so signing in and saving comparisons
          are disabled. Everything else works. To enable accounts, add{" "}
          <code className="rounded bg-line px-1 font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
          and{" "}
          <code className="rounded bg-line px-1 font-mono text-xs">
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </code>{" "}
          — the README walks through it in five minutes.
        </p>
        <Link
          href="/match"
          className="mt-6 inline-block rounded-md bg-ink px-4 py-2 font-bold text-paper"
        >
          Back to matching
        </Link>
      </Shell>
    );
  }

  if (session) {
    return (
      <Shell>
        <h1 className="font-display text-3xl font-extrabold">You’re signed in</h1>
        <p className="mt-2 text-sm text-ink-soft">{session.user.email}</p>
        <div className="mt-6 flex gap-3">
          <Link href="/saved" className="rounded-md bg-ink px-4 py-2 font-bold text-paper">
            View saved comparisons
          </Link>
          <button
            type="button"
            onClick={() => getSupabase()?.auth.signOut()}
            className="rounded-md border border-ink px-4 py-2 font-bold"
          >
            Sign out
          </button>
        </div>
      </Shell>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    setBusy(true);
    setMessage(null);

    if (tab === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage({ kind: "error", text: error.message });
      else router.push("/saved");
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) setMessage({ kind: "error", text: error.message });
      else if (data.session) router.push("/saved");
      else
        setMessage({
          kind: "info",
          text: "Check your inbox — confirm the email to finish creating your account.",
        });
    }
    setBusy(false);
  };

  const google = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <Shell>
      <h1 className="font-display text-3xl font-extrabold">
        {tab === "signin" ? "Welcome back" : "Create your account"}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        Save comparisons for yourself, your friends and your favourite pros.
      </p>

      <div className="mt-5 flex rounded-md border border-line bg-paper p-0.5" role="tablist">
        {(
          [
            ["signin", "Sign in"],
            ["signup", "Create account"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => {
              setTab(value);
              setMessage(null);
            }}
            className={`flex-1 rounded px-3 py-1.5 text-sm font-semibold transition-colors ${
              tab === value ? "bg-ink text-paper" : "text-ink-soft"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-5 space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-semibold">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-line bg-card px-3 py-2 text-sm outline-none focus:border-ink"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-semibold">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete={tab === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-line bg-card px-3 py-2 text-sm outline-none focus:border-ink"
          />
          {tab === "signup" && (
            <p className="mt-1 text-xs text-ink-faint">At least 8 characters.</p>
          )}
        </div>

        {message && (
          <p
            role="alert"
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              message.kind === "error" ? "bg-record/10 text-record" : "bg-pitch/10 text-pitch"
            }`}
          >
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-ink px-4 py-2.5 font-bold text-paper transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          {busy ? "One moment…" : tab === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-ink-faint">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>

      <button
        type="button"
        onClick={google}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-line bg-card px-4 py-2.5 font-semibold transition-colors hover:border-ink"
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
          <path
            fill="#FFC107"
            d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"
          />
          <path
            fill="#FF3D00"
            d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
          />
          <path
            fill="#4CAF50"
            d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
          />
          <path
            fill="#1976D2"
            d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C41 35.4 44 30.2 44 24c0-1.3-.1-2.6-.4-3.9z"
          />
        </svg>
        Continue with Google
      </button>
      <p className="mt-4 text-xs leading-relaxed text-ink-faint">
        Google sign-in needs the provider enabled in your Supabase dashboard — see the README.
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-xl border border-line bg-card p-6 shadow-card sm:p-8">{children}</div>
    </div>
  );
}
