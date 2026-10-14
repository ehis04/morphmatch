import assert from "node:assert/strict";
import { inspectProductionEnvironment } from "../lib/production";
import { publicComparisonHref } from "../lib/share";

const valid = { SITE_URL: "https://morphmatch-release-fixture.vercel.app" };
assert.deepEqual(inspectProductionEnvironment(valid), {
  errors: [],
  origin: valid.SITE_URL,
  accounts: false,
});
const accounts = {
  ...valid,
  NEXT_PUBLIC_SUPABASE_URL: "https://release-fixture.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture",
  NEXT_PUBLIC_GOOGLE_AUTH_ENABLED: "true",
};
assert.deepEqual(inspectProductionEnvironment(accounts), {
  errors: [],
  origin: valid.SITE_URL,
  accounts: true,
});
for (const SITE_URL of [
  "",
  "http://morphmatch.com",
  "https://localhost",
  "https://localhost.",
  "https://service.local.",
  "https://127.0.0.1",
  "https://[::1]",
  "https://192.168.1.1",
  "https://172.16.0.1",
  "https://10.0.0.1",
  "https://100.64.0.1",
  "https://192.0.2.1",
  "https://198.51.100.1",
  "https://203.0.113.1",
  "https://[2001:db8::1]",
  "https://[fc00::1]",
  "https://[::ffff:127.0.0.1]",
  "https://morphmatch.example",
  "https://example.com",
  "https://example.com.",
  "https://bad_host.vercel.app",
  "https://demo.local",
  "https://user:password@morphmatch.com",
  `${valid.SITE_URL}/path`,
  `${valid.SITE_URL}?preview=1`,
])
  assert.ok(inspectProductionEnvironment({ SITE_URL }).errors.length, SITE_URL);
for (const env of [
  { ...valid, NODE_ENV: "development" },
  { ...valid, NEXT_PUBLIC_GOOGLE_AUTH_ENABLED: "true" },
  { ...valid, NEXT_PUBLIC_GOOGLE_AUTH_ENABLED: "TRUE" },
  { ...accounts, NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:55321" },
  { ...accounts, NEXT_PUBLIC_SUPABASE_URL: "https://localhost" },
  { ...accounts, NEXT_PUBLIC_SUPABASE_URL: "https://release-fixture.supabase.co/path" },
  { ...accounts, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "" },
  { ...accounts, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_fixture" },
  { ...accounts, NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_secret_fixture" },
  { ...accounts, NEXT_PUBLIC_SUPABASE_ANON_KEY: "malformed" },
])
  assert.ok(inspectProductionEnvironment(env).errors.length);

const shared = publicComparisonHref("lionel-messi", "muggsy-bogues", "table");
assert.equal(shared, "/versus?a=lionel-messi&b=muggsy-bogues&mode=table");
assert.throws(() => publicComparisonHref("unknown", "lionel-messi", "overlay"));
console.log("Production configuration and public sharing regressions passed.");
