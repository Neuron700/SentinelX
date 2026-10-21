"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FilterX,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import type { Severity, SortDirection } from "@/domain/models/common";
import { SEVERITIES, SEVERITY_RANK } from "@/domain/models/common";
import { EVENT_TYPES } from "@/domain/models/common";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { TableShell, Th, Td } from "@/components/ui/table";
import { EventDetailDrawer } from "./event-detail-drawer";
import { useLiveAlerts, useLiveAssets, useLiveEvents } from "@/hooks/use-live-data";
import { useTimeRangeStore } from "@/store/time-range-store";
import { formatShortDateTime, isInRange, rangeLabel } from "@/lib/time/time";
import { downloadCsv, timestampedFilename } from "@/lib/export/download";
import { cn } from "@/lib/utils/cn";
import { toast } from "sonner";

const PAGE_SIZES = [25, 50, 100];

const EVENT_TYPE_LABELS: Record<string, string> = {
  authentication_success: "Auth success",
  authentication_failure: "Auth failure",
  network_connection: "Network connection",
  process_creation: "Process creation",
  file_access: "File access",
  dns_query: "DNS query",
  privilege_escalation: "Privilege escalation",
  data_transfer: "Data transfer",
  configuration_change: "Config change",
  malware_detected: "Malware detected",
  port_scan_simulated: "Port scan (simulated)",
  system_alert: "System alert",
};

