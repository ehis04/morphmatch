import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy & data",
  description: "How MorphMatch uses your measurements, account information and saved comparisons.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-4xl font-extrabold">Privacy & data</h1>
      <div className="mt-6 space-y-6 leading-relaxed text-ink-soft">
        <p>
          Your measurements are compared with the athlete dataset in your browser. MorphMatch stores
          your last valid measurements and preferred units on this device. Reset measurements
          restores the example defaults and clears your optional wingspan. You can remove all
          preferences by clearing this site’s browser data.
        </p>
        <p>
          If accounts are enabled, Supabase handles your sign-in and stores your account
          information. Authentication cookies keep you signed in. Saving a comparison sends its
          title, subjects, measurements and display mode to Supabase. Saved comparisons are
          associated with your account and protected by database ownership rules. You can delete
          individual comparisons from{" "}
          <Link href="/saved" className="font-semibold underline">
            Saved
          </Link>
          .
        </p>
        <p>
          Sharing a head-to-head sends a link containing the selected athlete IDs and view; it does
          not include your personal measurements. Opening a saved personal comparison in matching
          replaces the measurements on this device with that saved comparison.
        </p>
        <p>
          Athlete photos and their credits are requested from Wikipedia and Wikimedia Commons. Your
          browser connects to those services, which receive the usual network information, including
          your IP address. Images are served through this site’s image service. Matching still works
          when photos cannot load.
        </p>
        <p>
          The hosting provider processes requests to serve the site and may keep operational logs.
          This application does not include advertising or analytics trackers.
        </p>
        <p>
          Athlete measurements are a bundled reference dataset, with league and career labels
          reflecting its original snapshot. Individual records do not yet include source citations.
          Wingspans marked ≈ are estimates. Silhouettes approximate body shape from measurements,
          and similarity scores describe numerical closeness; they do not predict health,
          performance or appearance.
        </p>
      </div>
    </div>
  );
}
