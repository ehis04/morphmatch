/** The public origin is optional locally; never invent a production domain. */
export function getSiteUrl(): URL | undefined {
  const value =
    process.env.SITE_URL ||
    (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : undefined);
  if (!value) return undefined;
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("SITE_URL must be an HTTP(S) URL without credentials.");
  }
  return new URL(url.origin);
}
