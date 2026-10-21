"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  ExternalLink,
  FilterX,
  Network,
  Search,
  ShieldAlert,
} from "lucide-react";
import type { GraphFilters, GraphNodeType } from "@/domain/models/graph";
import type { Severity } from "@/domain/models/common";
import { SEVERITIES } from "@/domain/models/common";
import {
  buildGraph,
  filterGraph,
  graphNodeTypeLabel,
  incidentSubgraph,
} from "./build-graph";
import { NetworkGraph, NODE_COLORS, SEVERITY_NODE_COLORS } from "./network-graph";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "@/components/ui/severity-badge";
import {
  useLiveAlerts,
  useLiveAssets,
  useLiveEvents,
  useLiveIncidents,
  useLiveIndicators,
} from "@/hooks/use-live-data";
import { useTimeRangeStore } from "@/store/time-range-store";
import { isInRange } from "@/lib/time/time";
import { cn } from "@/lib/utils/cn";

const ALL_TYPES: GraphNodeType[] = [
  "host",
  "user",
  "ip",
  "domain",
  "alert",
  "incident",
  "indicator",
];

export function NetworkExplorer() {
  const events = useLiveEvents();
  const alerts = useLiveAlerts();
  const incidents = useLiveIncidents();
  const assets = useLiveAssets();
  const indicators = useLiveIndicators();
  const range = useTimeRangeStore((s) => s.range);
  const searchParams = useSearchParams();

  const [nodeTypes, setNodeTypes] = React.useState<GraphNodeType[]>(ALL_TYPES);
  const [minSeverity, setMinSeverity] = React.useState<Severity | "all">("all");
  const [search, setSearch] = React.useState("");
  const [incidentId, setIncidentId] = React.useState("all");
  const [selectedId, setSelectedId] = React.useState<string | null>(
    searchParams.get("entity")
  );

  const fullGraph = React.useMemo(() => {
    const rangedEvents = events.filter((event) => isInRange(event.timestamp, range));
    const rangedAlerts = alerts.filter((alert) => isInRange(alert.firstSeen, range));
    return buildGraph({
      events: rangedEvents,
      alerts: rangedAlerts,
      incidents,
      assets,
      indicators,
    });
  }, [events, alerts, incidents, assets, indicators, range]);

  const scopedGraph = React.useMemo(
    () =>
      incidentId === "all"
        ? fullGraph
        : incidentSubgraph(fullGraph, incidentId),
    [fullGraph, incidentId]
  );

  const filters: GraphFilters = React.useMemo(
    () => ({
      nodeTypes,
      minSeverity: minSeverity === "all" ? null : minSeverity,
      search,
      incidentId: incidentId === "all" ? null : incidentId,
    }),
    [nodeTypes, minSeverity, search, incidentId]
  );

  const displayed = React.useMemo(
    () => filterGraph(scopedGraph, filters),
    [scopedGraph, filters]
  );

  const selectedNode =
    fullGraph.nodes.find((node) => node.id === selectedId) ?? null;

  const typeCounts = React.useMemo(() => {
    const counts = new Map<GraphNodeType, number>();
    for (const node of scopedGraph.nodes) {
      counts.set(node.type, (counts.get(node.type) ?? 0) + 1);
    }
    return counts;
  }, [scopedGraph]);

  const connections = React.useMemo(() => {
    if (!selectedNode) return [];
    return fullGraph.edges
      .filter(
        (edge) =>
          edge.source === selectedNode.id || edge.target === selectedNode.id
      )
      .map((edge) => {
        const otherId =
          edge.source === selectedNode.id ? edge.target : edge.source;
        const other = fullGraph.nodes.find((node) => node.id === otherId);
        return { edge, other };
      })
      .filter((item) => item.other)
      .slice(0, 10);
  }, [fullGraph, selectedNode]);

  const toggleType = (type: GraphNodeType) => {
    setNodeTypes((current) =>
      current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type]
    );
  };

  const resetFilters = () => {
    setNodeTypes(ALL_TYPES);
    setMinSeverity("all");
    setSearch("");
    setIncidentId("all");
    setSelectedId(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--subtle)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Highlight an entity (IP, host, user, domain)…"
            className="pl-8"
            aria-label="Search graph"
          />
        </div>
        <Select
          value={minSeverity}
          onChange={(e) => setMinSeverity(e.target.value as Severity | "all")}
          className="w-auto min-w-[140px] text-xs"
          aria-label="Minimum severity"
        >
          <option value="all">Any severity</option>
          {[...SEVERITIES].reverse().map((severity) => (
            <option key={severity} value={severity}>
              ≥ {severity}
            </option>
          ))}
        </Select>
        <Select
          value={incidentId}
          onChange={(e) => setIncidentId(e.target.value)}
          className="w-auto min-w-[190px] text-xs"
          aria-label="Scope to incident"
        >
          <option value="all">Whole environment</option>
          {incidents.map((incident) => (
            <option key={incident.id} value={incident.id}>
              {incident.id} · {incident.title}
            </option>
          ))}
        </Select>
        <Button variant="ghost" size="sm" onClick={resetFilters}>
          <FilterX /> Reset
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {ALL_TYPES.map((type) => {
          const active = nodeTypes.includes(type);
          return (
            <button
              key={type}
              type="button"
              onClick={() => toggleType(type)}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] transition-colors",
                active
                  ? "border-[var(--border-hover)] bg-[var(--surface-2)] text-[var(--foreground)]"
                  : "border-[var(--border)] text-[var(--subtle)] opacity-60 hover:opacity-100"
              )}
            >
              <span
                className="size-1.5 rounded-full"
                style={{ background: NODE_COLORS[type] }}
              />
              {graphNodeTypeLabel(type)}
              <span className="font-mono text-[9px] text-[var(--subtle)]">
                {typeCounts.get(type) ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 xl:grid-cols-[1fr_300px]">
        <NetworkGraph
          data={displayed}
          selectedId={selectedId}
          search={search}
          onSelect={(node) => setSelectedId(node?.id ?? null)}
        />

        <aside className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          {selectedNode ? (
            <div className="flex h-full flex-col">
              <div className="border-b border-[var(--border)] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--subtle)]">
                      {selectedNode.type} · {selectedNode.id}
                    </p>
                    <h3 className="mt-0.5 break-words text-xs font-semibold">
                      {selectedNode.label}
                    </h3>
                    {selectedNode.sublabel && (
                      <p className="mt-0.5 font-mono text-[9px] text-[var(--subtle)]">
                        {selectedNode.sublabel}
                      </p>
                    )}
                  </div>
                  {selectedNode.severity && (
                    <SeverityBadge severity={selectedNode.severity} withIcon={false} />
                  )}
                </div>
              </div>

              <div className="space-y-3 p-3">
                {selectedNode.riskScore != null && (
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--subtle)]">
                      Risk score
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${selectedNode.riskScore}%`,
                            background:
                              selectedNode.riskScore >= 60
                                ? "var(--sev-high)"
                                : "var(--accent)",
                          }}
                        />
                      </div>
                      <span className="font-mono text-[10px]">
                        {selectedNode.riskScore}
                      </span>
                    </div>
                  </div>
                )}

                {Object.keys(selectedNode.metadata).length > 0 && (
                  <dl className="space-y-1">
                    {Object.entries(selectedNode.metadata)
                      .filter(([key]) => key !== "tags")
                      .slice(0, 6)
                      .map(([key, value]) => (
                        <div key={key} className="flex justify-between gap-2">
                          <dt className="font-mono text-[9px] text-[var(--subtle)]">
                            {key}
                          </dt>
                          <dd className="max-w-[60%] truncate text-right font-mono text-[9px] text-[var(--muted)]">
                            {typeof value === "object"
                              ? JSON.stringify(value)
                              : String(value)}
                          </dd>
                        </div>
                      ))}
                  </dl>
                )}

                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--subtle)]">
                    Connections ({connections.length})
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {connections.map(({ edge, other }) => (
                      <li key={edge.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(other!.id)}
                          className="flex w-full items-center gap-1.5 rounded px-1 py-1 text-left text-[10px] text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                        >
                          <span
                            className="size-1.5 shrink-0 rounded-full"
                            style={{
                              background:
                                (other!.severity &&
                                  SEVERITY_NODE_COLORS[other!.severity]) ||
                                NODE_COLORS[other!.type],
                            }}
                          />
                          <span className="truncate">{other!.label}</span>
                          <span className="ml-auto shrink-0 font-mono text-[8px] uppercase text-[var(--subtle)]">
                            {edge.type}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-col gap-1.5 border-t border-[var(--border)] pt-2.5">
                  {selectedNode.type === "host" && (
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/assets?asset=${selectedNode.id}`}>
                        <ExternalLink /> Open asset profile
                      </Link>
                    </Button>
                  )}
                  {selectedNode.type === "alert" && (
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/alerts?alert=${selectedNode.id}`}>
                        <ShieldAlert /> Open alert
                      </Link>
                    </Button>
                  )}
                  {selectedNode.type === "incident" && (
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/incidents/${selectedNode.id}`}>
                        <Network /> Open incident workspace
                      </Link>
                    </Button>
                  )}
                  {selectedNode.type === "indicator" && (
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/intelligence?indicator=${selectedNode.id}`}>
                        <ExternalLink /> Open indicator
                      </Link>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setSearch(
                        selectedNode.metadata.ipAddress
                          ? String(selectedNode.metadata.ipAddress)
                          : selectedNode.label
                      )
                    }
                  >
                    <Search /> Highlight related
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2 p-6 text-center">
              <Network className="size-6 text-[var(--subtle)]" />
              <p className="text-xs font-medium">Select a node</p>
              <p className="text-[11px] leading-relaxed text-[var(--subtle)]">
                Click any entity to inspect its attributes, direct connections,
                and pivot into the related workspace.
              </p>
            </div>
          )}
        </aside>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[10px] text-[var(--subtle)]">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono uppercase tracking-[0.12em]">Legend</span>
          {(["connection", "authentication", "dns", "triggered", "contains", "observed"] as const).map(
            (type) => (
              <span key={type} className="inline-flex items-center gap-1.5">
                <span
                  className="h-px w-4"
                  style={{
                    background:
                      type === "contains"
                        ? "#60a5fa"
                        : type === "triggered"
                          ? "#f87171"
                          : type === "observed"
                            ? "#f472b6"
                            : type === "dns"
                              ? "#34d399"
                              : "var(--border-hover)",
                    borderTop:
                      type === "observed" || type === "triggered"
                        ? "1px dashed currentColor"
                        : undefined,
                  }}
                />
                {type}
              </span>
            )
          )}
        </div>
        <Link
          href="/events"
          className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline"
        >
          Data originates from synthetic events <ArrowUpRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}
