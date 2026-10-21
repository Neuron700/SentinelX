"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { Alert } from "@/domain/models/alert";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { relativeTime } from "@/lib/time/time";
import { SEVERITY_RANK } from "@/domain/models/common";

export function UnhandledAlerts({ alerts }: { alerts: Alert[] }) {
  const open = alerts
    .filter((alert) => alert.status === "new" || alert.status === "escalated")
    .sort((a, b) => {
      const sev = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
      if (sev !== 0) return sev;
      return new Date(b.firstSeen).getTime() - new Date(a.firstSeen).getTime();
    })
    .slice(0, 5);

  return (
    <div className="flex h-full flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div>
          <h3 className="text-xs font-semibold">Needs triage</h3>
          <p className="mt-0.5 text-[11px] text-[var(--subtle)]">
            New and escalated alerts, highest severity first
          </p>
        </div>
        <Link
          href="/alerts"
          className="inline-flex items-center gap-1 text-[11px] text-[var(--accent)] hover:underline"
        >
          Alert queue <ArrowRight className="size-3" />
        </Link>
      </div>
      {open.length === 0 ? (
        <div className="flex flex-1 items-center p-4">
          <EmptyState
            icon={<CheckCircle2 className="size-4" />}
            title="Queue is clear"
            description="No new or escalated alerts. Nice work."
          />
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {open.map((alert) => (
            <li key={alert.id}>
              <Link
                href={`/alerts?alert=${alert.id}`}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--surface-2)]"
              >
                <SeverityBadge severity={alert.severity} withIcon={false} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] text-[var(--foreground)]">
                    {alert.title}
                  </span>
                  <span className="mt-0.5 block font-mono text-[9px] text-[var(--subtle)]">
                    {alert.id} · {alert.ruleId} · {relativeTime(alert.firstSeen)}
                  </span>
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)]">
                  {alert.status.replace("_", " ")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
