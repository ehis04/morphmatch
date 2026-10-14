import { defineConfig, devices } from "@playwright/test";

const withAccounts = process.env.MORPHMATCH_ACCOUNTS_E2E === "1";
const port = Number(process.env.MORPHMATCH_E2E_PORT || "3100");
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("MORPHMATCH_E2E_PORT must be an available port between 1024 and 65535.");
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  timeout: 60_000,
  reporter: "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"], defaultBrowserType: "chromium" } },
    { name: "ios", use: { ...devices["iPhone 13"] } },
    {
      name: "compact",
      testMatch: /(?:experience|matching)\.spec\.ts/,
      use: {
        browserName: "chromium",
        viewport: { width: 320, height: 568 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: `${process.env.PLAYWRIGHT_SKIP_BUILD === "1" ? "" : "npm run build && "}npm run start -- --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      NEXT_TELEMETRY_DISABLED: "1",
      SITE_URL: "",
      VERCEL_ENV: "",
      VERCEL_URL: "",
      ...(withAccounts
        ? {}
        : {
            NEXT_PUBLIC_SUPABASE_URL: "",
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
            NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
            NEXT_PUBLIC_GOOGLE_AUTH_ENABLED: "false",
          }),
    },
  },
});
