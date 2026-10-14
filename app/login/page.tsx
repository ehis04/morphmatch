"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { authCallbackUrl, safeNextPath } from "@/lib/supabase/auth";

type Tab = "signin" | "signup" | "recovery" | "confirmation";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Shell>
          <p role="status">Loading account…</p>
        </Shell>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, loading } = useAuth();
  const reset = searchParams.get("reset") === "1";
  const next = safeNextPath(searchParams.get("next"), reset ? "/login?reset=1" : "/saved");
  const [tab, setTab] = useState<Tab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string } | null>(
    searchParams.get("error")
      ? {
          kind: "error",
          text: "That sign-in or email link could not be completed. Please try again, or request a new link in this browser.",
        }
      : null
  );

  const showMessage = message && (
    <p
      role={message.kind === "error" ? "alert" : "status"}
      className={`mt-4 rounded-md px-3 py-2 text-sm font-medium ${
        message.kind === "error" ? "bg-record/10 text-record" : "bg-pitch/10 text-pitch"
      }`}
    >
      {message.text}
    </p>
  );

  const signOut = async () => {
    const supabase = getSupabase();
    if (!supabase || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: "Could not sign out. Please try again." });
    } finally {
      setBusy(false);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <Shell>
        <h1 className="font-display text-3xl font-extrabold">Accounts are switched off</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Signing in and saving comparisons are currently unavailable. You can still find matches,
          browse athletes and create head-to-head comparisons.
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

  if (loading)
    return (
      <Shell>
        <p role="status">Checking your account…</p>
      </Shell>
    );

  if (session && reset) {
    const updatePassword = async (event: React.FormEvent) => {
      event.preventDefault();
      const supabase = getSupabase();
      if (!supabase || busy) return;
      if (password !== confirmation) {
        setMessage({ kind: "error", text: "The passwords do not match." });
        return;
      }
      setBusy(true);
      setMessage(null);
      try {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setPassword("");
        setConfirmation("");
        setMessage({ kind: "info", text: "Your password has been updated." });
      } catch (error) {
        setMessage({
          kind: "error",
          text:
            error instanceof Error
              ? error.message
              : "Could not update your password. Please try again.",
        });
      } finally {
        setBusy(false);
      }
    };
    return (
      <Shell>
        <h1 className="font-display text-3xl font-extrabold">Choose a new password</h1>
        <form onSubmit={updatePassword} className="mt-5 space-y-4">
          <div>
            <label htmlFor="new-password" className="mb-1.5 block text-sm font-semibold">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border border-line bg-card px-3 py-2 text-base outline-none sm:text-sm focus:border-ink"
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-semibold">
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="w-full rounded-md border border-line bg-card px-3 py-2 text-base outline-none sm:text-sm focus:border-ink"
            />
          </div>
          {showMessage}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-ink px-4 py-2.5 font-bold text-paper disabled:opacity-50"
          >
            {busy ? "Updating…" : "Update password"}
          </button>
        </form>
        <Link
          href="/saved"
          className="mt-5 inline-flex min-h-11 items-center text-sm font-bold underline"
        >
          View saved comparisons
        </Link>
      </Shell>
    );
  }

  if (session) {
    return (
      <Shell>
        <h1 className="font-display text-3xl font-extrabold">You’re signed in</h1>
        <p className="mt-2 break-words text-sm text-ink-soft">{session.user.email}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={next}
            className="inline-flex min-h-11 items-center rounded-md bg-ink px-4 py-2 font-bold text-paper"
          >
            {next === "/saved" ? "View saved comparisons" : "Continue"}
          </Link>
          <button
            type="button"
            onClick={signOut}
            disabled={busy}
            className="min-h-11 rounded-md border border-ink px-4 py-2 font-bold"
          >
            {busy ? "Signing out…" : "Sign out"}
          </button>
        </div>
        <Link
          href="/login?reset=1"
          className="mt-5 inline-flex min-h-11 items-center text-sm font-bold underline"
        >
          Change password
        </Link>
        {showMessage}
      </Shell>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase || busy) return;
    setBusy(true);
    setMessage(null);

    try {
      const address = email.trim();
      if (tab === "confirmation") {
        const { error } = await supabase.auth.resend({
          type: "signup",
          email: address,
          options: { emailRedirectTo: authCallbackUrl(window.location.origin, next) },
        });
        if (error) throw error;
        setMessage({
          kind: "info",
          text: "If this email has an account awaiting confirmation, a new link will arrive in your inbox. Open it in this browser.",
        });
      } else if (tab === "recovery") {
        const { error } = await supabase.auth.resetPasswordForEmail(address, {
          redirectTo: authCallbackUrl(window.location.origin, "/login?reset=1"),
        });
        if (error) throw error;
        setMessage({
          kind: "info",
          text: "If an account exists for that email, you’ll receive a password reset link. Open it in this browser.",
        });
      } else if (tab === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: address, password });
        if (error) {
          if (error.code === "email_not_confirmed") {
            setTab("confirmation");
            setPassword("");
          }
          throw error;
        }
        router.replace(next);
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: address,
          password,
          options: { emailRedirectTo: authCallbackUrl(window.location.origin, next) },
        });
        if (error) throw error;
        if (data.session) {
          router.replace(next);
          router.refresh();
        } else {
          setTab("confirmation");
          setPassword("");
          setMessage({
            kind: "info",
            text: "Check your inbox and confirm your email in this browser to finish creating your account.",
          });
        }
      }
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Could not connect. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const supabase = getSupabase();
    if (!supabase || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: authCallbackUrl(window.location.origin, next) },
      });
      if (error) throw error;
    } catch {
      setMessage({
        kind: "error",
        text: "Google sign-in is currently unavailable. Please sign in with email or try again.",
      });
      setBusy(false);
    }
  };

  return (
    <Shell>
      <h1 className="font-display text-3xl font-extrabold">
        {tab === "signin"
          ? "Welcome back"
          : tab === "signup"
            ? "Create your account"
            : tab === "recovery"
              ? "Reset your password"
              : "Confirm your email"}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        Save comparisons for yourself, your friends and your favourite pros.
      </p>

      {reset && !session && (
        <p role="status" className="mt-3 text-sm text-ink-soft">
          Sign in to change your password, or request a new reset link below.
        </p>
      )}

      <div
        className="mt-5 flex rounded-md border border-line bg-paper p-0.5"
        role="group"
        aria-label="Account action"
      >
        {(
          [
            ["signin", "Sign in"],
            ["signup", "Create account"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={tab === value}
            disabled={busy}
            onClick={() => {
              setTab(value);
              setMessage(null);
            }}
            className={`min-h-11 flex-1 rounded px-3 py-1.5 text-sm font-semibold transition-colors ${
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
            className="w-full rounded-md border border-line bg-card px-3 py-2 text-base outline-none sm:text-sm focus:border-ink"
          />
        </div>
        {(tab === "signin" || tab === "signup") && (
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-semibold">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={tab === "signup" ? 8 : undefined}
              autoComplete={tab === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-line bg-card px-3 py-2 text-base outline-none sm:text-sm focus:border-ink"
            />
            {tab === "signup" && (
              <p className="mt-1 text-xs text-ink-faint">At least 8 characters.</p>
            )}
          </div>
        )}

        {showMessage}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-ink px-4 py-2.5 font-bold text-paper transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          {busy
            ? "One moment…"
            : tab === "signin"
              ? "Sign in"
              : tab === "signup"
                ? "Create account"
                : tab === "recovery"
                  ? "Send reset link"
                  : "Send confirmation link"}
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setTab(tab === "recovery" ? "signin" : "recovery");
            setMessage(null);
          }}
          className="min-h-11 text-sm font-semibold underline"
        >
          {tab === "recovery" ? "Back to sign in" : "Forgot your password?"}
        </button>
        {tab !== "recovery" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setTab(tab === "confirmation" ? "signin" : "confirmation");
              setMessage(null);
              setPassword("");
            }}
            className="min-h-11 text-sm font-semibold underline"
          >
            {tab === "confirmation" ? "Back to sign in" : "Resend confirmation email"}
          </button>
        )}
      </div>

      {process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true" &&
        (tab === "signin" || tab === "signup") && (
          <>
            <div className="my-5 flex items-center gap-3 text-xs text-ink-faint">
              <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
            </div>

            <button
              type="button"
              onClick={google}
              disabled={busy}
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
          </>
        )}
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
