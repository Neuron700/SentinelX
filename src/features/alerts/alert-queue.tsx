"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ChevronRight,
  Download,
  FilterX,
  Inbox,
  Search,
  ShieldCheck,
  ShieldQuestion,
} from "lucide-react";
import type { AlertStatus, Severity } from "@/domain/models/common";
import { SEVERITIES, SEVERITY_RANK } from "@/domain/models/common";
import { SeverityBadge, StatusBadge } from "@/components/ui/severity-badge";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TableShell, Th, Td } from "@/components/ui/table";
import { AlertDetailDrawer } from "./alert-detail-drawer";
import { useLiveAlerts, useLiveRules } from "@/hooks/use-live-data";
import { useTimeRangeStore } from "@/store/time-range-store";
import { useSettingsStore } from "@/store/settings-store";
import { formatShortDateTime, isInRange, rangeLabel } from "@/lib/time/time";
import { downloadCsv, timestampedFilename } from "@/lib/export/download";
import { cn } from "@/lib/utils/cn";
import { toast } from "sonner";

const STATUS_TABS: { value: "all" | AlertStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "in_review", label: "In review" },
  { value: "escalated", label: "Escalated" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
];

export function AlertQueue() {
  const alerts = useLiveAlerts();
  const rules = useLiveRules();
  const range = useTimeRangeStore((s) => s.range);
  const analyst = useSettingsStore((s) => s.analystName);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [status, setStatus] = React.useState<"all" | AlertStatus>("all");
  const [search, setSearch] = React.useState("");
  const [severities, setSeverities] = React.useState<Severity[]>([]);
  const [ruleId, setRuleId] = React.useState("all");
  const [assignee, setAssignee] = React.useState("all");
  const [scenarioId, setScenarioId] = React.useState("all");
  const [selectedId, setSelectedId] = React.useState<string | null>(
    searchParams.get("alert")
  );

  React.useEffect(() => {
    const id = searchParams.get("alert");
    if (id) setSelectedId(id);
    const severity = searchParams.get("severity");
    if (severity && SEVERITIES.includes(severity as Severity)) {
      setSeverities([severity as Severity]);
    }
    const statusParam = searchParams.get("status");
    if (
      statusParam &&
      STATUS_TABS.some((tab) => tab.value === statusParam)
    ) {
      setStatus(statusParam as AlertStatus);
    }
    const scenario = searchParams.get("scenario");
    if (scenario) setScenarioId(scenario);
    const rule = searchParams.get("rule");
    if (rule) setRuleId(rule);
  }, [searchParams]);

  const inRange = React.useMemo(
    () => alerts.filter((alert) => isInRange(alert.firstSeen, range)),
    [alerts, range]
  );

  const statusCounts = React.useMemo(() => {
    const counts: Record<AlertStatus, number> = {
      new: 0,
      in_review: 0,
      escalated: 0,
      resolved: 0,
      dismissed: 0,
    };
    for (const alert of inRange) counts[alert.status] += 1;
    return counts;
  }, [inRange]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return inRange.filter((alert) => {
      if (status !== "all" && alert.status !== status) return false;
      if (severities.length > 0 && !severities.includes(alert.severity))
        return false;
      if (ruleId !== "all" && alert.ruleId !== ruleId) return false;
      if (scenarioId !== "all" && alert.scenarioId !== scenarioId) return false;
      if (assignee === "unassigned" && alert.assignedTo) return false;
      if (assignee === "mine" && alert.assignedTo !== analyst) return false;
      if (!q) return true;
      return (
        alert.title.toLowerCase().includes(q) ||
        alert.id.toLowerCase().includes(q) ||
        alert.ruleId.toLowerCase().includes(q)
      );
    });
  }, [inRange, status, severities, ruleId, assignee, scenarioId, search, analyst]);

  const sorted = React.useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const severity =
          SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
        if (severity !== 0) return severity;
        return b.firstSeen.localeCompare(a.firstSeen);
      }),
    [filtered]
  );

  const selectedAlert = alerts.find((alert) => alert.id === selectedId) ?? null;

  const openAlert = (id: string) => {
    setSelectedId(id);
    router.replace(`${pathname}?alert=${id}`, { scroll: false });
  };

  const closeAlert = () => {
    setSelectedId(null);
    router.replace(pathname, { scroll: false });
  };

  const clearFilters = () => {
    setSearch("");
    setSeverities([]);
    setRuleId("all");
    setAssignee("all");
    setScenarioId("all");
    setStatus("all");
  };

  const activeFilters =
    severities.length +
    (ruleId !== "all" ? 1 : 0) +
    (assignee !== "all" ? 1 : 0) +
    (scenarioId !== "all" ? 1 : 0) +
    (status !== "all" ? 1 : 0) +
    (search ? 1 : 0);

  const exportAlerts = () => {
    downloadCsv(
      timestampedFilename("sentinelx-alerts", "csv"),
      sorted.map((alert) => ({
        id: alert.id,
        title: alert.title,
        severity: alert.severity,
        status: alert.status,
        confidence: alert.confidence,
        ruleId: alert.ruleId,
        firstSeen: alert.firstSeen,
        lastSeen: alert.lastSeen,
        assignedTo: alert.assignedTo ?? "",
        incidentId: alert.incidentId ?? "",
        resolution: alert.resolution ?? "",
      }))
    );
    toast.success(`Exported ${sorted.length} alerts`, {
      description: "Filtered queue saved as CSV.",
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SummaryTile
          icon={<Inbox />}
          label="New"
          value={statusCounts.new}
          tone="accent"
          onClick={() => setStatus("new")}
        />
        <SummaryTile
          icon={<ShieldQuestion />}
          label="In review"
          value={statusCounts.in_review}
          tone="warning"
          onClick={() => setStatus("in_review")}
        />
        <SummaryTile
          icon={<AlertTriangle />}
          label="Escalated"
          value={statusCounts.escalated}
          tone="high"
          onClick={() => setStatus("escalated")}
        />
        <SummaryTile
          icon={<ShieldCheck />}
          label="Resolved"
          value={statusCounts.resolved}
          tone="success"
          onClick={() => setStatus("resolved")}
        />
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center gap-1 overflow-x-auto border-b border-[var(--border)] px-2">
          {STATUS_TABS.map((tab) => {
            const count =
              tab.value === "all"
                ? inRange.length
                : statusCounts[tab.value as AlertStatus];
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatus(tab.value)}
                className={cn(
                  "relative whitespace-nowrap px-3 py-2.5 text-xs font-medium transition-colors",
                  status === tab.value
                    ? "text-[var(--foreground)] after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-[var(--accent)]"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                )}
              >
                {tab.label}
                <span className="ml-1.5 rounded-full bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-[var(--muted)]">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] p-2.5">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--subtle)]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search alert title or ID…"
              className="pl-8"
              aria-label="Search alerts"
            />
          </div>
          <Select
            value={ruleId}
            onChange={(e) => setRuleId(e.target.value)}
            className="w-auto min-w-[170px] text-xs"
            aria-label="Filter by detection rule"
          >
            <option value="all">All detection rules</option>
            {rules.map((rule) => (
              <option key={rule.id} value={rule.id}>
                {rule.name}
              </option>
            ))}
          </Select>
          <Select
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            className="w-auto min-w-[130px] text-xs"
            aria-label="Filter by assignee"
          >
            <option value="all">Any assignee</option>
            <option value="mine">Assigned to me</option>
            <option value="unassigned">Unassigned</option>
          </Select>
          <div className="flex items-center gap-1">
            {SEVERITIES.map((severity) => (
              <button
                key={severity}
                type="button"
                onClick={() =>
                  setSeverities((current) =>
                    current.includes(severity)
                      ? current.filter((value) => value !== severity)
                      : [...current, severity]
                  )
                }
                aria-pressed={severities.includes(severity)}
                className={cn(
                  "rounded border px-1.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.06em] transition-colors",
                  severities.includes(severity)
                    ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-[var(--foreground)]"
                    : "border-[var(--border)] text-[var(--subtle)] hover:text-[var(--foreground)]"
                )}
              >
                {severity}
              </button>
            ))}
          </div>
          {scenarioId !== "all" && (
            <span className="inline-flex items-center gap-1 rounded border border-[color-mix(in_srgb,var(--secondary-accent)_40%,transparent)] bg-[color-mix(in_srgb,var(--secondary-accent)_8%,transparent)] px-2 py-1 font-mono text-[9px] text-[var(--secondary-accent)]">
              scenario: {scenarioId}
              <button
                type="button"
                onClick={() => setScenarioId("all")}
                aria-label="Clear scenario filter"
                className="hover:text-[var(--foreground)]"
              >
                ×
              </button>
            </span>
          )}
          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <FilterX /> Clear
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={exportAlerts}>
            <Download /> Export
          </Button>
        </div>

        <div className="flex items-center justify-between gap-2 px-3 py-2 text-[10px] text-[var(--subtle)]">
          <span className="font-mono uppercase tracking-[0.12em]">
            {rangeLabel(range)} · {sorted.length} alerts
          </span>
          <span>Sorted by severity, then recency</span>
        </div>

        {sorted.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck className="size-4" />}
            title="No alerts match"
            description="Clear the filters or widen the global time range."
            action={{ label: "Clear filters", onClick: clearFilters }}
          />
        ) : (
          <TableShell className="rounded-none border-x-0 border-b-0">
            <thead>
              <tr>
                <Th className="w-[96px]">Severity</Th>
                <Th>Alert</Th>
                <Th className="w-[110px]">Status</Th>
                <Th className="w-[110px]">Confidence</Th>
                <Th className="w-[130px]">First seen</Th>
                <Th className="w-[120px]">Assignee</Th>
                <Th className="w-[120px]">Incident</Th>
                <Th className="w-[40px]" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((alert) => (
                <tr
                  key={alert.id}
                  className="cursor-pointer transition-colors hover:bg-[var(--surface-2)]"
                  onClick={() => openAlert(alert.id)}
                >
                  <Td>
                    <SeverityBadge severity={alert.severity} />
                  </Td>
                  <Td className="max-w-[380px]">
                    <span className="block truncate text-[11px]">
                      {alert.title}
                    </span>
                    <span className="font-mono text-[9px] text-[var(--subtle)]">
                      {alert.id} · {alert.ruleId}
                    </span>
                  </Td>
                  <Td>
                    <StatusBadge kind="alert" status={alert.status} />
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1.5">
                      <div className="h-1 w-10 overflow-hidden rounded-full bg-[var(--surface-2)]">
                        <div
                          className="h-full rounded-full bg-[var(--accent)]"
                          style={{ width: `${alert.confidence}%` }}
                        />
                      </div>
                      <span className="font-mono text-[10px] text-[var(--muted)]">
                        {alert.confidence}%
                      </span>
                    </div>
                  </Td>
                  <Td className="font-mono text-[10px] text-[var(--muted)]">
                    {formatShortDateTime(alert.firstSeen)}
                  </Td>
                  <Td className="font-mono text-[10px] text-[var(--muted)]">
                    {alert.assignedTo ?? (
                      <span className="text-[var(--subtle)]">unassigned</span>
                    )}
                  </Td>
                  <Td>
                    {alert.incidentId ? (
                      <Link
                        href={`/incidents/${alert.incidentId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-mono text-[10px] text-[var(--accent)] hover:underline"
                      >
                        {alert.incidentId}
                      </Link>
                    ) : (
                      <span className="text-[10px] text-[var(--subtle)]">—</span>
                    )}
                  </Td>
                  <Td>
                    <ChevronRight className="size-3.5 text-[var(--subtle)]" />
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </div>

      <AlertDetailDrawer alert={selectedAlert} onClose={closeAlert} />
    </div>
  );
}

function SummaryTile({
  icon,
  label,
  value,
  tone,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "accent" | "warning" | "high" | "success";
  onClick: () => void;
}) {
  const colors: Record<string, string> = {
    accent: "text-[var(--accent)]",
    warning: "text-[var(--warning)]",
    high: "text-[var(--sev-high)]",
    success: "text-[var(--success)]",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-left transition-colors hover:border-[var(--border-hover)]"
    >
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-2)] [&_svg]:size-4",
          colors[tone]
        )}
      >
        {icon}
      </span>
      <span>
        <span className="block font-mono text-lg leading-none tabular-nums">
          {value}
        </span>
        <span className="mt-1 block text-[10px] uppercase tracking-[0.1em] text-[var(--subtle)]">
          {label}
        </span>
      </span>
    </button>
  );
}
