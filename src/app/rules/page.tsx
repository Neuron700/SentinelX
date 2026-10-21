import { Suspense } from "react";
import type { Metadata } from "next";
import { SkeletonTable } from "@/components/ui/skeleton";
import { RuleExplorer } from "@/features/rules/rule-explorer";

export const metadata: Metadata = { title: "Detection Rules" };

export default function RulesPage() {
  return (
    <Suspense fallback={<SkeletonTable rows={8} cols={6} />}>
      <RuleExplorer />
    </Suspense>
  );
}
