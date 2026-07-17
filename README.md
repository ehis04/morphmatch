# MorphMatch

**Find your professional athlete body double.** Enter your height, weight and wingspan, and MorphMatch matches you against 350 professionals across football, basketball, tennis and swimming — then draws you both to scale on the measuring wall, overlapped or side by side.

Built with Next.js 16, React 19, Tailwind CSS 4, TypeScript and Supabase. Runs entirely on free tiers.

## Features

- **Find my match** — a weighted similarity engine scores every athlete against your measurements (height, weight, wingspan and ape index), with a "Surprise me" reroll weighted toward your best matches
- **True-scale silhouettes** — figures are generated parametrically from the real measurements at 1 SVG unit = 1 cm, so the overlay shows exactly where you differ; view as overlay, side by side, or a numbers table with signed deltas
- **Head-to-head** — compare any two pros across sports and eras (Wembanyama vs Peter Crouch is a good time)
- **Robust filters** — sport, gender, league/tour, country, and active/retired era
- **Athlete wall** — browse, search and sort the full database, with freely licensed photos from Wikipedia (and a graceful silhouette fallback)
- **Accounts & saved comparisons** — Supabase email/password and Google sign-in, with row-level security; the app works fully without Supabase configured, accounts just switch off
- **Units** — metric/imperial toggle everywhere, persisted locally

## Quick start (VS Code / local)

Requires Node.js 20.9+ (22 recommended).

```bash
git clone <your-repo-url> morphmatch
cd morphmatch
npm install
cp .env.example .env.local   # optional — only needed for accounts
npm run dev
```

Open http://localhost:3000. Everything except sign-in and saved comparisons works with no configuration at all.

### Scripts

| Command                           | What it does                                                           |
| --------------------------------- | ---------------------------------------------------------------------- |
| `npm run dev`                     | Dev server with hot reload                                             |
| `npm run build`                   | Production build                                                       |
| `npm run lint`                    | ESLint (Next core-web-vitals + TypeScript rules)                       |
| `npm run typecheck`               | TypeScript, no emit                                                    |
| `npm run format` / `format:check` | Prettier write / verify                                                |
| `npm run smoke`                   | Data-integrity + engine sanity checks (run after editing athlete data) |

## Enabling accounts (Supabase, ~5 minutes)

1. Create a free project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. In the dashboard, open **SQL Editor**, paste the contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), and run it. This creates the `saved_comps` table with row-level security (users can only ever read, insert and delete their own rows).
3. Open **Project Settings → API** and copy the **Project URL** and the **anon / publishable key** into `.env.local`:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

4. Restart `npm run dev`. Email/password sign-up works immediately (Supabase sends confirmation emails on its built-in free SMTP).
5. **Google sign-in (optional):** in **Authentication → Providers → Google**, add OAuth client credentials from Google Cloud Console. Add your site URL and `http://localhost:3000/auth/callback` (plus your production `/auth/callback` URL) under **Authentication → URL Configuration → Redirect URLs**.

The anon key is safe to expose in the browser — that's what it's for; data access is enforced by RLS policies, not by secrecy of the key.

## Deploying to Vercel (free)

1. Push the repo to GitHub (below).
2. At [vercel.com/new](https://vercel.com/new), import the repository. Vercel auto-detects Next.js — no settings to change.
3. If you want accounts, add the two environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in the import screen or later under **Project → Settings → Environment Variables**, then redeploy.
4. Add your Vercel URL (e.g. `https://morphmatch.vercel.app/auth/callback`) to Supabase's redirect URL allow-list so OAuth and email confirmations return to production.

The included GitHub Actions workflow ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs lint, typecheck, format check and a full build on every push and pull request — deliberately without Supabase env vars, proving the graceful-degrade path stays green.

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

Heights and weights are official listed figures from leagues, clubs and federations. Listed figures vary between sources and across careers — treat them as the athlete's "card stats", not lab measurements. Wingspans are only real where published (mostly NBA combine data and a few famous cases like Michael Phelps); everything badged **≈** is an estimate. League assignments reflect the 2025/26 season for active players; legends carry the league they're most associated with.

## Architecture notes

- **Static dataset, dynamic accounts.** Athletes ship in the bundle (fast, free, versioned in git, works offline); Supabase holds only user data. No API routes are needed for matching — it runs client-side in microseconds.
- **Graceful degrade.** Every Supabase touchpoint checks `isSupabaseConfigured`; with no env vars the save/sign-in UI explains itself instead of erroring.
- **Next.js 16 `proxy.ts`** (the successor to `middleware.ts`) keeps Supabase sessions refreshed.
- **Photos** come from Wikipedia's REST summary endpoint at render time and are cached per session; nothing is scraped or stored.

## License

MIT — see [LICENSE](LICENSE).
