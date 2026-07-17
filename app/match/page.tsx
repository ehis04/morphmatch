import { Suspense } from "react";
import type { Metadata } from "next";
import { MatchTool } from "@/components/MatchTool";

export const metadata: Metadata = {
  title: "Find my match",
  description: "Enter your measurements and find the pro athletes built like you.",
};

export default function MatchPage() {
  return (
    <Suspense>
      <MatchTool />
    </Suspense>
  );
}
