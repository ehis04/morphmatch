# MorphMatch

**Find your professional athlete body double.** Enter your height, weight and wingspan, and MorphMatch matches you against 350 professionals across football, basketball, tennis and swimming — then draws you both to scale on the measuring wall, overlapped or side by side.

Built with Next.js 16, React 19, Tailwind CSS 4, TypeScript and Supabase. Matching needs no backend; accounts use a separately configured Supabase project.

**Live — 16 October 2026:** [morphmatch.vercel.app](https://morphmatch.vercel.app). Email/password accounts and saved comparisons are available alongside matching, browsing and sharing. Public signup is enabled and email confirmation is required. See the [launch record](docs/LAUNCH.md) for Gmail SMTP configuration, verification and operational limits.

## Features

- **Find my match** — a weighted similarity engine scores every athlete against your measurements (height, weight, wingspan and ape index), with a "Surprise me" reroll weighted toward your best matches
- **Scaled silhouettes** — approximate body shapes generated from measurements at 1 SVG unit = 1 cm; view as overlay, side by side, or a numbers table with signed deltas and estimate markers
- **Head-to-head** — compare any two pros across sports and eras; share the selected athletes and view through native sharing, clipboard or a selectable link
- **Robust filters** — sport, gender, league/tour, country, and active/retired era
- **Athlete wall** — browse, search and sort the full database, with freely licensed photos from Wikipedia (and a graceful silhouette fallback)
- **Accounts & saved comparisons** — Supabase email/password, confirmation resend, password recovery and optional Google sign-in, with row-level security; saved personal comparisons restore measurements privately on your device; accounts switch off when Supabase is absent
- **Units** — metric/imperial toggle everywhere, persisted locally
- **Phone-friendly web experience** — touch controls, readable inputs, narrow-screen layouts, measurement reset and a shortcut to match results; no separate native mobile app is included

## Quick start (VS Code / local)

Requires Node.js 22.x, matching CI and the production runtime. If you use nvm, run `nvm use` first.

```bash
git clone <your-repo-url> morphmatch
cd morphmatch
npm ci
cp .env.example .env.local   # optional — only needed for accounts
npm run dev
```

Open http://localhost:3000. Everything except sign-in and saved comparisons works with no configuration at all.

### Scripts

| Command                           | What it does                                                                             |
| --------------------------------- | ---------------------------------------------------------------------------------------- |
| `npm run dev`                     | Dev server with hot reload                                                               |
| `npm run build`                   | Production build                                                                         |
| `npm run check:production`        | Validate public production origins and account settings                                  |
| `npm run build:production`        | Validate settings, lint/types, regressions and production audit, then build (Vercel)     |
| `npm run prepare:production`      | Verify source formatting, then run the guarded production build                          |
| `npm run lint`                    | ESLint (Next core-web-vitals + TypeScript rules)                                         |
| `npm run typecheck`               | TypeScript, no emit                                                                      |
| `npm run format` / `format:check` | Prettier write / verify                                                                  |
| `npm run smoke`                   | Data-integrity + engine sanity checks (run after editing athlete data)                   |
| `npm test`                        | Data, matching, comparison, account-validation and deployment checks                     |
| `npm run test:e2e`                | Desktop Chrome, Android Chromium, iOS WebKit and 320px browser checks; accounts disabled |
| `npm run verify`                  | Lint, types, formatting, regression tests and production build                           |

## Local database and accounts

The 350-athlete dataset is already bundled in `data/`; it needs no database server or import. Supabase stores only accounts (`auth.users`) and saved comparisons (`public.saved_comps`). The saved-comparison schema has ownership policies for reading, inserting and deleting, plus an index on user and creation time.

Install the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) and start Docker, then run from this directory:

```bash
npm run db:setup
npm run dev
```

`db:setup` starts the local Supabase stack, applies migrations to a new database, and writes its public API URL and anon key into `.env.local`, preserving unrelated variables. It replaces any existing Supabase URL/key with the local values. No hosted project is needed. The first start downloads container images and can take several minutes.

- App: http://localhost:3000
- Supabase Studio (inspect tables and users): http://127.0.0.1:55323
- API: http://127.0.0.1:55321
- PostgreSQL: `postgresql://postgres:postgres@127.0.0.1:55322/postgres`
- Local email inbox: http://127.0.0.1:55324

