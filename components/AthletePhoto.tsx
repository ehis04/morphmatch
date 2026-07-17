"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Athlete } from "@/lib/types";

/**
 * Freely licensed athlete photo via the Wikipedia REST summary endpoint.
 * Results (including misses) are cached for the session. When no usable
 * image exists the sport-tinted silhouette avatar takes its place — the
 * comparison always works either way.
 */

const cache = new Map<string, string | null>();

async function fetchThumb(slug: string): Promise<string | null> {
  if (cache.has(slug)) return cache.get(slug)!;
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) throw new Error(String(res.status));
    const json = await res.json();
    const url: string | undefined = json?.thumbnail?.source;
    const upscaled = url ? url.replace(/\/(\d+)px-/, "/480px-") : null;
    cache.set(slug, upscaled ?? null);
    return upscaled ?? null;
  } catch {
    cache.set(slug, null);
    return null;
  }
}

const SPORT_TINT: Record<Athlete["sport"], string> = {
  football: "var(--color-pitch)",
  basketball: "var(--color-court)",
  tennis: "var(--color-clay)",
  swimming: "var(--color-pool)",
};

export function AthletePhoto({
  athlete,
  className = "",
  sizes = "160px",
}: {
  athlete: Athlete;
  className?: string;
  sizes?: string;
}) {
  const [loaded, setLoaded] = useState<{ slug: string; url: string | null } | null>(null);

  useEffect(() => {
    let alive = true;
    fetchThumb(athlete.wiki).then((url) => {
      if (alive) setLoaded({ slug: athlete.wiki, url });
    });
    return () => {
      alive = false;
    };
  }, [athlete.wiki]);

  const current = loaded?.slug === athlete.wiki ? loaded : null;
  const src: string | null | "loading" = current ? current.url : "loading";

  return (
    <div className={`relative overflow-hidden bg-line ${className}`}>
      {src && src !== "loading" ? (
        <Image
          src={src}
          alt={athlete.name}
          fill
          sizes={sizes}
          className="object-cover object-top"
          unoptimized
        />
      ) : (
        <div
          className="flex h-full w-full items-end justify-center"
          style={{
            backgroundColor:
              "color-mix(in srgb, " + SPORT_TINT[athlete.sport] + " 14%, var(--color-card))",
          }}
          aria-hidden
        >
          {/* head-and-shoulders placeholder */}
          <svg viewBox="0 0 100 90" className={src === "loading" ? "w-3/5 animate-pulse" : "w-3/5"}>
            <circle cx="50" cy="34" r="16" fill={SPORT_TINT[athlete.sport]} opacity="0.55" />
            <path
              d="M 18 90 C 18 66 34 56 50 56 C 66 56 82 66 82 90 Z"
              fill={SPORT_TINT[athlete.sport]}
              opacity="0.55"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

/** Small attribution link shown near photos. */
export function WikiCredit({ athlete }: { athlete: Athlete }) {
  return (
    <a
      href={`https://en.wikipedia.org/wiki/${athlete.wiki}`}
      target="_blank"
      rel="noreferrer"
      className="text-[11px] text-ink-faint underline-offset-2 hover:underline"
    >
      Photo · Wikipedia
    </a>
  );
}
