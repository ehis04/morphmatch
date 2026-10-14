/** Also usable before a build, where public environment values are inlined. */
export function isSecretSupabaseKey(value: string | undefined): boolean {
  const key = value?.trim();
  if (!key) return false;
  if (key.startsWith("sb_secret_")) return true;
  if (key.split(".").length !== 3) return false;
  try {
    const payload = key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return (JSON.parse(atob(payload)) as { role?: string }).role === "service_role";
  } catch {
    return false;
  }
}

export function isPublicSupabaseKey(value: string): boolean {
  const key = value.trim();
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true;
  const parts = key.split(".");
  if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) return false;
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return (JSON.parse(atob(payload)) as { role?: string }).role === "anon";
  } catch {
    return false;
  }
}

/** Public connection settings shared by the browser, callback and session proxy. */
export function getSupabaseConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (
    !url ||
    !key ||
    !isPublicSupabaseKey(key) ||
    [
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ].some((candidate) => candidate?.trim() && !isPublicSupabaseKey(candidate))
  )
    return null;

  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) {
      return null;
    }
    return { url, key };
  } catch {
    return null;
  }
}
