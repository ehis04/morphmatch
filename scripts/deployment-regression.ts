import assert from "node:assert/strict";
import robots from "../app/robots";
import sitemap from "../app/sitemap";
import { getSiteUrl } from "../lib/site";

const envNames = ["SITE_URL", "VERCEL_ENV", "VERCEL_URL"] as const;
const previous = envNames.map((name) => process.env[name]);

try {
  envNames.forEach((name) => delete process.env[name]);
  assert.equal(getSiteUrl(), undefined);
  assert.deepEqual(sitemap(), []);
  assert.deepEqual(robots(), {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/login", "/saved", "/auth/"],
    },
  });

  process.env.VERCEL_ENV = "preview";
  process.env.VERCEL_URL = "morphmatch-preview-fixture.vercel.app";
  assert.equal(getSiteUrl()?.origin, "https://morphmatch-preview-fixture.vercel.app");
  assert.equal(robots().sitemap, "https://morphmatch-preview-fixture.vercel.app/sitemap.xml");
  process.env.VERCEL_ENV = "production";
  assert.equal(getSiteUrl(), undefined, "Production must use an explicit public origin");

  process.env.SITE_URL = "https://morphmatch.example/deployment/path?preview=1#section";
  assert.equal(getSiteUrl()?.href, "https://morphmatch.example/");
  assert.equal(robots().sitemap, "https://morphmatch.example/sitemap.xml");
  assert.deepEqual(sitemap(), [
    { url: "https://morphmatch.example/" },
    { url: "https://morphmatch.example/match" },
    { url: "https://morphmatch.example/versus" },
    { url: "https://morphmatch.example/athletes" },
    { url: "https://morphmatch.example/privacy" },
  ]);

  process.env.SITE_URL = "http://localhost:3000/";
  assert.equal(getSiteUrl()?.origin, "http://localhost:3000");
  assert.equal(robots().sitemap, "http://localhost:3000/sitemap.xml");

  for (const value of [
    "not-a-url",
    "/relative-origin",
    "ftp://morphmatch.example",
    "javascript:alert(1)",
    "https://username@morphmatch.example",
    "https://username:password@morphmatch.example",
    "https://:password@morphmatch.example",
  ]) {
    process.env.SITE_URL = value;
    assert.throws(getSiteUrl, `SITE_URL must reject ${value}`);
    assert.throws(robots, "Robots must reject an invalid public origin");
    assert.throws(sitemap, "Sitemap must reject an invalid public origin");
  }

  console.log("Deployment origin, robots and sitemap regression checks passed.");
} finally {
  envNames.forEach((name, index) => {
    if (previous[index] === undefined) delete process.env[name];
    else process.env[name] = previous[index];
  });
}
