"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ChevronRight,
  Copy,
  Crosshair,
  ExternalLink,
  FilterX,
  Fingerprint,
  Globe2,
  Search,
  Star,
} from "lucide-react";
import type { IndicatorRisk } from "@/domain/models/indicator";
import { PageHeader } from "@/components/ui/kpi-card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { TableShell, Th, Td } from "@/components/ui/table";
import { useLiveAlerts, useLiveEvents, useLiveIndicators } from "@/hooks/use-live-data";
import { getRepositories } from "@/data/repositories";
import { recordAudit } from "@/lib/audit";
import { relativeTime } from "@/lib/time/time";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";

const TYPE_LABELS: Record<string, string> = {
  ip: "IPv4 address",
  domain: "Domain",
  file_hash: "File hash",
  username: "Username",
  hostname: "Hostname",
};

const RISK_ORDER: IndicatorRisk[] = ["low", "medium", "high", "critical"];
const RISK_TONE: Record<IndicatorRisk, "success" | "accent" | "warning" | "danger"> = {
  low: "success",
  medium: "accent",
  high: "warning",
  critical: "danger",
};

export function IntelligenceExplorer() {
  const indicators = useLiveIndicators();
  const alerts = useLiveAlerts();
  const events = useLiveEvents();
  const searchParams = useSearchParams();

  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [riskFilter, setRiskFilter] = React.useState("all");
  const [selectedId, setSelectedId] = React.useState<string | null>(
    searchParams.get("indicator")
  );
  const [notes, setNotes] = React.useState("");
  const [savingNotes, setSavingNotes] = React.useState(false);

  React.useEffect(() => {
    const indicator = searchParams.get("indicator");
    if (indicator) setSelectedId(indicator);
  }, [searchParams]);

  const selected = indicators.find((indicator) => indicator.id === selectedId) ?? null;

  React.useEffect(() => {
    setNotes(selected?.analystNotes ?? "");
  }, [selected?.id, selected?.analystNotes]);

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return indicators
      .filter((indicator) => {
        if (typeFilter !== "all" && indicator.type !== typeFilter) return false;
        if (riskFilter !== "all" && indicator.riskRating !== riskFilter) return false;
        if (!query) return true;
        return (
          indicator.value.toLowerCase().includes(query) ||
          indicator.source.toLowerCase().includes(query) ||
          indicator.description.toLowerCase().includes(query) ||
          indicator.id.toLowerCase().includes(query)
        );
      })
      .sort(
        (a, b) =>
          RISK_ORDER.indexOf(b.riskRating) - RISK_ORDER.indexOf(a.riskRating) ||
          b.confidence - a.confidence
      );
  }, [indicators, search, typeFilter, riskFilter]);

  const indicatorMatchesEvent = React.useCallback(
    (event: (typeof events)[number]) =>
      selected !== null &&
      ((selected.type === "ip" &&
        (event.sourceIp === selected.value ||
          event.destinationIp === selected.value)) ||
        (selected.type === "domain" && event.details?.domain === selected.value) ||
        (selected.type === "username" && event.userId === selected.value) ||
        (selected.type === "hostname" && event.sourceHostId === selected.value)),
    [selected]
  );

  const relatedAlerts = React.useMemo(() => {
    if (!selected) return [];
    const matchedEventIds = new Set(
      events.filter((event) => indicatorMatchesEvent(event)).map((event) => event.id)
    );
    return alerts.filter(
      (alert) =>
        selected.relatedAlertIds.includes(alert.id) ||
        alert.relatedEventIds.some((id) => matchedEventIds.has(id))
    );
  }, [alerts, events, selected, indicatorMatchesEvent]);

  const relatedEvents = React.useMemo(() => {
    if (!selected) return [];
    return events
      .filter(
        (event) =>
          selected.relatedEventIds.includes(event.id) ||
          indicatorMatchesEvent(event)
      )
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 8);
  }, [events, selected, indicatorMatchesEvent]);

  const saveNotes = async () => {
    if (!selected) return;
    setSavingNotes(true);
    try {
      await getRepositories().indicators.update(selected.id, {
        analystNotes: notes.trim(),
      });
      await recordAudit({
        action: "indicator.notes_updated",
        entityType: "indicator",
        entityId: selected.id,
        entityLabel: selected.value,
        details: { length: notes.trim().length },
      });
      toast.success("Analyst notes saved");
    } catch (error) {
      toast.error("Could not save notes", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSavingNotes(false);
    }
  };

  const copyValue = async () => {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(selected.value);
      toast.success("Indicator copied to clipboard");
    } catch {
      toast.error("Clipboard unavailable in this browser");
    }
  };

  const counts = React.useMemo(
    () => ({
      total: indicators.length,
      high: indicators.filter((indicator) =>
        ["high", "critical"].includes(indicator.riskRating)
      ).length,
      matched: indicators.filter(
        (indicator) => indicator.relatedAlertIds.length > 0
      ).length,
      types: new Set(indicators.map((indicator) => indicator.type)).size,
    }),
    [indicators]
  );

  return (
    <div>
      <PageHeader
        eyebrow="Threat context"
        title="Intelligence"
        description="Synthetic indicators of compromise with confidence scoring and links to matching telemetry. All values are fabricated for the demo."
      />

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MiniStat label="Indicators tracked" value={counts.total} />
          <MiniStat label="High / critical" value={counts.high} />
          <MiniStat label="Matched to alerts" value={counts.matched} />
          <MiniStat label="Indicator types" value={counts.types} />
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--subtle)]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search IOC value, source, or description…"
              className="pl-8"
              aria-label="Search indicators"
            />
          </div>
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-auto min-w-[150px] text-xs"
            aria-label="Filter by indicator type"
          >
            <option value="all">All indicator types</option>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="w-auto min-w-[140px] text-xs"
            aria-label="Filter by risk rating"
          >
            <option value="all">All risk ratings</option>
            {[...RISK_ORDER].reverse().map((risk) => (
              <option key={risk} value={risk}>
                {risk}
              </option>
            ))}
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
              icon={<Crosshair className="size-4" />}
              title="No indicators match"
              description="Try a broader search or clear the type and risk filters."
            />
          </div>
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>Indicator</Th>
                <Th className="w-[120px]">Type</Th>
                <Th className="w-[100px]">Risk</Th>
                <Th className="w-[150px]">Confidence</Th>
                <Th className="w-[140px]">Source</Th>
                <Th className="w-[90px]">Alerts</Th>
                <Th className="w-[130px]">Last seen</Th>
                <Th className="w-[40px]" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((indicator) => (
                <tr
                  key={indicator.id}
                  className="cursor-pointer transition-colors hover:bg-[var(--surface-2)]"
                  onClick={() => setSelectedId(indicator.id)}
                >
                  <Td className="max-w-[320px]">
                    <span className="block truncate font-mono text-[10px]">
                      {indicator.value}
                    </span>
                    <span className="block truncate text-[9px] text-[var(--subtle)]">
                      {indicator.description}
                    </span>
                  </Td>
                  <Td className="text-[10px] text-[var(--muted)]">
                    {TYPE_LABELS[indicator.type]}
                  </Td>
                  <Td>
                    <SeverityBadge severity={indicator.riskRating} withIcon={false} />
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={indicator.confidence}
                        tone={RISK_TONE[indicator.riskRating]}
                        className="w-16"
                      />
                      <span className="font-mono text-[10px]">
                        {indicator.confidence}%
                      </span>
                    </div>
                  </Td>
                  <Td className="text-[10px] text-[var(--muted)]">
                    {indicator.source}
                  </Td>
                  <Td className="font-mono text-[10px]">
                    {indicator.relatedAlertIds.length}
                  </Td>
                  <Td className="font-mono text-[10px] text-[var(--subtle)]">
                    {relativeTime(indicator.lastSeen)}
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
        title={selected ? TYPE_LABELS[selected.type] : ""}
        subtitle={
          selected ? (
            <span className="font-mono">{selected.id} · {selected.source}</span>
          ) : undefined
        }
        width="max-w-xl"
      >
        {selected && (
          <div className="space-y-5">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
              <div className="flex items-start gap-2">
                <Fingerprint className="mt-0.5 size-3.5 shrink-0 text-[var(--accent)]" />
                <p className="min-w-0 flex-1 break-all font-mono text-xs">
                  {selected.value}
                </p>
                <button
                  type="button"
                  onClick={() => void copyValue()}
                  aria-label="Copy indicator value"
                  className="rounded p-1 text-[var(--subtle)] hover:bg-[var(--elevated)] hover:text-[var(--foreground)]"
                >
                  <Copy className="size-3.5" />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <SeverityBadge severity={selected.riskRating} />
                <span className="rounded border border-[var(--border)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--muted)]">
                  confidence {selected.confidence}%
                </span>
                <span className="inline-flex items-center gap-1 rounded border border-[var(--border)] px-1.5 py-0.5 text-[9px] text-[var(--subtle)]">
                  <Star className="size-2.5" /> synthetic indicator
                </span>
              </div>
            </div>

            <p className="text-[11px] leading-relaxed text-[var(--muted)]">
              {selected.description}
            </p>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
              <Detail label="First seen" value={relativeTime(selected.firstSeen)} />
              <Detail label="Last seen" value={relativeTime(selected.lastSeen)} />
              <Detail
                label="Related assets"
                value={String(selected.relatedAssetIds.length)}
              />
              <Detail label="Source" value={selected.source} />
            </dl>

            <section>
              <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--subtle)]">
                Matching alerts ({relatedAlerts.length})
              </h3>
              {relatedAlerts.length === 0 ? (
                <p className="text-[11px] text-[var(--subtle)]">
                  No alert currently references this indicator.
                </p>
              ) : (
                <ul className="space-y-1">
                  {relatedAlerts.slice(0, 5).map((alert) => (
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
                Matching telemetry ({relatedEvents.length})
              </h3>
              {relatedEvents.length === 0 ? (
                <p className="text-[11px] text-[var(--subtle)]">
                  No matching events in the local dataset.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
                  {relatedEvents.map((event) => (
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

            <section>
              <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--subtle)]">
                Analyst notes
              </h3>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add context, triage decisions, or watchlist rationale…"
                aria-label="Analyst notes"
              />
              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  disabled={
                    savingNotes || notes.trim() === (selected.analystNotes ?? "")
                  }
                  onClick={() => void saveNotes()}
                >
                  Save notes
                </Button>
              </div>
            </section>

            <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
              {selected.type !== "file_hash" && selected.type !== "username" && (
                <Link
                  href={`/network?entity=${encodeURIComponent(selected.value)}`}
                  className="inline-flex items-center gap-1.5 rounded border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-[10px] hover:bg-[var(--elevated)]"
                >
                  <Globe2 className="size-3" /> Open in graph
                </Link>
              )}
              <Link
                href={`/events?search=${encodeURIComponent(selected.value)}`}
                className="inline-flex items-center gap-1.5 rounded border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-[10px] hover:bg-[var(--elevated)]"
              >
                <ExternalLink className="size-3" /> Search telemetry
              </Link>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
      <p className="font-mono text-lg leading-none">{value}</p>
      <p className="mt-1 text-[9px] uppercase tracking-[0.1em] text-[var(--subtle)]">
        {label}
      </p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[9px] uppercase tracking-[0.1em] text-[var(--subtle)]">
        {label}
      </dt>
      <dd className={cn("mt-0.5 text-[11px]")}>{value}</dd>
    </div>
  );
}
