import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { authRequestOrigin, safeNextPath } from "@/lib/supabase/auth";
import { getSiteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

/** OAuth / email-confirmation callback: exchange the code for a session. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = authRequestOrigin(request, getSiteUrl());
  const code = searchParams.get("code");
  const flowId = searchParams.get("sb_flow_id");
  const next = safeNextPath(searchParams.get("next"));

  try {
    if (code && !searchParams.has("error")) {
      const supabase = await getServerSupabase();
      if (supabase) {
        const { error } = await supabase.auth.exchangeCodeForSession(
          code,
          flowId ? { flowId } : undefined
        );
        if (!error) {
          const response = NextResponse.redirect(new URL(next, origin));
          response.headers.set("Cache-Control", "private, no-store");
          return response;
        }
        console.warn("Authentication callback failed:", error.code ?? error.name);
      } else {
        console.warn("Authentication callback failed: accounts are unavailable");
      }
    }
  } catch (error) {
    console.warn(
      "Authentication callback failed:",
      error instanceof Error ? error.name : "unexpected_error"
    );
    // Recoverable network errors should return users to a usable sign-in page.
  }

  const login = new URL("/login", origin);
  login.searchParams.set("error", "auth_callback_failed");
  login.searchParams.set("next", next);
  const response = NextResponse.redirect(login);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
