/** Auth redirects accept local paths only, including optional query parameters. */
export function safeNextPath(value: string | null | undefined, fallback = "/saved"): string {
  if (!value?.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) {
    return fallback;
  }
  try {
    const url = new URL(value, "https://morphmatch.invalid");
    if (url.origin !== "https://morphmatch.invalid") return fallback;
    if (url.pathname.startsWith("/auth/")) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function authCallbackUrl(origin: string, next: string): string {
  const url = new URL("/auth/callback", origin);
  url.searchParams.set("next", safeNextPath(next));
  return url.toString();
}

/** Keep a configured public origin authoritative and preserve local loopback hosts. */
export function authRequestOrigin(request: Request, siteUrl?: URL): string {
  if (siteUrl) return siteUrl.origin;
  const url = new URL(request.url);
  const loopbackHosts = ["localhost", "127.0.0.1", "[::1]"];
  if (!loopbackHosts.includes(url.hostname)) return url.origin;
  const host = request.headers.get("host");
  if (!host || /[\\/@?#\s]/.test(host)) return url.origin;
  try {
    const external = new URL(`${url.protocol}//${host}`);
    if (loopbackHosts.includes(external.hostname)) return external.origin;
  } catch {
    // Keep the request origin when the Host header cannot form a local URL.
  }
  return url.origin;
}
