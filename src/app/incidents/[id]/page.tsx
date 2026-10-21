import { Suspense } from "react";
import type { Metadata } from "next";
import { SkeletonTable } from "@/components/ui/skeleton";
import { IncidentWorkspace } from "@/features/incidents/incident-workspace";

export const metadata: Metadata = { title: "Incident Workspace" };

export default async function IncidentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<SkeletonTable rows={8} cols={4} />}>
      <IncidentWorkspace id={id} />
    </Suspense>
  );
}
