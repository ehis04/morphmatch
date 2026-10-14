"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { createPhotoStore } from "@/lib/athlete-photo";
import type { Athlete } from "@/lib/types";

const photos = createPhotoStore();
const serverSnapshot = () => undefined;

function usePhoto(slug: string) {
  const subscribe = useCallback((listener: () => void) => photos.subscribe(slug, listener), [slug]);
  const snapshot = useCallback(() => photos.get(slug), [slug]);
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
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
  const ref = useRef<HTMLDivElement>(null);
  const photo = usePhoto(athlete.wiki);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (!("IntersectionObserver" in window)) {
      void photos.load(athlete.wiki);
      return;
    }
    // Hidden side portraits and offscreen cards do not trigger photo requests.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void photos.load(athlete.wiki);
          observer.disconnect();
        }
      },
      { rootMargin: "150px" }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [athlete.wiki]);

  const credit = photo
    ? `${photo.author} · ${photo.license} · ${photo.licenseUrl}. Cropped to fit.`
    : "";
  return (
    <div ref={ref} className={`relative overflow-hidden bg-line ${className}`}>
      {photo ? (
        <>
          <Image
            src={photo.url}
            alt={athlete.name}
            fill
            sizes={sizes}
            className="object-cover object-top"
            onError={() => photos.reject(athlete.wiki)}
          />
          <span
            title={credit}
            className="absolute bottom-0 right-0 rounded-tl bg-ink/85 px-1 text-[10px] text-paper"
          >
            <span aria-hidden>ⓘ</span>
            <span className="sr-only">Photo credit: {credit}</span>
          </span>
        </>
      ) : (
        <div
          className="flex h-full w-full items-end justify-center"
          style={{
            backgroundColor: `color-mix(in srgb, ${SPORT_TINT[athlete.sport]} 14%, var(--color-card))`,
          }}
          aria-hidden
        >
          <svg viewBox="0 0 100 90" className="w-3/5">
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

/** Actual file/author/license attribution; article link when no photo is available. */
export function WikiCredit({ athlete }: { athlete: Athlete }) {
  const photo = usePhoto(athlete.wiki);
  const linkClass =
    "inline-flex min-h-11 min-w-11 max-w-full items-center break-words py-2 align-middle underline-offset-2 hover:underline";
  if (!photo) {
    return (
      <a
        href={`https://en.wikipedia.org/wiki/${encodeURIComponent(athlete.wiki)}`}
        target="_blank"
        rel="noreferrer"
        className={`text-[11px] text-ink-soft ${linkClass}`}
      >
        Wikipedia
      </a>
    );
  }
  return (
    <span className="min-w-0 break-words text-[11px] leading-relaxed text-ink-soft">
      <a
        href={photo.sourceUrl}
        target="_blank"
        rel="noreferrer"
        className={linkClass}
        title={`Photo by ${photo.author}; cropped to fit`}
      >
        Photo: {photo.author}
      </a>
      {" · "}
      <a href={photo.licenseUrl} target="_blank" rel="noreferrer" className={linkClass}>
        {photo.license}
      </a>
    </span>
  );
}
