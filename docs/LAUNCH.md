# Launch record — 14 October 2026

The public matching, athlete browsing, comparison and sharing experience is live at **https://morphmatch.vercel.app**. Public accounts are deliberately disabled until a verified production email sender is configured. The account experience is deployed and tested on a protected preview.

## Services and configuration

| Component       | Current state                                                                                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source          | [ehis04/morphmatch](https://github.com/ehis04/morphmatch), branch `main`, connected to Vercel Git deployments.                                                         |
| Public hosting  | [Vercel project](https://vercel.com/ehis-oghina-s-projects/morphmatch), Hobby plan, HTTPS, Node.js 22.x, functions in Ireland (`dub1`).                                |
| Account preview | [Protected deployment](https://morphmatch-keeujxbh0-ehis-oghina-s-projects.vercel.app), with hosted accounts enabled. Vercel protection remains enabled.               |
| Database        | [Supabase project](https://supabase.com/dashboard/project/ccatnexlnlnvinjkkldy), Free plan, Ireland (`eu-west-1`), healthy at provisioning.                            |
| Schema          | Migrations `0001`–`0004` applied, with migration history preserved. Ownership policies, payload constraints and least privileges verified against the hosted database. |
| Authentication  | Canonical Site URL and exact public/preview callbacks configured; email/password enabled, email confirmation required, Google disabled, public signup disabled.        |
| Email           | Custom SMTP is not configured. Public confirmation and recovery delivery are not certified.                                                                            |

Production uses `SITE_URL=https://morphmatch.vercel.app` and Google disabled. Its Supabase public URL/key are omitted to keep the account UI closed. Preview has the hosted public URL/key and derives its own origin from Vercel. No database password, service-role key or management token is required in the application environment.

Provisioning credentials and temporary verification artifacts are retained only in ignored `.vercel/` files with restricted permissions. `.env.local` retains the local Supabase settings. Never commit or upload these private files. The deployment upload manifest was checked and excluded local environment/provisioning files.

## Verification

- The initial pushed revision passed [GitHub CI](https://github.com/ehis04/morphmatch/actions/runs/38644142406): installation, lint, types, formatting, regressions, production build/audit and 70 public browser checks.
- The live production deployment passed 59 checks on desktop, Android Chromium and compact 320px screens, plus one intentional desktop touch-test skip. These exercised matching, storage failures, reset, filtering/history, sharing fallbacks, keyboard controls, viewport fit, automated accessibility, security headers and metadata endpoints.
- The protected account deployment passed six desktop/Android checks for Numbers saving/viewing/reopening, password-change navigation, account isolation, deletion retry and restoring custom measurements with blocked storage.
- Hosted API checks verified anonymous denial, two-user ownership isolation, forged ownership rejection, forbidden updates, save/delete behavior and eight malformed payload rejections. Disposable users were removed; the final check found zero users and saved comparisons.
- Production runtime error and HTTP 5xx scans returned no records in the checked 30-minute window. This is a launch observation, not continuous monitoring or a load test.
- Local release preparation passed on Node.js 22 with the actual public origin. Production dependencies reported zero vulnerabilities.

The deployment build runs `npm run build:production`: environment validation, lint, types, regressions, production dependency audit and optimized build. GitHub Actions additionally checks source formatting and runs browser checks. Local `prepare:production` checks formatting before the guarded build. Vercel rewrites `vercel.json` before cloud builds, so formatting validation runs against the original source in CI rather than that generated file. These are separate services; the current setup does not make Vercel wait for GitHub's browser job.

Node.js is pinned to major 22 in the package, lockfile, `.nvmrc` and hosting settings. Generated Vercel/Supabase state is excluded from source-quality checks so linking a project does not break local verification.

The function region is pinned to `dub1` in `vercel.json` so automatic Git deployments stay near the Ireland database; a one-off CLI deployment region does not persist to later Git builds.

## Remaining owner setup

1. Configure a verified SMTP provider/sender in the new Supabase project's Authentication email settings. This requires an email-provider account and, normally, control of a sending domain and its DNS. Do not use the restricted default sender for public registration.
2. Verify real confirmation, resend and password-recovery delivery on the protected preview. Native sharing and email-app handoff should also be checked on a physical phone.
3. Once email delivery is verified, enable public signup and add the hosted Supabase URL/public publishable key to Vercel's Production environment. Keep the unused anon alias absent and Google disabled unless its provider has been configured.
4. Rebuild for Production using the canonical `SITE_URL`, then repeat the real public account journey. Do not promote the preview artifact unchanged: its origin and public settings were fixed for the preview during its build.

A custom website domain and Google sign-in are optional; neither is needed for the public matching site. An hourly and manually runnable GitHub Actions availability check probes the public pages and metadata, using the repository variable `PRODUCTION_SITE_URL`. GitHub notification preferences control who receives workflow-failure notifications; delivery has not been certified. Scheduled Actions can be delayed and do not provide continuous monitoring. Continuous database availability, automatic backups and monitoring with guaranteed response still require an owner-approved service/operating choice. No paid plan, backup service or monitoring subscription was purchased or enabled. The Free database plan may pause after inactivity.

The repository's existing dataset-sourcing and development-tooling limitations remain in [the original review](REVIEW.md). Earlier implementation and local/mobile verification evidence is in [production readiness](PRODUCTION_READINESS.md).
