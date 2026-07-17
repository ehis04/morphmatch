import { Suspense } from "react";
import type { Metadata } from "next";
import { VersusTool } from "@/components/VersusTool";

export const metadata: Metadata = {
  title: "Head-to-head",
  description: "Compare any two professional athletes' builds at true scale.",
};

export default function VersusPage() {
  return (
    <Suspense>
      <VersusTool />
    </Suspense>
  );
}
