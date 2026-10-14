import assert from "node:assert/strict";
import { comparisonInputSchema, parseSavedComparisons } from "../lib/comparisons";
import { authCallbackUrl, authRequestOrigin, safeNextPath } from "../lib/supabase/auth";
import {
  getSupabaseConfig,
  isPublicSupabaseKey,
  isSecretSupabaseKey,
} from "../lib/supabase/config";

const subject = {
  kind: "custom",
  label: "Me",
  stats: { heightCm: 183, weightKg: 85, wingspanCm: 183, gender: "m" },
  wingspanEstimated: true,
};
const comparison = {
  title: "Me vs Marcus Rashford",
  subject,
  target_athlete_id: "marcus-rashford",
  mode: "table",
};

assert.equal(comparisonInputSchema.safeParse(comparison).success, true);
for (const invalid of [
  { ...comparison, mode: "invalid" },
  { ...comparison, title: "  " },
  { ...comparison, target_athlete_id: "" },
  { ...comparison, subject: null },
  { ...comparison, subject: { kind: "athlete" } },
  { ...comparison, subject: { ...subject, stats: { ...subject.stats, heightCm: Infinity } } },
  { ...comparison, subject: { ...subject, stats: { ...subject.stats, heightCm: "183" } } },
  { ...comparison, subject: { ...subject, stats: { ...subject.stats, wingspanCm: 0 } } },
]) {
  assert.equal(comparisonInputSchema.safeParse(invalid).success, false);
}

const saved = {
  ...comparison,
  id: "ce0e92bc-baa9-4770-b788-56821442ea72",
  created_at: "2026-01-01T12:00:00+00:00",
};
const parsed = parseSavedComparisons([saved, { ...saved, subject: {} }, null]);
assert.equal(parsed.comps.length, 1);
assert.equal(parsed.invalid, 2);
assert.deepEqual(parsed.comps[0].subject, subject);
assert.equal(parsed.comps[0].mode, "table");
assert.deepEqual(parsed.unavailable, [{ id: saved.id, title: saved.title }]);
assert.deepEqual(
  parseSavedComparisons([
    { id: saved.id, title: { unsafe: true } },
    { id: "invalid", title: "Broken" },
  ]).unavailable,
  [{ id: saved.id, title: "Unavailable comparison" }]
);

for (const unsafe of [
  "https://evil.example",
  "//evil.example",
  "/\\evil.example",
  "/\n/evil.example",
  "/auth/callback",
  null,
]) {
  assert.equal(safeNextPath(unsafe), "/saved");
}
assert.equal(
  safeNextPath("/versus?a=lebron-james&b=marcus-rashford&mode=table"),
  "/versus?a=lebron-james&b=marcus-rashford&mode=table"
);
assert.equal(safeNextPath("/login?reset=1"), "/login?reset=1");
const callback = new URL(authCallbackUrl("https://morphmatch.example", "/login?reset=1"));
assert.equal(callback.pathname, "/auth/callback");
assert.equal(callback.searchParams.get("next"), "/login?reset=1");
assert.equal(
  authRequestOrigin(
    new Request("http://localhost:3100/auth/callback", { headers: { host: "127.0.0.1:3100" } })
  ),
  "http://127.0.0.1:3100"
);
for (const host of [
  "evil.example",
  "user@evil.example",
  "localhost:3100/evil",
  "localhost:invalid",
]) {
  assert.equal(
    authRequestOrigin(
      new Request("https://morphmatch.example/auth/callback", { headers: { host } })
    ),
    "https://morphmatch.example"
  );
}
assert.equal(
  authRequestOrigin(
    new Request("https://morphmatch.example/auth/callback", { headers: { host: "localhost:3100" } })
  ),
  "https://morphmatch.example"
);
assert.equal(
  authRequestOrigin(
    new Request("http://localhost:3100/auth/callback", {
      headers: { host: "127.0.0.1:3100", "x-forwarded-host": "evil.example" },
    })
  ),
  "http://127.0.0.1:3100"
);
assert.equal(
  authRequestOrigin(
    new Request("http://localhost:3100/auth/callback", { headers: { host: "127.0.0.1:3100" } }),
    new URL("https://morphmatch.example")
  ),
  "https://morphmatch.example"
);

const envNames = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
] as const;
const anonKey = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role: "anon", iss: "supabase" })).toString("base64url")}.signature`;
assert.equal(isPublicSupabaseKey(anonKey), true);
assert.equal(isPublicSupabaseKey("sb_publishable_example"), true);
for (const invalidKey of [
  "arbitrary",
  "",
  "sb_publishable_",
  "sb_secret_example",
  "malformed.jwt.key",
]) {
  assert.equal(isPublicSupabaseKey(invalidKey), false);
}
const previous = envNames.map((name) => process.env[name]);
try {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "sb_publishable_test";
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  assert.ok(getSupabaseConfig());
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = anonKey;
  assert.ok(getSupabaseConfig());
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "   ";
  assert.equal(getSupabaseConfig()?.key, anonKey);
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "arbitrary";
  assert.equal(getSupabaseConfig(), null);
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "sb_publishable_test";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_secret_never_public";
  assert.equal(isSecretSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY), true);
  assert.equal(getSupabaseConfig(), null);
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = `e30.${Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url")}.signature`;
  assert.equal(isSecretSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY), true);
  assert.equal(getSupabaseConfig(), null);
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "sb_secret_lower_priority";
  assert.equal(getSupabaseConfig(), null);
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "sb_publishable_test";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "not a URL";
  assert.equal(getSupabaseConfig(), null);
} finally {
  envNames.forEach((name, index) => {
    if (previous[index] === undefined) delete process.env[name];
    else process.env[name] = previous[index];
  });
}

console.log("Account validation and safe redirect regressions passed.");
