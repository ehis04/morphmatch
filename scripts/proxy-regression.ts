import assert from "node:assert/strict";
import { createServerClient, createChunks } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";

const storageKey = "sb-example-auth-token";
const envNames = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;
const originalEnv = envNames.map((name) => process.env[name]);
const originalFetch = globalThis.fetch;
const encode = (value: unknown) =>
  `base64-${Buffer.from(JSON.stringify(value)).toString("base64url")}`;
const jwt = (exp: number) =>
  `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ exp, sub: "00000000-0000-4000-8000-000000000001", role: "authenticated" })).toString("base64url")}.${Buffer.alloc(32).toString("base64url")}`;
const expiresAt = Math.floor(Date.now() / 1000) + 3600;
const user = { id: "00000000-0000-4000-8000-000000000001", email: "proxy-test@example.com" };
const session = {
  access_token: jwt(expiresAt),
  refresh_token: "test-refresh",
  expires_at: expiresAt,
  user,
};
const requestFor = (cookies: { name: string; value: string }[]) =>
  new NextRequest("https://morphmatch.example/login", {
    headers: {
      cookie: cookies.map(({ name, value }) => `${name}=${encodeURIComponent(value)}`).join("; "),
    },
  });
const unrelated = [
  { name: "mm.units", value: "imperial" },
  { name: `${storageKey}-code-verifier`, value: "pending-confirmation" },
  { name: "sb-other-auth-token", value: "another-project" },
];

async function main() {
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    globalThis.fetch = async () => {
      throw new Error("Unexpected network request for corrupt cookie");
    };
    const corrupt = { ...session, access_token: 123 };
    const synthetic = { name: storageKey, value: encode(corrupt) };
    const baseline = createServerClient("https://example.supabase.co", "sb_publishable_test", {
      cookies: { getAll: () => [synthetic], setAll: () => {} },
    });
    // This exercises the real SDK bug that previously rejected every navigation.
    await assert.rejects(() => baseline.auth.getClaims(), /token\.split is not a function/);
    for (const bad of [corrupt, { ...session, access_token: "bm90LWpzb24.e30.signature" }, null]) {
      const chunks = createChunks(storageKey, encode(bad), 60);
      const request = requestFor([...unrelated, ...chunks]);
      const response = await proxy(request);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("x-middleware-next"), "1");
      for (const { name } of chunks) {
        assert.equal(
          response.cookies.get(name)?.maxAge,
          0,
          "Malformed auth chunks must be expired"
        );
        assert.equal(request.cookies.has(name), false);
      }
      for (const cookie of unrelated) {
        assert.equal(request.cookies.get(cookie.name)?.value, cookie.value);
        assert.equal(response.cookies.has(cookie.name), false);
      }
      assert.match(response.headers.get("Cache-Control") ?? "", /private.*no-store/);
    }

    // A valid session survives temporary authentication-service failures.
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ message: "Temporary auth outage" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    const outageRequest = requestFor([...unrelated, { name: storageKey, value: encode(session) }]);
    const outageResponse = await proxy(outageRequest);
    assert.equal(outageResponse.status, 200);
    assert.equal(outageResponse.cookies.has(storageKey), false);
    assert.equal(outageRequest.cookies.get(storageKey)?.value, encode(session));

    // The SDK also rethrows non-AuthError failures (for example an unexpected
    // signing algorithm). Public routing must remain available in that case.
    const unexpected = {
      ...session,
      access_token: `${Buffer.from(JSON.stringify({ alg: "unexpected", kid: "synthetic-key" })).toString("base64url")}.${session.access_token.split(".").slice(1).join(".")}`,
    };
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ keys: [{ kid: "synthetic-key", kty: "RSA" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    const unexpectedCookie = { name: storageKey, value: encode(unexpected) };
    const unexpectedBaseline = createServerClient(
      "https://example.supabase.co",
      "sb_publishable_test",
      {
        cookies: { getAll: () => [unexpectedCookie], setAll: () => {} },
      }
    );
    await assert.rejects(() => unexpectedBaseline.auth.getClaims(), /Invalid alg claim/);
    const unexpectedRequest = requestFor([...unrelated, unexpectedCookie]);
    const unexpectedResponse = await proxy(unexpectedRequest);
    assert.equal(unexpectedResponse.status, 200);
    assert.equal(unexpectedRequest.cookies.get(storageKey)?.value, unexpectedCookie.value);

    // Successful refreshes retain their cookie changes and anti-cache headers.
    const refreshed = {
      ...session,
      refresh_token: "refreshed-token",
      expires_in: 3600,
      token_type: "bearer",
    };
    globalThis.fetch = async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const body = url.includes("/token?") ? refreshed : user;
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };
    const refreshRequest = requestFor([
      ...unrelated,
      { name: storageKey, value: encode({ ...session, expires_at: 1 }) },
    ]);
    const refreshResponse = await proxy(refreshRequest);
    assert.equal(refreshResponse.status, 200);
    assert.ok(refreshResponse.cookies.get(storageKey)?.value.includes("base64-"));
    assert.match(refreshResponse.headers.get("Cache-Control") ?? "", /private.*no-store/);
    assert.equal(refreshResponse.headers.get("Expires"), "0");
    assert.equal(refreshResponse.headers.get("Pragma"), "no-cache");
    for (const cookie of unrelated)
      assert.equal(refreshRequest.cookies.get(cookie.name)?.value, cookie.value);

    // Rejected expired sessions clean up several PKCE verifier cookies. The
    // actual SDK calls setAll repeatedly and sends cache headers only once.
    const flows = ["a".repeat(32), "b".repeat(32)];
    const flowCookies = [
      { name: `${storageKey}-flows-code-verifier`, value: encode(flows) },
      ...flows.map((flow) => ({
        name: `${storageKey}-flow-${flow}-code-verifier`,
        value: encode("pending-verifier"),
      })),
    ];
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({ code: "refresh_token_not_found", message: "Expired test session" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    const expiredRequest = requestFor([
      ...unrelated,
      ...flowCookies,
      { name: storageKey, value: encode({ ...session, access_token: jwt(1), expires_at: 1 }) },
    ]);
    const expiredResponse = await (async () => {
      const originalError = console.error;
      console.error = (...args: unknown[]) => {
        if (args[0] instanceof Error && args[0].message === "Expired test session") return;
        originalError(...args);
      };
      try {
        return await proxy(expiredRequest);
      } finally {
        console.error = originalError;
      }
    })();
    assert.equal(expiredResponse.status, 200);
    for (const { name } of flowCookies) assert.equal(expiredResponse.cookies.get(name)?.maxAge, 0);
    assert.equal(expiredResponse.cookies.get(storageKey)?.maxAge, 0);
    assert.match(expiredResponse.headers.get("Cache-Control") ?? "", /private.*no-store/);
    assert.equal(expiredResponse.headers.get("Expires"), "0");
    assert.equal(expiredResponse.headers.get("Pragma"), "no-cache");
    assert.equal(expiredRequest.cookies.get("mm.units")?.value, "imperial");
    assert.equal(expiredRequest.cookies.get("sb-other-auth-token")?.value, "another-project");
    console.log(
      "Proxy regressions passed: corrupt auth cookies, outage recovery, refresh cookies and cache headers."
    );
  } finally {
    globalThis.fetch = originalFetch;
    envNames.forEach((name, index) => {
      if (originalEnv[index] === undefined) delete process.env[name];
      else process.env[name] = originalEnv[index];
    });
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
