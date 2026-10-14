import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { ATHLETES } from "../data";
import { AthleteCard } from "../components/AthleteCard";
import { ComparisonStage } from "../components/ComparisonStage";
import { StatTable } from "../components/StatTable";
import { commonsPhotoFromInfo, createPhotoStore } from "../lib/athlete-photo";
import { parseComparisonMode, readVersusSelection, versusHref } from "../lib/comparison";
import { buildFigure } from "../lib/silhouette";
import { normalizeSearch } from "../lib/search";
import { scoreAthlete } from "../lib/similarity";

const photoInfo = {
  thumburl:
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Athlete.jpg/500px-Athlete.jpg",
  descriptionurl: "https://commons.wikimedia.org/wiki/File:Athlete.jpg",
  extmetadata: {
    Artist: { value: '<a href="/wiki/User:Photographer">Jane &amp; John &#233;</a>' },
    LicenseShortName: { value: "CC BY-SA 4.0" },
    LicenseUrl: { value: "https://creativecommons.org/licenses/by-sa/4.0" },
  },
};

async function main() {
  // Direct links, navigation, and reopening a saved view all use the same state.
  const a = ATHLETES[0];
  const b = ATHLETES.find((athlete) => !athlete.wingspanEstimated)!;
  const selection = readVersusSelection(new URLSearchParams({ a: a.id, b: b.id, mode: "table" }));
  assert.equal(selection.a, a);
  assert.equal(selection.b, b);
  assert.equal(selection.mode, "table");
  assert.equal(selection.invalid, false);
  assert.equal(parseComparisonMode("side"), "side");
  assert.equal(parseComparisonMode("unknown"), "overlay");
  assert.equal(readVersusSelection(new URLSearchParams("a=missing-athlete")).invalid, true);
  const href = versusHref("mode=side&campaign=shared&a=old", { a: a.id, b: b.id });
  const updated = new URL(href, "https://example.com").searchParams;
  assert.equal(updated.get("mode"), "side");
  assert.equal(updated.get("campaign"), "shared");
  assert.equal(updated.get("a"), a.id);
  assert.equal(updated.get("b"), b.id);
  assert.equal(versusHref("a=old", { a: null }), "/versus");
  assert.equal(normalizeSearch("  Nikola Jokić  "), "nikola jokic");
  assert.equal(normalizeSearch("Kylian Mbappé"), "kylian mbappe");

  // An estimated LEFT wingspan must flag the wingspan, ape index and both deltas.
  const result = scoreAthlete(a, b, true);
  const table = renderToStaticMarkup(
    <StatTable
      left={{ label: "First", stats: a, wingspanEstimated: true }}
      right={{ label: "Second", stats: b }}
      delta={result.delta}
      system="metric"
    />
  );
  assert.equal((table.match(/≈/g) ?? []).length, 5);
  assert.match(table, /scope="row"/);
  assert.match(table, /Difference = Second minus First/);
  assert.match(table, /aria-label="Measurement comparison: First and Second"/);
  const measuredTable = renderToStaticMarkup(
    <StatTable
      left={{ label: "First", stats: b }}
      right={{ label: "Second", stats: b }}
      delta={scoreAthlete(b, b, true).delta}
      system="imperial"
    />
  );
  assert.equal(measuredTable.includes("≈"), false);

  // Repeated card actions remain distinguishable for screen-reader navigation.
  const messi = ATHLETES.find((athlete) => athlete.id === "lionel-messi")!;
  const card = renderToStaticMarkup(<AthleteCard athlete={messi} system="metric" />);
  assert.match(card, /aria-label="Compare with me: Lionel Messi"/);
  assert.match(card, /aria-label="Head-to-head: Lionel Messi"/);
  assert.match(card, /<h2[^>]*>Lionel Messi<\/h2>/);

  // Side-by-side slots must enclose rounded limb caps for the entire database.
  for (const athlete of ATHLETES) {
    const figure = buildFigure(athlete);
    assert.ok(Number.isFinite(figure.halfWidth));
    for (const primitive of figure.primitives) {
      if (primitive.type === "line") {
        assert.ok(
          Math.max(Math.abs(primitive.x1), Math.abs(primitive.x2)) + primitive.w / 2 <=
            figure.halfWidth
        );
      }
    }
  }
  const emptyStage = renderToStaticMarkup(
    <ComparisonStage subjects={[]} mode="overlay" system="metric" />
  );
  assert.equal(/NaN|Infinity/.test(emptyStage), false);

  // Summary thumbnails alone are not license evidence; unsafe or incomplete files are rejected.
  assert.equal(commonsPhotoFromInfo(photoInfo)?.author, "Jane & John é");
  assert.equal(
    commonsPhotoFromInfo({
      ...photoInfo,
      extmetadata: {
        ...photoInfo.extmetadata,
        LicenseShortName: { value: "CC BY-SA 2.5" },
        LicenseUrl: { value: "http://creativecommons.org/licenses/by-sa/2.5/" },
      },
    })?.licenseUrl,
    "https://creativecommons.org/licenses/by-sa/2.5/"
  );
  assert.ok(
    commonsPhotoFromInfo({
      ...photoInfo,
      thumburl: photoInfo.thumburl.replace("thumb.", "upload."),
    })
  );
  assert.equal(
    commonsPhotoFromInfo({ ...photoInfo, thumburl: "https://example.com/portrait.jpg" }),
    null
  );
  assert.equal(
    commonsPhotoFromInfo({
      ...photoInfo,
      thumburl: "https://upload.wikimedia.org/wikipedia/en/portrait.jpg",
    }),
    null
  );
  assert.equal(commonsPhotoFromInfo({ ...photoInfo, descriptionurl: "javascript:alert(1)" }), null);
  assert.equal(commonsPhotoFromInfo({ ...photoInfo, extmetadata: {} }), null);
  assert.equal(
    commonsPhotoFromInfo({
      ...photoInfo,
      extmetadata: { ...photoInfo.extmetadata, LicenseShortName: { value: "CC BY-NC 4.0" } },
    }),
    null
  );
  assert.equal(commonsPhotoFromInfo(undefined), null);

  // Simultaneous duplicate thumbnails share one lookup; requests are bounded.
  let requests = 0;
  let active = 0;
  let peak = 0;
  const fetcher: typeof fetch = async (input) => {
    requests++;
    active++;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 2));
    active--;
    const url = new URL(String(input));
    if (url.hostname === "en.wikipedia.org") {
      assert.equal(url.searchParams.get("pilicense"), "free");
      return Response.json({ query: { pages: [{ pageimage: "Athlete.jpg" }] } });
    }
    return Response.json({ query: { pages: [{ imageinfo: [photoInfo] }] } });
  };
  const store = createPhotoStore(fetcher);
  let updates = 0;
  const unsubscribe = store.subscribe("Athlete 1", () => {
    updates++;
  });
  const first = store.load("Athlete 1");
  assert.equal(store.load("Athlete 1"), first);
  await Promise.all([
    first,
    ...Array.from({ length: 6 }, (_, index) => store.load(`Athlete ${index + 1}`)),
  ]);
  assert.equal(requests, 12);
  assert.ok(peak <= 3);
  assert.equal(store.get("Athlete 1")?.author, "Jane & John é");
  await store.load("Athlete 1");
  assert.equal(requests, 12);
  store.reject("Athlete 1");
  assert.equal(store.get("Athlete 1"), null);
  assert.equal(updates, 2);
  unsubscribe();

  // Transient failures fall back without throwing and can be retried after a cooldown.
  let attempts = 0;
  let time = 0;
  const failing: typeof fetch = async () => {
    attempts++;
    throw new Error("offline");
  };
  const offline = createPhotoStore(failing, () => time);
  await offline.load("Offline athlete");
  assert.equal(offline.get("Offline athlete"), null);
  await offline.load("Offline athlete");
  assert.equal(attempts, 1);
  time = 60001;
  await offline.load("Offline athlete");
  assert.equal(attempts, 2);
  console.log("Comparison, geometry, attribution and photo-loading regression checks passed.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
