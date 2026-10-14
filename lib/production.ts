import { isIP } from "node:net";
import { isPublicSupabaseKey, isSecretSupabaseKey } from "./supabase/config";

type Environment = Record<string, string | undefined>;

function publicHost(host: string): boolean {
  const name = host
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.+$/, "");
  if (
    name === "localhost" ||
    /\.(localhost|local|test|invalid|example)$/.test(name) ||
    /^(.*\.)?example\.(com|net|org)$/.test(name)
  )
    return false;
  if (isIP(name) === 4) {
    const [first, second, third] = name.split(".").map(Number);
    return !(
      first === 0 ||
      first === 10 ||
      first === 127 ||
      first >= 224 ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      (first === 192 && second === 0 && third === 2) ||
      (first === 198 && second === 51 && third === 100) ||
      (first === 203 && second === 0 && third === 113) ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 198 && (second === 18 || second === 19))
    );
  }
  if (isIP(name) === 6) return !/^(::$|::1$|::ffff:|f[cd]|fe[89ab]|ff|2001:db8:)/.test(name);
  return (
    name.includes(".") &&
    name.split(".").every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))
  );
}

function publicHttps(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || !publicHost(url.hostname))
      return null;
    return url;
  } catch {
    return null;
  }
}

/** Static release checks; never prints keys or claims to verify a hosted service. */
export function inspectProductionEnvironment(env: Environment): {
  errors: string[];
  origin?: string;
  accounts: boolean;
} {
  const errors: string[] = [];
  const site = publicHttps(env.SITE_URL?.trim() ?? "");
  if (!site || site.pathname !== "/" || site.search || site.hash)
    errors.push("Set SITE_URL to your public HTTPS origin, without a path, query or fragment.");
  if (env.NODE_ENV && env.NODE_ENV !== "production")
    errors.push("A production release must use NODE_ENV=production or leave NODE_ENV unset.");

  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishable = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const legacy = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const key = publishable || legacy;
  const accounts = Boolean(url || publishable || legacy);
  if (accounts) {
    const supabase = url ? publicHttps(url) : null;
    if (!supabase || supabase.pathname !== "/" || supabase.search || supabase.hash)
      errors.push(
        "Use a hosted HTTPS Supabase URL. Local development URLs cannot serve public accounts."
      );
    if (!key) errors.push("Accounts require a public Supabase publishable or anon key.");
    for (const candidate of [publishable, legacy]) {
      if (candidate && (isSecretSupabaseKey(candidate) || !isPublicSupabaseKey(candidate)))
        errors.push(
          "Supabase NEXT_PUBLIC_* keys must be public publishable or anon keys; never secret or service-role keys."
        );
    }
  }

  const google = env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED;
  if (google && google !== "true" && google !== "false")
    errors.push("NEXT_PUBLIC_GOOGLE_AUTH_ENABLED must be true or false.");
  if (google === "true" && !accounts)
    errors.push("Google sign-in requires configured Supabase accounts.");
  return { errors: [...new Set(errors)], origin: site?.origin, accounts };
}
