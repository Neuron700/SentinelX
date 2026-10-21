"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Boxes,
  ChevronRight,
  ExternalLink,
  FilterX,
  Globe2,
  Laptop,
  Search,
  Server,
  ShieldAlert,
  UserRound,
  Waypoints,
} from "lucide-react";
import type { AssetType } from "@/domain/models/common";
import { ASSET_TYPES } from "@/domain/models/common";
import { PageHeader } from "@/components/ui/kpi-card";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/dialog";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { TableShell, Th, Td } from "@/components/ui/table";
import { useLiveAlerts, useLiveAssets, useLiveEvents } from "@/hooks/use-live-data";
import { useTimeRangeStore } from "@/store/time-range-store";
import { isInRange, relativeTime } from "@/lib/time/time";
import { cn } from "@/lib/utils/cn";

const TYPE_LABELS: Record<AssetType, string> = {
  workstation: "Workstation",
  server: "Server",
  application: "Application",
  user_account: "User account",
  gateway: "Gateway",
  endpoint: "Endpoint",
};

function AssetIcon({ type }: { type: AssetType }) {
  const Icon =
    type === "server"
      ? Server
      : type === "user_account"
        ? UserRound
        : type === "application"
          ? Boxes
          : type === "gateway"
            ? Waypoints
            : Laptop;
  return <Icon className="size-3.5" />;
}

function riskTone(score: number): "success" | "accent" | "warning" | "danger" {
  if (score >= 80) return "danger";
  if (score >= 60) return "warning";
  if (score >= 35) return "accent";
  return "success";
}

