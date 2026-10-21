import type { Metadata } from "next";
import { AuditExplorer } from "@/features/audit/audit-explorer";

export const metadata: Metadata = { title: "Audit Trail" };

export default function AuditPage() {
  return <AuditExplorer />;
}
