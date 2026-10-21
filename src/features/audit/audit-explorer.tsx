"use client";

import * as React from "react";
import {
  ChevronRight,
  FileSpreadsheet,
  FilterX,
  History,
  Search,
  UserRound,
} from "lucide-react";
import type { AuditEntry } from "@/domain/models/audit";
import { PageHeader } from "@/components/ui/kpi-card";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { TableShell, Th, Td } from "@/components/ui/table";
import { useLiveAudit } from "@/hooks/use-live-data";
import { useTimeRangeStore } from "@/store/time-range-store";
import { downloadCsv, timestampedFilename } from "@/lib/export/download";
import {
  formatShortDateTime,
  formatTimestamp,
  isInRange,
  rangeLabel,
  relativeTime,
} from "@/lib/time/time";
import { toast } from "sonner";

const ENTITY_TYPES = [
  "alert",
  "incident",
  "asset",
  "rule",
  "indicator",
  "playbook",
  "scenario",
  "event",
  "settings",
  "report",
  "system",
] as const;

const ACTION_GROUPS = [
  { value: "all", label: "All actions" },
  { value: "alert", label: "Alert actions" },
  { value: "incident", label: "Incident actions" },
  { value: "scenario", label: "Scenario actions" },
  { value: "settings", label: "Settings actions" },
  { value: "export", label: "Exports" },
];

function actionLabel(action: string): string {
  return action
    .split(".")
    .map((part) => part.replaceAll("_", " "))
    .join(" · ");
}

