import Link from "next/link";
import { HeroDemo } from "@/components/HeroDemo";
import { OutliersRow } from "@/components/OutliersRow";
import { athleteCount } from "@/data";
import { SPORT_LABELS, type Sport } from "@/lib/types";

const SPORTS: Sport[] = ["football", "basketball", "tennis", "swimming"];

export default function HomePage() {
  return (
    <div>
      {/* ── Hero: the measuring wall ── */}
      <section className="ruled border-b border-line">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 lg:grid-cols-2 lg:py-16">
          <div className="rise-in">
            <p className="mb-3 inline-block rounded-full border border-ink px-3 py-1 font-mono text-xs font-semibold">
              {athleteCount()} pros · 4 sports · true scale
            </p>
            <h1 className="font-display text-5xl font-extrabold leading-[0.98] tracking-tight sm:text-6xl">
              Which pro is
              <br />
              built like <span className="bg-tape px-2">you</span>?
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-soft">
              Stand against the measuring wall. Enter your height, weight and wingspan, and
              MorphMatch finds the professional athletes with similar measurements — drawn to scale,
              side by side or overlapped.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/match"
                className="rounded-md bg-ink px-5 py-3 font-bold text-paper transition-opacity hover:opacity-85"
              >
                Find my match
              </Link>
              <Link
                href="/versus"
                className="rounded-md border-2 border-ink px-5 py-3 font-bold transition-colors hover:bg-ink hover:text-paper"
              >
                Compare two pros
              </Link>
            </div>
          </div>
          <div className="rise-in" style={{ animationDelay: "120ms" }}>
            <HeroDemo />
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="font-display text-3xl font-extrabold tracking-tight">How it works</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <Step
            title="Get measured"
            body="Height and weight are enough to start. Add your wingspan — fingertip to fingertip — and the match gets much sharper."
          />
          <Step
            title="Meet your comps"
            body="A weighted similarity engine scores every athlete in the database against you, and filters narrow it to a sport, league, country or era."
          />
          <Step
            title="See it to scale"
            body="Silhouettes use one SVG unit per centimetre to compare height and approximate proportions. The numbers show the measured differences."
          />
        </div>
      </section>

      {/* ── Sports coverage ── */}
      <section className="border-y border-line bg-card">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-4 py-10 sm:grid-cols-4">
          {SPORTS.map((sport) => (
            <Link
              key={sport}
              href={`/athletes?sport=${sport}`}
              className="group px-4 py-3 text-center transition-colors hover:bg-paper"
            >
              <span className="block font-mono text-3xl font-bold tabular-nums">
                {athleteCount(sport)}
              </span>
              <span className="text-sm font-semibold text-ink-soft group-hover:text-ink">
                {SPORT_LABELS[sport]} pros
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── The extremes ── */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="font-display text-3xl font-extrabold tracking-tight">The wall’s extremes</h2>
        <p className="mt-2 max-w-xl text-ink-soft">
          Professional sport collects the outliers of human proportion. A few residents of the far
          ends of the ruler:
        </p>
        <OutliersRow />
      </section>
    </div>
  );
}

function Step({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-line bg-card p-5 shadow-card">
      <h3 className="font-display text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}
