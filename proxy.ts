import { combineChunks, createServerClient, isChunkLike, stringFromBase64URL } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

/**
 * Next.js 16 proxy (the successor to middleware.ts).
 * Keeps Supabase auth sessions fresh by re-validating the auth token on
 * navigation and syncing refreshed cookies between request and response.
 * When Supabase isn't configured the proxy is a no-op.
 */
export async function proxy(request: NextRequest) {
  const config = getSupabaseConfig();
  let response = NextResponse.next({ request });
  if (!config) return response;

  // This is Supabase's documented default, shared with the browser client.
  const storageKey = `sb-${new URL(config.url).hostname.split(".")[0]}-auth-token`;
  const rebuildResponse = () => {
    const previous = response;
    response = NextResponse.next({ request });
    previous.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    // SSR sends these headers only once, even when one operation writes cookies
    // multiple times (for example cleaning up several pending PKCE flows).
    for (const name of ["Cache-Control", "Expires", "Pragma"]) {
      const value = previous.headers.get(name);
      if (value !== null) response.headers.set(name, value);
    }
  };
  const clearSessionCookies = () => {
    const names = request.cookies
      .getAll()
      .filter(({ name }) => isChunkLike(name, storageKey))
      .map(({ name }) => name);
    if (names.length === 0) return;
    names.forEach((name) => request.cookies.delete(name));
    rebuildResponse();
    names.forEach((name) => response.cookies.set(name, "", { path: "/", maxAge: 0 }));
    response.headers.set(
      "Cache-Control",
      "private, no-cache, no-store, must-revalidate, max-age=0"
    );
    response.headers.set("Expires", "0");
    response.headers.set("Pragma", "no-cache");
  };

  // The SDK checks only whether session properties exist, then assumes their
  // types while decoding the JWT. Recover before a corrupt cookie can throw.
  if (await malformedSessionCookie(request, storageKey)) {
    clearSessionCookies();
    return response;
  }

  const supabase = createServerClient(config.url, config.key, {
    auth: { storageKey },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        rebuildResponse();
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });

  try {
    // Trigger a token refresh if needed. Invalid credentials may be discarded;
    // a temporary auth-service outage must keep public pages and login usable.
    const { error } = await supabase.auth.getClaims();
    if (
      error &&
      (error.name === "AuthInvalidJwtError" || error.status === 401 || error.status === 403)
    ) {
      clearSessionCookies();
    }
  } catch {
    // Unexpected SDK/network failures must not take down public routes. Keep a
    // well-formed session so a later request can retry without logging out.
    if (await malformedSessionCookie(request, storageKey)) clearSessionCookies();
  }
  return response;
}

async function malformedSessionCookie(request: NextRequest, storageKey: string): Promise<boolean> {
  const value = await combineChunks(storageKey, (name) => request.cookies.get(name)?.value);
  if (!value) return request.cookies.getAll().some(({ name }) => isChunkLike(name, storageKey));
  try {
    const session: unknown = JSON.parse(
      value.startsWith("base64-") ? stringFromBase64URL(value.slice(7)) : value
    );
    if (!session || typeof session !== "object" || Array.isArray(session)) return true;
    const record = session as Record<string, unknown>;
    if (
      typeof record.access_token !== "string" ||
      !record.access_token ||
      typeof record.refresh_token !== "string" ||
      !record.refresh_token ||
      typeof record.expires_at !== "number" ||
      !Number.isFinite(record.expires_at)
    )
      return true;
    const parts = record.access_token.split(".");
    if (parts.length !== 3) return true;
    const header: unknown = JSON.parse(stringFromBase64URL(parts[0]));
    const payload: unknown = JSON.parse(stringFromBase64URL(parts[1]));
    return (
      !header ||
      typeof header !== "object" ||
      Array.isArray(header) ||
      typeof (header as Record<string, unknown>).alg !== "string" ||
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload) ||
      typeof (payload as Record<string, unknown>).exp !== "number" ||
      !Number.isFinite((payload as Record<string, unknown>).exp)
    );
  } catch {
    return true;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
