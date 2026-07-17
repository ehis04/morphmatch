import { Suspense } from "react";
import type { Metadata } from "next";
import { AthleteBrowser } from "@/components/AthleteBrowser";

export const metadata: Metadata = {
  title: "Athletes",
  description: "Browse and filter the full MorphMatch athlete database.",
};

export default function AthletesPage() {
  return (
    <Suspense>
      <AthleteBrowser />
    </Suspense>
  );
}
