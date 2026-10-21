import { Suspense } from "react";
import type { Metadata } from "next";
import { SkeletonTable } from "@/components/ui/skeleton";
import { IntelligenceExplorer } from "@/features/intelligence/intelligence-explorer";

export const metadata: Metadata = { title: "Intelligence" };

export default function IntelligencePage() {
  return (
    <Suspense fallback={<SkeletonTable rows={8} cols={6} />}>
      <IntelligenceExplorer />
    </Suspense>
  );
}