Sign up through `/login` with an email and password, then save a comparison. Email confirmation is disabled **only for local development**. Google OAuth requires separate provider credentials and is not configured locally.

`npm run db:status` shows service status. `npm run db:stop` stops services while retaining database data. After adding migrations, `npm run db:reset` rebuilds the **local database and deletes its accounts and saved comparisons**; it applies all migrations. No sample users or comparisons are seeded. Restart Next.js after changing environment variables. If Docker reports permission denied, ensure your user can access the Docker daemon.

## Enabling accounts (Supabase, ~5 minutes)

1. Create a free project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Apply **all** SQL files in [`supabase/migrations/`](supabase/migrations/) in order. `0001` creates the table and ownership policies, `0002` grants authenticated access, `0003` validates new comparison payloads, and `0004` removes inherited table privileges that bypass ownership rules. Existing rows are preserved; malformed legacy rows are reported in the Saved view.
3. Copy the **Project URL** and a **publishable key** into `.env.local`:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

   `NEXT_PUBLIC_SUPABASE_ANON_KEY` remains supported as a fallback. Never put a secret or service-role key in a `NEXT_PUBLIC_*` variable.

4. Set the production **Site URL** in Supabase and allow your exact `/auth/callback` URL under **Authentication → URL Configuration → Redirect URLs**. Include the local callback URLs for development. Keep email confirmation enabled for hosted accounts, and configure [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp) before opening public registration: Supabase's built-in sender is for testing and restricts recipients. Test confirmation and password-recovery emails on the production domain.

   For a separate preview host, allow its exact callback and its query parameters, for example `https://your-preview.vercel.app/auth/callback\?**`. Supabase matches the full preview redirect, including the `next` and per-flow query parameters. Without that query pattern, email links can fall back to the production Site URL. Keep the hostname and callback path restricted.

5. **Google sign-in (optional):** configure OAuth credentials in **Authentication → Providers → Google**, then set `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`. The Google button is hidden by default.
6. Restart the dev server or rebuild production after changing public environment variables.

The anon key is safe to expose in the browser — that's what it's for; data access is enforced by RLS policies, not by secrecy of the key.

## Deploying to Vercel

