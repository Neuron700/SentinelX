import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/kpi-card";
import { SkeletonTable } from "@/components/ui/skeleton";
import { AlertQueue } from "@/features/alerts/alert-queue";

export const metadata: Metadata = { title: "Alert Queue" };

export default function AlertsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Detection & triage"
        title="Alert queue"
        description="Triage detections through the alert lifecycle. Acknowledge, escalate, resolve, or promote to an incident — every action writes to the audit trail."
      />
      <Suspense fallback={<SkeletonTable rows={8} cols={6} />}>
        <AlertQueue />
      </Suspense>
    </div>
  );
}
