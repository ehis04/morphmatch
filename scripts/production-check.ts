import { loadEnvConfig } from "@next/env";
import { inspectProductionEnvironment } from "../lib/production";
import { getSiteUrl } from "../lib/site";

loadEnvConfig(process.cwd(), false);

try {
  const result = inspectProductionEnvironment({
    ...process.env,
    SITE_URL: process.env.SITE_URL || getSiteUrl()?.href,
  });
  if (result.errors.length) {
    console.error("Production configuration is incomplete:");
    for (const message of result.errors) console.error(`- ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`Production configuration passed for ${result.origin}.`);
    console.log(`Accounts: ${result.accounts ? "enabled" : "disabled"}.`);
    if (result.accounts)
      console.log(
        "Verify hosted migrations, callback URLs, email delivery and any OAuth provider before launch; see docs/PRODUCTION_READINESS.md."
      );
  }
} catch {
  console.error("Set a valid public HTTPS SITE_URL before preparing production.");
  process.exitCode = 1;
}