export function AuditExplorer() {
  const audit = useLiveAudit();
  const range = useTimeRangeStore((s) => s.range);
  const [search, setSearch] = React.useState("");
  const [entityFilter, setEntityFilter] = React.useState("all");
  const [actionFilter, setActionFilter] = React.useState("all");
  const [selected, setSelected] = React.useState<AuditEntry | null>(null);

  const inRange = React.useMemo(
    () => audit.filter((entry) => isInRange(entry.timestamp, range)),
    [audit, range]
  );

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return inRange.filter((entry) => {
      if (entityFilter !== "all" && entry.entityType !== entityFilter) {
        return false;
      }
      if (actionFilter !== "all" && !entry.action.startsWith(actionFilter)) {
        return false;
      }
      if (!query) return true;
      return (
        entry.action.toLowerCase().includes(query) ||
        entry.entityId.toLowerCase().includes(query) ||
        entry.entityLabel.toLowerCase().includes(query) ||
        entry.userId.toLowerCase().includes(query)
      );
    });
  }, [inRange, search, entityFilter, actionFilter]);

  const actors = React.useMemo(
    () => new Set(filtered.map((entry) => entry.userId)),
    [filtered]
  );

  const exportAudit = () => {
    if (filtered.length === 0) {
      toast.info("No audit entries to export in this view");
      return;
    }
    downloadCsv(
      timestampedFilename("sentinelx-audit", "csv"),
      filtered.map((entry) => ({
        timestamp: entry.timestamp,
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        entityLabel: entry.entityLabel,
        details: entry.details,
      }))
    );
    toast.success(`Exported ${filtered.length} audit entries`);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Accountability"
        title="Audit trail"
        description={`Local record of analyst actions for ${rangeLabel(range)}. Audit entries are stored in IndexedDB and never leave this browser.`}
        actions={
          <Button variant="secondary" size="sm" onClick={exportAudit}>
            <FileSpreadsheet /> Export CSV
          </Button>
        }
      />

      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
            <p className="font-mono text-lg leading-none">{inRange.length}</p>
            <p className="mt-1 text-[9px] uppercase tracking-[0.1em] text-[var(--subtle)]">
              Entries in range
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
            <p className="font-mono text-lg leading-none">{filtered.length}</p>
            <p className="mt-1 text-[9px] uppercase tracking-[0.1em] text-[var(--subtle)]">
              Matching filters
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
            <p className="font-mono text-lg leading-none">{actors.size}</p>
            <p className="mt-1 text-[9px] uppercase tracking-[0.1em] text-[var(--subtle)]">
              Unique actors
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--subtle)]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search action, entity, or analyst…"
              className="pl-8"
              aria-label="Search audit entries"
            />
          </div>
          <Select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="w-auto min-w-[140px] text-xs"
            aria-label="Filter by entity type"
          >
            <option value="all">All entities</option>
            {ENTITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
          <Select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-auto min-w-[150px] text-xs"
            aria-label="Filter by action group"
          >
            {ACTION_GROUPS.map((group) => (
              <option key={group.value} value={group.value}>
                {group.label}
              </option>
            ))}
          </Select>
          {(search || entityFilter !== "all" || actionFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setEntityFilter("all");
                setActionFilter("all");
              }}
            >
              <FilterX /> Clear
            </Button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            <EmptyState
              icon={<History className="size-4" />}
              title={
                inRange.length === 0
                  ? "No audit activity in this range"
                  : "No entries match"
              }
              description={
                inRange.length === 0
                  ? "Actions you take in the platform will appear here. Widen the global time range to see older entries."
                  : "Try a different search term or clear the entity and action filters."
              }
            />
          </div>
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th className="w-[150px]">Timestamp</Th>
                <Th>Action</Th>
                <Th className="w-[100px]">Entity</Th>
                <Th>Target</Th>
                <Th className="w-[130px]">Analyst</Th>
                <Th className="w-[40px]" />
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 300).map((entry) => (
                <tr
                  key={entry.id}
                  className="cursor-pointer transition-colors hover:bg-[var(--surface-2)]"
                  onClick={() => setSelected(entry)}
                >
                  <Td>
                    <span className="block font-mono text-[10px]">
                      {formatShortDateTime(entry.timestamp)}
                    </span>
                    <span className="block text-[9px] text-[var(--subtle)]">
                      {relativeTime(entry.timestamp)}
                    </span>
                  </Td>
                  <Td>
                    <span className="block text-[10px]">
                      {actionLabel(entry.action)}
                    </span>
                    <span className="block font-mono text-[9px] text-[var(--subtle)]">
                      {entry.action}
                    </span>
                  </Td>
                  <Td>
                    <span className="rounded border border-[var(--border)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--muted)]">
                      {entry.entityType}
                    </span>
                  </Td>
                  <Td className="max-w-[280px]">
                    <span className="block truncate text-[10px]">
                      {entry.entityLabel}
                    </span>
                    <span className="block truncate font-mono text-[9px] text-[var(--subtle)]">
                      {entry.entityId}
                    </span>
                  </Td>
                  <Td className="font-mono text-[10px] text-[var(--muted)]">
                    {entry.userId}
                  </Td>
                  <Td>
                    <ChevronRight className="size-3.5 text-[var(--subtle)]" />
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
        {filtered.length > 300 && (
          <p className="text-center text-[10px] text-[var(--subtle)]">
            Showing the 300 most recent of {filtered.length} matching entries.
            Export CSV for the full set.
          </p>
        )}
      </div>

      <Drawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        title="Audit entry"
        subtitle={
          selected ? <span className="font-mono">{selected.id}</span> : undefined
        }
        width="max-w-lg"
      >
        {selected && (
          <div className="space-y-5">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
              <p className="text-[9px] uppercase tracking-[0.12em] text-[var(--subtle)]">
                Action
              </p>
              <p className="mt-1 text-sm">{actionLabel(selected.action)}</p>
              <p className="mt-1 font-mono text-[10px] text-[var(--subtle)]">
                {selected.action}
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
              <Detail label="Timestamp" value={formatTimestamp(selected.timestamp)} mono />
              <Detail label="Relative" value={relativeTime(selected.timestamp)} />
              <Detail label="Analyst" value={selected.userId} mono />
              <Detail label="Entity type" value={selected.entityType} />
              <Detail label="Entity ID" value={selected.entityId} mono />
              <Detail label="Entity label" value={selected.entityLabel} />
            </dl>

            <section>
              <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--subtle)]">
                Details
              </h3>
              <pre className="max-h-64 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 font-mono text-[10px] leading-relaxed text-[var(--muted)]">
                {JSON.stringify(selected.details, null, 2)}
              </pre>
            </section>

            <p className="flex items-center gap-1.5 text-[10px] text-[var(--subtle)]">
              <UserRound className="size-3" /> Recorded automatically by the local
              demo platform.
            </p>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[9px] uppercase tracking-[0.1em] text-[var(--subtle)]">
        {label}
      </dt>
      <dd className={mono ? "mt-0.5 font-mono text-[10px]" : "mt-0.5 text-[11px]"}>
        {value}
      </dd>
    </div>
  );
}
