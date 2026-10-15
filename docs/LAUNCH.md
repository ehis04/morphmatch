# Launch record — 14 October 2026

The public matching, athlete browsing, comparison and sharing experience is live at **https://morphmatch.vercel.app**. The account release is staged behind Vercel authentication with production settings. Public signup remains closed while the iCloud sender's reported full-storage condition is resolved.

**SMTP update — 15 October 2026:** the owner replaced Yahoo with iCloud SMTP and authorized messages to the configured iCloud address. Signup, confirmation resend and password-recovery requests succeeded. All eight hosted email/account checks passed, including actual sent-token callbacks, confirmation enforcement, password changes and save/view/delete/sign-out. Independent cleanup verification found zero users and saved comparisons. The owner cannot check receipt because iCloud storage is full and explicitly waived inbox confirmation. That waiver is recorded; inbox delivery remains unverified. Apple documents that full iCloud storage also prevents outgoing mail, so sender capacity remains an operational blocker to reliable public signup and recovery. [Apple's storage guidance](https://support.apple.com/en-gb/102198).

## Services and configuration

| Component       | Current state                                                                                                                                                           |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source          | [ehis04/morphmatch](https://github.com/ehis04/morphmatch), branch `main`, connected to Vercel Git deployments.                                                          |
| Public hosting  | [Vercel project](https://vercel.com/ehis-oghina-s-projects/morphmatch), Hobby plan, HTTPS, Node.js 22.x, functions in Ireland (`dub1`).                                 |
| Account preview | [Protected deployment](https://morphmatch-keeujxbh0-ehis-oghina-s-projects.vercel.app), with hosted accounts enabled. Vercel protection remains enabled.                |
| Account release | [Staged production candidate](https://morphmatch-e59d82nvc-ehis-oghina-s-projects.vercel.app), Node.js 22.x, Ireland, protected by Vercel authentication; not promoted. |
| Database        | [Supabase project](https://supabase.com/dashboard/project/ccatnexlnlnvinjkkldy), Free plan, Ireland (`eu-west-1`), healthy at provisioning.                             |
| Schema          | Migrations `0001`–`0004` applied, with migration history preserved. Ownership policies, payload constraints and least privileges verified against the hosted database.  |
| Authentication  | Canonical Site URL, exact public/preview callbacks and a restricted preview callback query pattern configured; confirmation required, Google off, signup disabled.      |
| Email           | iCloud SMTP on port 587. Three Auth/SMTP handoffs accepted; inbox delivery unverified and its check waived. Owner reports full storage affecting the sender.            |

Production uses `SITE_URL=https://morphmatch.vercel.app` and Google disabled. Its Supabase public URL/key are omitted to keep the account UI closed. Preview has the hosted public URL/key and derives its own origin from Vercel. No database password, service-role key or management token is required in the application environment.

Candidate `dpl_Ct5T8RmpTKQFr48ydiDSzJwEqQC9` was built from `e1a0562` using deployment-specific build/runtime overrides for the hosted public URL/key, canonical `SITE_URL` and disabled Google. The command used `--prod --skip-domain`, so it did not change global Production variables or move the public domain. Anonymous requests to the candidate require Vercel authentication. The canonical domain retained deployment `dpl_DR8Gf6tpdDVPShioYD2DTupz62qN` when the candidate was staged.

Provisioning credentials and temporary verification artifacts are retained only in ignored `.vercel/` files with restricted permissions. `.env.local` retains the local Supabase settings. Never commit or upload these private files. The deployment upload manifest was checked and excluded local environment/provisioning files.

## Verification

- The initial pushed revision passed [GitHub CI](https://github.com/ehis04/morphmatch/actions/runs/38644142406): installation, lint, types, formatting, regressions, production build/audit and 70 public browser checks.
- The live production deployment passed 59 checks on desktop, Android Chromium and compact 320px screens, plus one intentional desktop touch-test skip. These exercised matching, storage failures, reset, filtering/history, sharing fallbacks, keyboard controls, viewport fit, automated accessibility, security headers and metadata endpoints.
- The protected account deployment passed six desktop/Android checks for Numbers saving/viewing/reopening, password-change navigation, account isolation, deletion retry and restoring custom measurements with blocked storage.
- Hosted API checks verified anonymous denial, two-user ownership isolation, forged ownership rejection, forbidden updates, save/delete behavior and eight malformed payload rejections. Disposable users were removed; the final check found zero users and saved comparisons.
- Production runtime error and HTTP 5xx scans returned no records in the checked 30-minute window. This is a launch observation, not continuous monitoring or a load test.
- Local release preparation passed on Node.js 22 with the actual public origin. Production dependencies reported zero vulnerabilities.
- Hosted link-generation checks found and corrected a preview callback allow-list gap: links with `next` had fallen back to the canonical homepage. The exact preview-host `/auth/callback\?**` pattern now preserves saved-page and recovery queries. Wrong paths and foreign hosts remain rejected. Disposable verification users were removed; these link-generation checks sent no mail.
- The initial Yahoo signup test reproduced SMTP 535 temporary authentication blocking. The owner switched to iCloud. Three real email requests then succeeded, and eight protected-preview checks passed: confirmation required before login, resend, actual emailed-token PKCE callbacks, normal sign-in/save/view/delete/sign-out, recovery, password update and signing in with the recovered password. Inbox arrival is not inferred from API success.
- The email checker's immediate cleanup confirmation encountered a transport failure after deleting its test account. A separate scoped database query verified zero test users/saves and zero total users/saves. No extra email test was needed. Signup was closed again; Production still has no Supabase URL/key.
- The accounts-enabled production configuration passed validation against the actual canonical origin and hosted public key on Node.js 22. This validates the intended settings without changing the public deployment.
- The staged production candidate passed its guarded cloud build and all six desktop/Android account checks: Numbers save/reopen, account isolation/deletion retry and custom-profile restoration with blocked storage. These use the candidate's actual production build/runtime settings. Its two confirmed disposable users were removed; independent scoped and total counts found zero users and saved comparisons. No messages were sent by these checks. Candidate protection and the unchanged canonical deployment were verified again after testing.

The deployment build runs `npm run build:production`: environment validation, lint, types, regressions, production dependency audit and optimized build. GitHub Actions additionally checks source formatting and runs browser checks. Local `prepare:production` checks formatting before the guarded build. Vercel rewrites `vercel.json` before cloud builds, so formatting validation runs against the original source in CI rather than that generated file. These are separate services; the current setup does not make Vercel wait for GitHub's browser job.

Node.js is pinned to major 22 in the package, lockfile, `.nvmrc` and hosting settings. Generated Vercel/Supabase state is excluded from source-quality checks so linking a project does not break local verification.

The function region is pinned to `dub1` in `vercel.json` so automatic Git deployments stay near the Ireland database; a one-off CLI deployment region does not persist to later Git builds.

## Remaining account launch steps

1. Restore capacity in the iCloud account used as sender, or configure an SMTP provider with capacity. The owner waived the inbox-receipt check; no additional inbox confirmation is required merely to proceed. The known sender storage condition still needs resolution. Do not delete personal iCloud content or buy storage through application automation.
2. Verify the current SMTP configuration, enable public signup and add the hosted Supabase URL/public publishable key to global Vercel Production variables so future Git deployments retain accounts. Keep the unused anon alias absent and Google disabled unless its provider has been configured.
3. Promote the verified production candidate, then verify the canonical public account and email callbacks and inspect runtime logs. This candidate already has the canonical `SITE_URL`; the earlier preview artifact must not be promoted unchanged because its origin was fixed to the preview during its build.
4. Native sharing and email-app handoff should also be checked on a physical phone. No native app package is included in this repository.

iCloud uses an [app-specific password and authenticated SMTP](https://support.apple.com/en-us/102525). A dedicated transactional provider is recommended as public usage grows; no email-provider subscription has been purchased.

A custom website domain and Google sign-in are optional; neither is needed for the public matching site. An hourly and manually runnable GitHub Actions availability check probes the public pages and metadata, using the repository variable `PRODUCTION_SITE_URL`. GitHub notification preferences control who receives workflow-failure notifications; delivery has not been certified. Scheduled Actions can be delayed and do not provide continuous monitoring. Continuous database availability, automatic backups and monitoring with guaranteed response still require an owner-approved service/operating choice. No paid plan, backup service or monitoring subscription was purchased or enabled. The Free database plan may pause after inactivity.

The repository's existing dataset-sourcing and development-tooling limitations remain in [the original review](REVIEW.md). Earlier implementation and local/mobile verification evidence is in [production readiness](PRODUCTION_READINESS.md).
