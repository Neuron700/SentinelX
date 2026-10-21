import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/kpi-card";
import { IncidentList } from "@/features/incidents/incident-list";

export const metadata: Metadata = { title: "Incidents" };

export default function IncidentsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Investigation"
        title="Incident queue"
        description="Track investigations from open to closed. Each workspace combines evidence, findings, playbook progress, and an auditable timeline."
      />
      <IncidentList />
    </div>
  );
}
