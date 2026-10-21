import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/kpi-card";
import { SkeletonTable } from "@/components/ui/skeleton";
import { EventExplorer } from "@/features/events/event-explorer";

export const metadata: Metadata = { title: "Event Explorer" };

export default function EventsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Telemetry"
        title="Event explorer"
        description="Search, filter, sort, and inspect every synthetic event in the local dataset. Filters respect the global time range."
      />
      <Suspense fallback={<SkeletonTable rows={10} />}>
        <EventExplorer />
      </Suspense>
    </div>
  );
}
