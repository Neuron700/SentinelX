import type { Metadata } from "next";
import { ReportView } from "@/features/reports/report-view";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return <ReportView />;
}
