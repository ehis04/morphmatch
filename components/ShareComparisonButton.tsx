"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ComparisonMode } from "@/lib/comparison";
import { publicComparisonHref } from "@/lib/share";

export function ShareComparisonButton({
  aId,
  bId,
  mode,
}: {
  aId: string;
  bId: string;
  mode: ComparisonMode;
}) {
  const href = publicComparisonHref(aId, bId, mode);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    href: string;
    kind: "copied" | "shared" | "manual";
    url: string;
  } | null>(null);
  const currentFeedback = feedback?.href === href ? feedback : null;
  const manualUrl = currentFeedback?.kind === "manual" ? currentFeedback.url : null;
  const input = useRef<HTMLInputElement>(null);
  const id = useId();

  useEffect(() => {
    if (manualUrl) {
      input.current?.focus();
      input.current?.select();
    }
  }, [manualUrl]);

  async function share() {
    if (busy) return;
    setBusy(true);
    setFeedback(null);
    const url = new URL(href, window.location.origin).href;
    try {
      if (typeof navigator.share === "function") {
        try {
          await navigator.share({ title: "MorphMatch head-to-head", url });
          setFeedback({ href, kind: "shared", url });
          return;
        } catch (error) {
          if (error && typeof error === "object" && "name" in error && error.name === "AbortError")
            return;
          // A blocked share sheet can still use the clipboard or manual link.
        }
      }
      try {
        await navigator.clipboard.writeText(url);
        setFeedback({ href, kind: "copied", url });
      } catch {
        setFeedback({ href, kind: "manual", url });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-w-0 max-w-full">
      <button
        type="button"
        onClick={share}
        disabled={busy}
        className="min-h-11 rounded-md border border-line px-3 py-2 text-xs font-bold transition-colors hover:border-ink disabled:opacity-50"
      >
        {busy ? "Sharing…" : "Share comparison"}
      </button>
      {currentFeedback && (
        <p role="status" className="mt-1 text-xs text-ink-soft">
          {currentFeedback.kind === "copied"
            ? "Comparison link copied."
            : currentFeedback.kind === "shared"
              ? "Comparison sent to your share target."
              : "Copy the selected link to share this comparison."}
        </p>
      )}
      {manualUrl && (
        <div className="mt-2">
          <label htmlFor={id} className="mb-1 block text-xs font-semibold">
            Comparison link
          </label>
          <input
            ref={input}
            id={id}
            value={manualUrl}
            readOnly
            onFocus={(event) => event.currentTarget.select()}
            className="min-h-11 w-full min-w-0 rounded-md border border-line bg-paper px-2 py-1 font-mono text-base sm:text-sm"
          />
        </div>
      )}
    </div>
  );
}