export function EventExplorer() {
  const events = useLiveEvents();
  const alerts = useLiveAlerts();
  const assets = useLiveAssets();
  const range = useTimeRangeStore((s) => s.range);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [search, setSearch] = React.useState("");
  const [severities, setSeverities] = React.useState<Severity[]>([]);
  const [eventType, setEventType] = React.useState("all");
  const [hostId, setHostId] = React.useState("all");
  const [scenarioId, setScenarioId] = React.useState("all");
  const [sortKey, setSortKey] = React.useState<"timestamp" | "severity">(
    "timestamp"
  );
  const [sortDir, setSortDir] = React.useState<SortDirection>("desc");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [selectedId, setSelectedId] = React.useState<string | null>(
    searchParams.get("event")
  );

  React.useEffect(() => {
    const severity = searchParams.get("severity");
    if (severity && SEVERITIES.includes(severity as Severity)) {
      setSeverities([severity as Severity]);
    }
    const event = searchParams.get("event");
    if (event) setSelectedId(event);
    const type = searchParams.get("type");
    if (type) setEventType(type);
    const scenario = searchParams.get("scenario");
    if (scenario) setScenarioId(scenario);
    const host = searchParams.get("host");
    if (host) setHostId(host);
    const query = searchParams.get("search");
    if (query) setSearch(query);
  }, [searchParams]);

  const hostOptions = React.useMemo(
    () =>
      assets
        .filter((asset) => asset.type !== "user_account")
        .sort((a, b) => a.name.localeCompare(b.name)),
    [assets]
  );

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((event) => {
      if (!isInRange(event.timestamp, range)) return false;
      if (severities.length > 0 && !severities.includes(event.severity))
        return false;
      if (eventType !== "all" && event.eventType !== eventType) return false;
      if (scenarioId !== "all" && event.scenarioId !== scenarioId) return false;
      if (
        hostId !== "all" &&
        event.sourceHostId !== hostId &&
        event.destinationHostId !== hostId
      )
        return false;
      if (!q) return true;
      return (
        event.id.toLowerCase().includes(q) ||
        event.description.toLowerCase().includes(q) ||
        event.eventType.toLowerCase().includes(q) ||
        (event.sourceIp ?? "").includes(q) ||
        (event.destinationIp ?? "").includes(q) ||
        (event.userId ?? "").toLowerCase().includes(q) ||
        (event.destinationHostId ?? "").includes(q)
      );
    });
  }, [events, range, severities, eventType, hostId, scenarioId, search]);

  const sorted = React.useMemo(() => {
    const direction = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortKey === "severity") {
        return (SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]) * direction;
      }
      return a.timestamp.localeCompare(b.timestamp) * direction;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sorted.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const selectedEvent = events.find((event) => event.id === selectedId) ?? null;
  const selectedAlerts = selectedEvent
    ? alerts.filter((alert) => selectedEvent.relatedAlertIds.includes(alert.id))
    : [];

  const activeFilterCount =
    severities.length +
    (eventType !== "all" ? 1 : 0) +
    (hostId !== "all" ? 1 : 0) +
    (scenarioId !== "all" ? 1 : 0) +
    (search.trim() ? 1 : 0);

  const clearFilters = () => {
    setSearch("");
    setSeverities([]);
    setEventType("all");
    setHostId("all");
    setScenarioId("all");
    setPage(1);
  };

  const toggleSeverity = (severity: Severity) => {
    setPage(1);
    setSeverities((current) =>
      current.includes(severity)
        ? current.filter((value) => value !== severity)
        : [...current, severity]
    );
  };

  const toggleSort = (key: "timestamp" | "severity") => {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const openEvent = (id: string) => {
    setSelectedId(id);
    router.replace(`${pathname}?event=${id}`, { scroll: false });
  };

  const closeEvent = () => {
    setSelectedId(null);
    router.replace(pathname, { scroll: false });
  };

  const exportEvents = () => {
    downloadCsv(
      timestampedFilename("sentinelx-events", "csv"),
      sorted.map((event) => ({
        id: event.id,
        timestamp: event.timestamp,
        severity: event.severity,
        eventType: event.eventType,
        description: event.description,
        sourceHostId: event.sourceHostId ?? "",
        destinationHostId: event.destinationHostId ?? "",
        sourceIp: event.sourceIp ?? "",
        destinationIp: event.destinationIp ?? "",
        userId: event.userId ?? "",
        relatedAlertIds: event.relatedAlertIds.join("|"),
        scenarioId: event.scenarioId ?? "",
      }))
    );
    toast.success(`Exported ${sorted.length} events`, {
      description: "Filtered view saved as CSV.",
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--subtle)]" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search description, IP, user, host, or event ID…"
            className="pl-8"
            aria-label="Search events"
          />
        </div>
        <Select
          value={eventType}
          onChange={(e) => {
            setEventType(e.target.value);
            setPage(1);
          }}
          className="w-auto min-w-[150px] text-xs"
          aria-label="Filter by event type"
        >
          <option value="all">All event types</option>
          {EVENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {EVENT_TYPE_LABELS[type] ?? type}
            </option>
          ))}
        </Select>
        <Select
          value={hostId}
          onChange={(e) => {
            setHostId(e.target.value);
            setPage(1);
          }}
          className="w-auto min-w-[150px] text-xs"
          aria-label="Filter by host"
        >
          <option value="all">All hosts</option>
          {hostOptions.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.name}
            </option>
          ))}
        </Select>
        <div className="flex items-center gap-1">
          {SEVERITIES.map((severity) => (
            <button
              key={severity}
              type="button"
              onClick={() => toggleSeverity(severity)}
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
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <FilterX /> Clear ({activeFilterCount})
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={exportEvents}>
          <Download /> Export CSV
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--subtle)]">
          <SlidersHorizontal className="mr-1 inline size-3" />
          {rangeLabel(range)} · {filtered.length.toLocaleString()} events
        </p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--subtle)]">Rows</span>
          <Select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="h-7 w-auto text-xs"
            aria-label="Rows per page"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <EmptyState
            title="No events match the current filters"
            description="Widen the time range, clear severity filters, or search for a different attribute."
            action={{ label: "Clear filters", onClick: clearFilters }}
          />
        </div>
      ) : (
        <TableShell className="max-h-[calc(100vh-250px)]">
          <thead>
            <tr>
              <Th className="w-[150px]">
                <button
                  type="button"
                  className="inline-flex items-center gap-1"
                  onClick={() => toggleSort("timestamp")}
                >
                  Timestamp
                  {sortKey === "timestamp" &&
                    (sortDir === "asc" ? (
                      <ArrowUp className="size-3" />
                    ) : (
                      <ArrowDown className="size-3" />
                    ))}
                </button>
              </Th>
              <Th className="w-[100px]">
                <button
                  type="button"
                  className="inline-flex items-center gap-1"
                  onClick={() => toggleSort("severity")}
                >
                  Severity
                  {sortKey === "severity" &&
                    (sortDir === "asc" ? (
                      <ArrowUp className="size-3" />
                    ) : (
                      <ArrowDown className="size-3" />
                    ))}
                </button>
              </Th>
              <Th className="w-[150px]">Event type</Th>
              <Th>Description</Th>
              <Th className="w-[150px]">Source</Th>
              <Th className="w-[150px]">Destination</Th>
              <Th className="w-[110px]">User</Th>
              <Th className="w-[80px]">Alerts</Th>
              <Th className="w-[60px]" />
            </tr>
          </thead>
          <tbody>
            {pageRows.map((event) => {
              const source = assets.find((a) => a.id === event.sourceHostId);
              const destination = assets.find(
                (a) => a.id === event.destinationHostId
              );
              return (
                <tr
                  key={event.id}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-[var(--surface-2)]",
                    selectedId === event.id && "bg-[var(--surface-2)]"
                  )}
                  onClick={() => openEvent(event.id)}
                >
                  <Td className="font-mono text-[10px] text-[var(--muted)]">
                    {formatShortDateTime(event.timestamp)}
                  </Td>
                  <Td>
                    <SeverityBadge severity={event.severity} withIcon={false} />
                  </Td>
                  <Td className="text-[11px] text-[var(--muted)]">
                    {EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}
                  </Td>
                  <Td className="max-w-[340px]">
                    <span className="block truncate text-[11px]">
                      {event.description}
                    </span>
                    <span className="font-mono text-[9px] text-[var(--subtle)]">
                      {event.id}
                    </span>
                  </Td>
                  <Td className="font-mono text-[10px] text-[var(--muted)]">
                    {source?.name ?? event.sourceIp ?? "—"}
                  </Td>
                  <Td className="font-mono text-[10px] text-[var(--muted)]">
                    {destination?.name ?? event.destinationIp ?? "—"}
                  </Td>
                  <Td className="font-mono text-[10px] text-[var(--muted)]">
                    {event.userId ?? "—"}
                  </Td>
                  <Td>
                    {event.relatedAlertIds.length > 0 ? (
                      <span className="rounded bg-[color-mix(in_srgb,var(--sev-high)_15%,transparent)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--sev-high)]">
                        {event.relatedAlertIds.length}
                      </span>
                    ) : (
                      <span className="text-[10px] text-[var(--subtle)]">—</span>
                    )}
                  </Td>
                  <Td>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEvent(event.id);
                      }}
                      aria-label={`View event ${event.id}`}
                    >
                      <ExternalLink />
                    </Button>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </TableShell>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--subtle)]">
        <span>
          Showing{" "}
          {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
          {Math.min(currentPage * pageSize, filtered.length)} of{" "}
          {filtered.length.toLocaleString()}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            aria-label="Previous page"
          >
            <ChevronLeft />
          </Button>
          <span className="px-2 font-mono text-[10px]">
            page {currentPage} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            aria-label="Next page"
          >
            <ChevronRight />
          </Button>
        </div>
        <Link
          href={`/network${selectedEvent?.sourceHostId ? `?entity=${selectedEvent.sourceHostId}` : ""}`}
          className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline"
        >
          Explore relationships in graph <ExternalLink className="size-3" />
        </Link>
      </div>

      <EventDetailDrawer
        event={selectedEvent}
        alerts={selectedAlerts}
        assets={assets}
        onClose={closeEvent}
      />
    </div>
  );
}
