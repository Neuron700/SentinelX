import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/kpi-card";
import { Skeleton } from "@/components/ui/skeleton";
import { NetworkExplorer } from "@/features/graph/network-explorer";

export const metadata: Metadata = { title: "Network Graph" };

export default function NetworkPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Correlation"
        title="Entity relationship graph"
        description="Force-directed view of hosts, identities, external infrastructure, detections, and incidents derived from the selected time range."
      />
      <Suspense fallback={<Skeleton className="h-[520px]" />}>
        <NetworkExplorer />
      </Suspense>
    </div>
  );
}
