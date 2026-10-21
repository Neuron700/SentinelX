"use client";

import Link from "next/link";
import { ArrowRight, FolderSearch } from "lucide-react";
import type { Incident } from "@/domain/models/incident";
import { SeverityBadge, StatusBadge } from "@/components/ui/severity-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { relativeTime } from "@/lib/time/time";

export function RecentIncidents({ incidents }: { incidents: Incident[] }) {
  const recent = [...incidents]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, 5);

  return (
    <div className="flex h-full flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div>
          <h3 className="text-xs font-semibold">Incident queue</h3>
          <p className="mt-0.5 text-[11px] text-[var(--subtle)]">
            Most recently updated investigations
          </p>
        </div>
        <Link
          href="/incidents"
          className="inline-flex items-center gap-1 text-[11px] text-[var(--accent)] hover:underline"
        >
          All incidents <ArrowRight className="size-3" />
        </Link>
      </div>
      {recent.length === 0 ? (
        <div className="flex-1 p-4">
          <EmptyState
            icon={<FolderSearch className="size-4" />}
            title="No incidents"
            description="Escalated alerts that are promoted become incidents."
          />
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {recent.map((incident) => (
            <li key={incident.id}>
              <Link
                href={`/incidents/${incident.id}`}
                className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--surface-2)]"
              >
                <span className="w-[104px] shrink-0 font-mono text-[10px] text-[var(--subtle)]">
                  {incident.id}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] text-[var(--foreground)]">
                    {incident.title}
                  </span>
                  <span className="mt-0.5 block font-mono text-[9px] text-[var(--subtle)]">
                    updated {relativeTime(incident.updatedAt)}
                  </span>
                </span>
                <SeverityBadge severity={incident.severity} withIcon={false} />
                <StatusBadge kind="incident" status={incident.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
