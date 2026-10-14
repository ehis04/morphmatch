export interface WikiPhoto {
  url: string;
  sourceUrl: string;
  author: string;
  license: string;
  licenseUrl: string;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function metadataText(metadata: unknown, key: string): string {
  const value = record(record(metadata)?.[key])?.value;
  if (typeof value !== "string") return "";
  const entities: Record<string, string> = {
    amp: "&",
    quot: '"',
    apos: "'",
    lt: "<",
    gt: ">",
    nbsp: " ",
  };
  // Metadata contains HTML. Render plain text, never API-provided markup.
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (original, entity: string) => {
      if (!entity.startsWith("#")) return entities[entity] ?? original;
      const point =
        entity[1].toLowerCase() === "x"
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : "";
    })
    .replace(/\s+/g, " ")
    .trim();
}

function safeUrl(value: unknown, hostname: string, path: string): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.hostname === hostname &&
      !url.username &&
      !url.password &&
      url.pathname.startsWith(path)
      ? url.href
      : null;
  } catch {
    return null;
  }
}

/** Only reuse Commons images with an explicit supported free license and author. */
export function commonsPhotoFromInfo(value: unknown): WikiPhoto | null {
  const info = record(value);
  if (!info) return null;
  const url =
    safeUrl(info.thumburl, "upload.wikimedia.org", "/wikipedia/commons/") ??
    safeUrl(info.thumburl, "thumb.wikimedia.org", "/wikipedia/commons/");
  const sourceUrl = safeUrl(info.descriptionurl, "commons.wikimedia.org", "/wiki/File:");
  const author = metadataText(info.extmetadata, "Artist");
  const license = metadataText(info.extmetadata, "LicenseShortName");
  const freeLicense = /^(?:CC BY(?:-SA)? (?:1\.0|2\.[05]|3\.0|4\.0)|CC0|Public domain)$/i.test(
    license
  );
  const rawLicenseUrl = metadataText(info.extmetadata, "LicenseUrl");
  const licenseUrl = safeUrl(
    rawLicenseUrl.replace(/^http:/i, "https:"),
    "creativecommons.org",
    "/"
  );
  // Public-domain descriptions sometimes have no separate license URL.
  const attributionUrl = licenseUrl ?? (/^(CC0|Public domain)$/i.test(license) ? sourceUrl : null);
  if (!url || !sourceUrl || !author || !freeLicense || !attributionUrl) return null;
  return { url, sourceUrl, author, license, licenseUrl: attributionUrl };
}

type Fetcher = typeof fetch;

async function queryWiki(hostname: string, params: Record<string, string>, fetcher: Fetcher) {
  const query = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    origin: "*",
    ...params,
  });
  const response = await fetcher(`https://${hostname}/w/api.php?${query}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Photo lookup failed (${response.status})`);
  const json: unknown = await response.json();
  if (record(json)?.error) throw new Error("Photo lookup returned an API error");
  const pages = record(record(json)?.query)?.pages;
  return Array.isArray(pages) ? pages : [];
}

async function fetchPhoto(slug: string, fetcher: Fetcher): Promise<WikiPhoto | null> {
  const pages = await queryWiki(
    "en.wikipedia.org",
    {
      titles: slug.replaceAll("_", " "),
      prop: "pageimages",
      piprop: "name",
      pilicense: "free",
      redirects: "1",
    },
    fetcher
  );
  const file = record(pages[0])?.pageimage;
  if (typeof file !== "string" || !file) return null;
  const files = await queryWiki(
    "commons.wikimedia.org",
    {
      titles: `File:${file}`,
      prop: "imageinfo",
      iiprop: "url|extmetadata",
      iiurlwidth: "480",
      iiextmetadatafilter: "Artist|LicenseShortName|LicenseUrl",
      iiextmetadatalanguage: "en",
    },
    fetcher
  );
  const imageinfo = record(files[0])?.imageinfo;
  return Array.isArray(imageinfo) ? commonsPhotoFromInfo(imageinfo[0]) : null;
}

/** Share requests between thumbnails and credits and cap Wikimedia concurrency. */
export function createPhotoStore(fetcher: Fetcher = fetch, now = Date.now) {
  const cache = new Map<string, { photo: WikiPhoto | null; retryAfter?: number }>();
  const pending = new Map<string, Promise<void>>();
  const listeners = new Map<string, Set<() => void>>();
  const queue: (() => void)[] = [];
  let active = 0;
  const notify = (slug: string) => listeners.get(slug)?.forEach((listener) => listener());
  const acquire = () =>
    new Promise<void>((resolve) => {
      const start = () => {
        active++;
        resolve();
      };
      if (active < 3) start();
      else queue.push(start);
    });

  return {
    get(slug: string): WikiPhoto | null | undefined {
      return cache.get(slug)?.photo;
    },
    subscribe(slug: string, listener: () => void) {
      const group = listeners.get(slug) ?? new Set<() => void>();
      group.add(listener);
      listeners.set(slug, group);
      return () => {
        group.delete(listener);
        if (group.size === 0) listeners.delete(slug);
      };
    },
    reject(slug: string) {
      cache.set(slug, { photo: null, retryAfter: now() + 60000 });
      notify(slug);
    },
    load(slug: string): Promise<void> {
      const entry = cache.get(slug);
      if (entry && (entry.retryAfter === undefined || entry.retryAfter > now()))
        return Promise.resolve();
      const inflight = pending.get(slug);
      if (inflight) return inflight;
      cache.delete(slug);
      const request = (async () => {
        await acquire();
        try {
          cache.set(slug, { photo: await fetchPhoto(slug, fetcher) });
        } catch {
          cache.set(slug, { photo: null, retryAfter: now() + 60000 });
        } finally {
          active--;
          queue.shift()?.();
          pending.delete(slug);
          notify(slug);
        }
      })();
      pending.set(slug, request);
      return request;
    },
  };
}