1. Push the repo to GitHub (below).
2. At [vercel.com/new](https://vercel.com/new), import the repository. The committed `vercel.json` selects Next.js and runs the production environment check before building.
3. Set `SITE_URL` to your real public HTTPS origin **before building**, to populate sitemap and social metadata. Use Node.js 22.x. Production builds reject missing or placeholder origins; previews can use Vercel's own preview URL when `SITE_URL` is absent.
4. If you want accounts, configure the Supabase public URL/key in the hosting environment, apply all database migrations, configure SMTP and callback URLs as above, then redeploy. Leave the Supabase variables empty for a public matching-only site.
5. Run the verification commands below, then configure the real hosted environment and run `npm run prepare:production` to create the final artifact. After deployment, test the public domain, real phone sharing, sign-up confirmation/resend, recovery, save/reopen/delete and sign-out. Local credentials are for local development only.

The phased implementation and earlier verification evidence are in [`docs/PRODUCTION_READINESS.md`](docs/PRODUCTION_READINESS.md). The current public deployment, hosted account configuration and operational checks are recorded in [`docs/LAUNCH.md`](docs/LAUNCH.md). The instructions above also cover setting up a separate deployment.

The included GitHub Actions workflow ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs lint, types, formatting, regression checks, a production build, production dependency auditing and browser tests on pushes and pull requests. Its build explicitly disables accounts to exercise that supported deployment mode.

### Verification

```bash
npm ci
npm run verify
npx playwright install chromium webkit
npm run test:e2e
```

Browser tests use port 3100 (override with `MORPHMATCH_E2E_PORT` when it is occupied) and mock third-party photo outages so results do not depend on Wikipedia uptime. On Linux, browser libraries can be installed with `npx playwright install --with-deps chromium webkit`. The device projects emulate mobile browsers; they do not certify physical phones or native app packages. For local account integration checks, start Supabase and run `npm run test:accounts`; the script uses disposable users, verifies ownership isolation and cleans them up without resetting the database. A separate deployment needs its own hosted email checks and OAuth verification if enabled. The launch record distinguishes the current hosted checks from inbox receipt, which remains unverified and was explicitly waived by the owner.

With `.env.local` configured for the running local Supabase stack, verify the complete account and recovery UI with:

```bash
MORPHMATCH_ACCOUNTS_E2E=1 npm run test:e2e -- tests/accounts.spec.ts --workers=1
```

This uses disposable local accounts and the local email inbox, including changing a password through a recovery email. It does not reset the database. Rebuild before switching between tests that enable or disable accounts; `PLAYWRIGHT_SKIP_BUILD=1` is only for an already matching build.

The 16 October 2026 dependency audit reported zero production vulnerabilities and five high-severity development-only reports in the [`braces` dependency chain](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) through Next.js's ESLint tooling. The advisory still lists no patched version, and npm's proposed older Next.js lint configuration is incompatible with this setup. Recheck compatible upstream fixes during maintenance; do not use `npm audit fix --force` to downgrade Next.js tooling.

At the 11 October review, ESLint 9 had [reached end of life](https://eslint.org/version-support/), while the bundled React and accessibility plugins declared peer support through ESLint 9. The compatible lint setup was retained and verified. Recheck plugin compatibility before upgrading the lint toolchain.

### Pushing to GitHub

```bash
git init
git add -A
git commit -m "MorphMatch v1"
git branch -M main
git remote add origin git@github.com:<you>/morphmatch.git
git push -u origin main
```

## How matching works

Each athlete gets a component score per attribute based on distance from you, relative to a "full penalty" range (±16 cm height, ±20 kg weight, ±16 cm wingspan, ±10 cm ape index), combined with weights of 0.38 / 0.27 / 0.23 / 0.12. If you don't enter a wingspan, the wingspan and ape-index components drop out and the remaining weights renormalise. Scores map to tiers: **Body double** (92+), **Close match** (84+), **Similar build** (72+). The engine lives in [`lib/similarity.ts`](lib/similarity.ts) — tune the constants to taste.

Silhouettes are built in [`lib/silhouette.ts`](lib/silhouette.ts): overall scale comes from height, arm length from wingspan, and limb/torso girth from a BMI-derived width factor, with a fixed slight arm abduction so wingspan differences read clearly in overlays.

## Adding or correcting athletes

The database is plain TypeScript in [`data/`](data/) — one file per sport, no external service. Add a line:

```ts
{ id: "jane-doe", name: "Jane Doe", sport: "tennis", gender: "f", country: "IE",
  league: "WTA", position: "Right-handed", heightCm: 178, weightKg: 68,
  born: 1999, active: true, wiki: "Jane_Doe" },
```

- `id` must be unique (kebab-case); `country` is ISO 3166-1 alpha-2; `wiki` is the English Wikipedia article slug (used only for the photo — a wrong slug just falls back to the silhouette avatar).
- Omit `wingspanCm` unless you have a published measurement — it will be estimated from sport-typical proportions and badged **≈** in the UI. Include it only for real figures (e.g. NBA combine data).
- Run `npm run smoke` afterwards; it fails on duplicate ids, bad country codes, and implausible measurements.

## Data honesty

The supplied dataset is a reference snapshot, with league assignments based on the original 2025/26 season and legends assigned their best-known league. Career status and league labels are not live. Individual records currently lack source citations, so the review verifies structure and plausibility rather than independently certifying all 350 measurements. Treat the listed figures as card stats, not lab measurements. Everything badged **≈** is an estimate, including the user's height-based wingspan when omitted. Silhouettes approximate proportions, and scores do not predict athletic performance or appearance.

## Architecture notes

- **Static dataset, dynamic accounts.** Athletes ship in the bundle; Supabase holds account and saved-comparison data. Matching runs client-side and needs no API call after the app loads. There is no offline service worker.
- **Graceful degrade.** Every Supabase touchpoint checks `isSupabaseConfigured`; with no env vars the save/sign-in UI explains itself instead of erroring.
- **Next.js 16 `proxy.ts`** (the successor to `middleware.ts`) keeps Supabase sessions refreshed.
- **Photos** load lazily from Wikipedia and Wikimedia Commons with source, author and licence credits; requests are deduplicated, and failed or unsupported images fall back to silhouettes.

## License

MIT — see [LICENSE](LICENSE).
