# Production readiness — 12 October 2026

**Deployment update — 14 October 2026:** the public matching/comparison site is deployed at [morphmatch.vercel.app](https://morphmatch.vercel.app). A hosted Supabase database and protected account preview are configured; public accounts await verified SMTP. Current deployment details are in [the launch record](LAUNCH.md).

MorphMatch is a responsive Next.js website. This repository has no separate native iOS or Android application, mobile store package or offline service worker. The same web deployment serves desktop and mobile browsers.

The complete journey is measurements → local matching and comparison → optional Supabase save → saved comparison reopening or deletion. Public head-to-head links contain athlete IDs and the display mode; reopening personal measurements uses device state rather than putting those measurements into a URL.

## Phases

| Phase                     | Deliverable                                                                                                                                                                          | Status                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| 1. Experience review      | Audit public, account and saved journeys; confirm mobile scope and narrow-screen gaps.                                                                                               | Complete                                                    |
| 2. Finish the experience  | Sharing with native/clipboard/manual fallbacks; reset and field errors; saved measurement reopening; confirmation resend and password-change entry; phone controls and layout fixes. | Complete                                                    |
| 3. Release verification   | Regressions, database integration, production builds and desktop/Android/iOS/320px browser checks, including recovery and storage failures.                                          | Complete                                                    |
| 4. Production preparation | Environment validation, Vercel configuration, CI, social preview and Apple icon, release command and live-launch checklist.                                                          | Repository preparation complete; live hosting setup remains |

## Completed changes and evidence

- Public comparisons offer native sharing, clipboard copying and a selected manual link. Links retain athlete IDs and the chosen view and exclude unrelated query parameters or personal measurements.
- Matching offers default measurement reset, individual accessible field errors and a mobile jump to results. Saved custom comparisons restore the profile through shared state, including when profile storage is blocked, and retain the Numbers or silhouette view.
- Accounts offer confirmation resend and a discoverable password-change entry. Unreadable legacy saves retain a safe owner-scoped deletion control. Existing account isolation, recovery and retry behavior remain verified.
- Narrow-screen grids, long names, navigation dismissal, picker keyboard controls, touch targets and input sizing were corrected. Viewport checks compare the document's actual client width, avoiding mobile layout expansion that can mask overflow.
- Release preparation includes a guarded Vercel build, a final preparation command, Android/iOS browser CI coverage, a social preview image, an Apple touch icon and updated privacy/setup guidance.

| Verification                                             | Result                                                                                                                                                                                                                      |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fresh `npm ci` and final `npm run prepare:production`    | Passed from the repository lockfile; all preparation steps and optimized build passed with accounts disabled and a fixture HTTPS origin.                                                                                    |
| Lint, TypeScript, formatting and seven regression suites | Passed against the completed source, including the final preparation command.                                                                                                                                               |
| Public browser matrix                                    | All 70 runnable checks passed across desktop, Android Chromium, iOS WebKit and compact screens. Nine gated account checks and one desktop-only touch check are intentionally skipped in this mode.                          |
| Connected account browser matrix                         | All nine checks passed: three flows on desktop, Android and iOS, including actual local email confirmation/recovery, saved-profile restoration with blocked storage, ownership isolation and deletion retry/legacy cleanup. |
| Local Supabase integration                               | Signup, sign-in, save/delete, payload constraints, ownership isolation and least-privilege grants passed without resetting existing data.                                                                                   |
| Automated accessibility                                  | Zero WCAG A/AA violations across seven main routes in three browser projects (21 scans). These supplement keyboard checks and do not constitute a complete manual accessibility audit.                                      |
| Production dependency audit                              | Zero reported vulnerabilities. Development-tooling limitations are retained in the original review.                                                                                                                         |
| Production guard                                         | Rejects the current local API/missing public origin, secret browser keys, invalid Google settings and local/private/placeholder origins, including trailing-dot DNS forms. Valid release fixtures pass.                     |

The public matrix needed three serial reruns after host memory pressure caused browser crashes/timeouts; all passed with one worker. The account suite needed a test-fixture correction to insert through its authenticated owner rather than the deliberately restricted service role; all three corrected flows passed. No database privileges were broadened. A read-only cleanup check found zero disposable test accounts remaining. CI has been configured but cannot be certified locally until it runs on the pushed revision.

## Production configuration

- Use Node.js 22.x, HTTPS and a real public `SITE_URL` containing only the origin. Set it before building, and keep the same value at runtime.
- Accounts are optional. With accounts disabled, leave both Supabase key aliases and its URL empty, and leave Google sign-in disabled.
- With accounts enabled, use the hosted project's HTTPS URL and public publishable/anon key. Apply migrations `0001` through `0004` in order. Keep secret/service-role keys out of browser variables.
- Configure the hosted Supabase Site URL, the exact `/auth/callback` redirect allow-list and a production email sender. Test confirmation, resend and recovery with your own address. Supabase's [built-in SMTP is for testing](https://supabase.com/docs/guides/auth/auth-smtp).
- Enable Google only after configuring its provider and verifying the callback. Keep it disabled otherwise.

`npm run check:production` checks environment syntax, HTTPS/public origins, local API mistakes, public key types and Google prerequisites. It never prints keys or contacts hosted services. It cannot certify SMTP, OAuth credentials or database migrations.

The committed `vercel.json` uses `npm run build:production`, so incomplete production settings, lint/type failures, regression failures or a failed production audit stop the deployment build. Formatting is checked in GitHub CI and local `prepare:production`; Vercel rewrites its deployment configuration before executing cloud build commands. Vercel preview builds can use the automatically provided `VERCEL_URL` when `SITE_URL` is absent; set `SITE_URL` for the Production environment. Preview authentication also needs its exact callback allowed in the selected Supabase project. [Vercel system variables](https://vercel.com/docs/environment-variables/system-environment-variables).

## Verification and release

Run local checks before replacing local Supabase settings with hosted ones:

```bash
npm ci
npx playwright install chromium webkit
npm run verify
npm run test:e2e
npm run test:accounts
MORPHMATCH_ACCOUNTS_E2E=1 npm run test:e2e -- tests/accounts.spec.ts --workers=1
```

The last two commands require the existing local Supabase stack and local public settings. They use disposable users and remove them without resetting the database. Linux browser verification may require `npx playwright install --with-deps chromium webkit` once. If port 3100 is already occupied, set `MORPHMATCH_E2E_PORT` to an unused port. This review used port 3105 and one worker for serial reruns and account checks. Browser projects cover desktop Chrome, Android Chromium, iOS WebKit and compact 320px screens; device emulation is not a physical-device certification. Native share-sheet behavior and email apps still need a brief check on a real phone after deployment.

The release command was exercised using a fixture origin for build validation, with accounts disabled; that fixture was not deployed or written into `.env.local`. The local build artifact is a validation build. After configuring the real production environment, create the actual release artifact:

```bash
npm run prepare:production
```

This checks production settings, lint, types, formatting, regressions and the production dependency audit, then creates the final build with the intended environment. Browser tests rebuild with their own test settings; run the preparation command after them so the final artifact retains production settings. Public environment variables are fixed into client assets during the build, as described in [Next.js environment guidance](https://nextjs.org/docs/app/guides/environment-variables).

## Final launch check

1. Confirm GitHub verification passes for the revision being released, and set hosting variables before its production build.
2. Verify the deployed public origin and HTTPS, mobile navigation, matching, head-to-head sharing, imagery fallbacks, privacy information and metadata endpoints.
3. If using accounts, verify real email confirmation/resend/recovery, save/reopen/delete, sign-out and Google if enabled. Use a separate test account; avoid testing with existing customer data.
4. Check hosting errors after the first real sessions. Retain the previous deployment for rollback; the new migrations preserve existing rows.

The chosen production domain, hosted Supabase provider/SMTP settings and actual deployment are external setup tasks. No public deployment or native mobile package has been created by this readiness work. Dataset sourcing and upstream lint-tooling limitations remain documented in [the original review](REVIEW.md).