export function AssetExplorer() {
  const assets = useLiveAssets();
  const alerts = useLiveAlerts();
  const events = useLiveEvents();
  const range = useTimeRangeStore((s) => s.range);
  const searchParams = useSearchParams();

  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [riskFilter, setRiskFilter] = React.useState("all");
  const [sort, setSort] = React.useState<"risk" | "name" | "lastSeen">("risk");
  const [selectedId, setSelectedId] = React.useState<string | null>(
    searchParams.get("asset")
  );

  React.useEffect(() => {
    const asset = searchParams.get("asset");
    if (asset) setSelectedId(asset);
  }, [searchParams]);

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return assets
      .filter((asset) => {
        if (typeFilter !== "all" && asset.type !== typeFilter) return false;
        if (riskFilter === "high" && asset.riskScore < 60) return false;
        if (riskFilter === "critical" && asset.riskScore < 80) return false;
        if (riskFilter === "low" && asset.riskScore >= 60) return false;
        if (!query) return true;
        return (
          asset.name.toLowerCase().includes(query) ||
          asset.id.toLowerCase().includes(query) ||
          (asset.ipAddress ?? "").includes(query) ||
          asset.tags.some((tag) => tag.toLowerCase().includes(query))
        );
      })
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name);
        if (sort === "lastSeen") return b.lastSeen.localeCompare(a.lastSeen);
        return b.riskScore - a.riskScore;
      });
  }, [assets, search, typeFilter, riskFilter, sort]);

  const selected = assets.find((asset) => asset.id === selectedId) ?? null;
  const inRangeEvents = React.useMemo(
    () => events.filter((event) => isInRange(event.timestamp, range)),
    [events, range]
  );

  const lastSeenByAsset = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const event of events) {
      for (const assetId of [event.sourceHostId, event.destinationHostId]) {
        if (!assetId) continue;
        const current = map.get(assetId);
        if (!current || event.timestamp > current) {
          map.set(assetId, event.timestamp);
        }
      }
    }
    return map;
  }, [events]);

  const lastSeenFor = React.useCallback(
    (asset: { id: string; lastSeen: string }) =>
      lastSeenByAsset.get(asset.id) ?? asset.lastSeen,
    [lastSeenByAsset]
  );

  const selectedEvents = React.useMemo(() => {
    if (!selected) return [];
    return inRangeEvents
      .filter(
        (event) =>
          event.sourceHostId === selected.id ||
          event.destinationHostId === selected.id
      )
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 8);
  }, [inRangeEvents, selected]);

  const selectedAlerts = React.useMemo(() => {
    if (!selected) return [];
    return alerts
      .filter(
        (alert) =>
          selected.relatedAlertIds.includes(alert.id) ||
          alert.relatedAssetIds.includes(selected.id)
      )
      .sort((a, b) => b.firstSeen.localeCompare(a.firstSeen))
      .slice(0, 6);
  }, [alerts, selected]);

  const counts = React.useMemo(() => {
    return {
      total: assets.length,
      highRisk: assets.filter((asset) => asset.riskScore >= 60).length,
      servers: assets.filter((asset) => asset.type === "server").length,
      workstations: assets.filter((asset) => asset.type === "workstation").length,
      avgRisk:
        assets.length === 0
          ? 0
          : Math.round(
              assets.reduce((sum, asset) => sum + asset.riskScore, 0) /
                assets.length
            ),
    };
  }, [assets]);

  return (
    <div>
      <PageHeader
        eyebrow="Attack surface"
        title="Asset inventory"
        description="Endpoint, server, application, gateway, and identity assets observed in the synthetic environment. Risk scores are derived demo values."
      />

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MiniStat label="Total assets" value={counts.total} />
          <MiniStat label="High risk (≥60)" value={counts.highRisk} tone="warning" />
          <MiniStat label="Servers" value={counts.servers} />
          <MiniStat label="Average risk" value={counts.avgRisk} />
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--subtle)]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, IP, tag, or asset ID…"
              className="pl-8"
              aria-label="Search assets"
            />
          </div>
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-auto min-w-[140px] text-xs"
            aria-label="Filter by asset type"
          >
            <option value="all">All asset types</option>
            {ASSET_TYPES.map((type) => (
              <option key={type} value={type}>
                {TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
          <Select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="w-auto min-w-[130px] text-xs"
            aria-label="Filter by risk"
          >
            <option value="all">All risk levels</option>
            <option value="critical">Critical (≥80)</option>
            <option value="high">Elevated (&gt;60)</option>
            <option value="low">Baseline (&lt;60)</option>
          </Select>
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="w-auto min-w-[130px] text-xs"
            aria-label="Sort assets"
          >
            <option value="risk">Sort: risk</option>
            <option value="name">Sort: name</option>
            <option value="lastSeen">Sort: last seen</option>
          </Select>
          {(search || typeFilter !== "all" || riskFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setTypeFilter("all");
                setRiskFilter("all");
              }}
            >
              <FilterX /> Clear
            </Button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            <EmptyState
              icon={<Boxes className="size-4" />}
              title="No assets match"
              description="Try clearing the asset type or risk filters."
            />
          </div>
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>Asset</Th>
                <Th className="w-[120px]">Type</Th>
                <Th className="w-[140px]">IP address</Th>
                <Th className="w-[160px]">Risk</Th>
                <Th className="w-[90px]">Alerts</Th>
                <Th className="w-[130px]">Last seen</Th>
                <Th className="w-[40px]" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((asset) => (
                <tr
                  key={asset.id}
                  className="cursor-pointer transition-colors hover:bg-[var(--surface-2)]"
                  onClick={() => setSelectedId(asset.id)}
                >
                  <Td>
                    <div className="flex items-center gap-2">
                      <span className="flex size-6 items-center justify-center rounded border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]">
                        <AssetIcon type={asset.type} />
                      </span>
                      <div className="min-w-0">
                        <span className="block truncate text-[11px] font-medium">
                          {asset.name}
                        </span>
                        <span className="block truncate font-mono text-[9px] text-[var(--subtle)]">
                          {asset.id} · {asset.environment}
                        </span>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-[10px] text-[var(--muted)]">
                    {TYPE_LABELS[asset.type]}
                  </Td>
                  <Td className="font-mono text-[10px] text-[var(--muted)]">
                    {asset.ipAddress ?? "not assigned"}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={asset.riskScore}
                        tone={riskTone(asset.riskScore)}
                        className="w-20"
                      />
                      <span className="font-mono text-[10px]">
                        {asset.riskScore}
                      </span>
                    </div>
                  </Td>
                  <Td className="font-mono text-[10px]">
                    {asset.relatedAlertIds.length}
                  </Td>
                  <Td className="font-mono text-[10px] text-[var(--subtle)]">
                    {relativeTime(lastSeenFor(asset))}
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

      <Drawer
        open={selected !== null}
        onClose={() => setSelectedId(null)}
        title={selected?.name ?? ""}
        subtitle={
          selected ? (
            <span className="font-mono">
              {selected.id} · {TYPE_LABELS[selected.type]}
            </span>
          ) : undefined
        }
        width="max-w-xl"
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
              <div className="flex-1">
                <p className="text-[9px] uppercase tracking-[0.12em] text-[var(--subtle)]">
                  Composite risk score
                </p>
                <p className="font-mono text-2xl leading-tight">
                  {selected.riskScore}
                  <span className="ml-1 text-[11px] text-[var(--subtle)]">
                    /100
                  </span>
                </p>
              </div>
              <div className="w-32">
                <Progress
                  value={selected.riskScore}
                  tone={riskTone(selected.riskScore)}
                />
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
              <Detail label="IP address" value={selected.ipAddress ?? "not assigned"} mono />
              <Detail label="Operating system" value={selected.os ?? "n/a"} />
              <Detail label="Environment" value={selected.environment} />
              <Detail
                label="Last observed"
                value={relativeTime(lastSeenFor(selected))}
              />
              <Detail label="Tags" value={selected.tags.join(", ") || "none"} />
              <Detail label="Open alerts" value={String(selected.relatedAlertIds.length)} mono />
            </dl>

            <section>
              <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--subtle)]">
                Risk factors
              </h3>
              {selected.riskFactors.length === 0 ? (
                <p className="text-[11px] text-[var(--subtle)]">
                  No contributing risk factors recorded.
                </p>
              ) : (
                <ul className="space-y-1">
                  {selected.riskFactors.map((factor) => (
                    <li
                      key={factor}
                      className="flex items-start gap-2 rounded border border-[var(--border)] px-2.5 py-1.5 text-[11px] text-[var(--muted)]"
                    >
                      <ShieldAlert className="mt-0.5 size-3 shrink-0 text-[var(--warning)]" />
                      {factor}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--subtle)]">
                Related alerts ({selectedAlerts.length})
              </h3>
              {selectedAlerts.length === 0 ? (
                <p className="text-[11px] text-[var(--subtle)]">
                  No related alerts in the current dataset.
                </p>
              ) : (
                <ul className="space-y-1">
                  {selectedAlerts.map((alert) => (
                    <li key={alert.id}>
                      <Link
                        href={`/alerts?alert=${alert.id}`}
                        className="flex items-center gap-2 rounded border border-[var(--border)] px-2.5 py-1.5 text-[10px] hover:bg-[var(--surface-2)]"
                      >
                        <SeverityBadge severity={alert.severity} withIcon={false} />
                        <span className="min-w-0 flex-1 truncate">{alert.title}</span>
                        <span className="font-mono text-[9px] text-[var(--subtle)]">
                          {alert.status}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--subtle)]">
                Recent telemetry
              </h3>
              {selectedEvents.length === 0 ? (
                <p className="text-[11px] text-[var(--subtle)]">
                  No events from this asset in the selected time range.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
                  {selectedEvents.map((event) => (
                    <li key={event.id} className="flex items-center gap-2 px-2.5 py-1.5">
                      <span className="font-mono text-[9px] text-[var(--subtle)]">
                        {relativeTime(event.timestamp)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[10px] text-[var(--muted)]">
                        {event.description}
                      </span>
                      <SeverityBadge severity={event.severity} withIcon={false} />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
              <Link
                href={`/events?host=${selected.id}`}
                className="inline-flex items-center gap-1.5 rounded border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-[10px] hover:bg-[var(--elevated)]"
              >
                <ExternalLink className="size-3" /> View telemetry
              </Link>
              <Link
                href={`/network?entity=${selected.id}`}
                className="inline-flex items-center gap-1.5 rounded border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-[10px] hover:bg-[var(--elevated)]"
              >
                <Globe2 className="size-3" /> Open in network graph
              </Link>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "warning";
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
      <p className="font-mono text-lg leading-none">{value}</p>
      <p className="mt-1 text-[9px] uppercase tracking-[0.1em] text-[var(--subtle)]">
        {label}
      </p>
      {tone === "warning" && value > 0 && (
        <span className="mt-1 inline-block size-1 rounded-full bg-[var(--warning)]" />
      )}
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
      <dd className={cn("mt-0.5 text-[11px]", mono && "font-mono")}>{value}</dd>
    </div>
  );
}
