"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Clock3,
  Download,
  FileJson,
  FileSpreadsheet,
  FolderKanban,
  Printer,
  ShieldCheck,
  Sigma,
} from "lucide-react";
import { PageHeader, KpiCard } from "@/components/ui/kpi-card";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { TableShell, Th, Td } from "@/components/ui/table";
import {
  useLiveAlerts,
  useLiveEvents,
  useLiveIncidents,
  useLiveRules,
  useLiveScenarioResults,
  useLiveScenarios,
} from "@/hooks/use-live-data";
import { useTimeRangeStore } from "@/store/time-range-store";
import {
  computeMtta,
  computeMttr,
  eventTypeCounts,
  formatMinutes,
  severityCounts,
} from "@/features/overview/derive";
import { downloadCsv, downloadJson, timestampedFilename } from "@/lib/export/download";
import { formatTimestamp, isInRange, rangeLabel } from "@/lib/time/time";
import { toast } from "sonner";
import type { Severity } from "@/domain/models/common";
import { SEVERITIES } from "@/domain/models/common";

const SEVERITY_TONE: Record<Severity, "success" | "accent" | "warning" | "danger"> = {
  info: "success",
  low: "accent",
  medium: "accent",
  high: "warning",
  critical: "danger",
};

export function ReportView() {
  const events = useLiveEvents();
  const alerts = useLiveAlerts();
  const incidents = useLiveIncidents();
  const rules = useLiveRules();
  const scenarios = useLiveScenarios();
  const results = useLiveScenarioResults();
  const range = useTimeRangeStore((s) => s.range);

  const scopedEvents = React.useMemo(
    () =>
      events
        .filter((event) => isInRange(event.timestamp, range))
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [events, range]
  );
  const scopedAlerts = React.useMemo(
    () =>
      alerts
        .filter((alert) => isInRange(alert.firstSeen, range))
        .sort((a, b) => b.firstSeen.localeCompare(a.firstSeen)),
    [alerts, range]
  );
  const scopedIncidents = React.useMemo(
    () =>
      incidents
        .filter((incident) => isInRange(incident.createdAt, range))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [incidents, range]
  );
  const scopedResults = React.useMemo(
    () =>
      results
        .filter((result) => isInRange(result.completedAt, range))
        .sort((a, b) => b.completedAt.localeCompare(a.completedAt)),
    [results, range]
  );

  const severity = severityCounts(scopedEvents);
  const eventTypes = eventTypeCounts(scopedEvents, 8);
  const mtta = computeMtta(scopedAlerts);
  const mttr = computeMttr(scopedIncidents);
  const maxSeverity = Math.max(1, ...Object.values(severity));
  const detectionRate =
    scopedEvents.length === 0
      ? 0
      : Math.round((scopedAlerts.length / scopedEvents.length) * 1000) / 10;

  const alertStatus = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const alert of scopedAlerts) {
      counts.set(alert.status, (counts.get(alert.status) ?? 0) + 1);
    }
    return counts;
  }, [scopedAlerts]);

  const topRules = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const alert of scopedAlerts) {
      counts.set(alert.ruleId, (counts.get(alert.ruleId) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([ruleId, count]) => ({
        ruleId,
        name: rules.find((rule) => rule.id === ruleId)?.name ?? ruleId,
        severity:
          rules.find((rule) => rule.id === ruleId)?.severity ?? "medium",
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [scopedAlerts, rules]);

  const topHosts = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of scopedEvents) {
      if (!event.sourceHostId) continue;
      counts.set(
        event.sourceHostId,
        (counts.get(event.sourceHostId) ?? 0) + 1
      );
    }
    return [...counts.entries()]
      .map(([hostId, count]) => ({ hostId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [scopedEvents]);

  const report = React.useMemo(
    () => ({
      generatedAt: new Date().toISOString(),
      platform: "SentinelX",
      classification: "Synthetic demo data",
      timeRange: range,
      summary: {
        eventsAnalyzed: scopedEvents.length,
        alertsCreated: scopedAlerts.length,
        incidentsOpened: scopedIncidents.length,
        detectionRatePercent: detectionRate,
        meanTimeToAcknowledgeMinutes: mtta.minutes,
        meanTimeToResolveMinutes: mttr.minutes,
      },
      severityBreakdown: severity,
      eventTypeBreakdown: eventTypes,
      alertStatusBreakdown: Object.fromEntries(alertStatus),
      topRules,
      topSourceHosts: topHosts,
      incidents: scopedIncidents.map((incident) => ({
        id: incident.id,
        title: incident.title,
        severity: incident.severity,
        status: incident.status,
        createdAt: incident.createdAt,
        updatedAt: incident.updatedAt,
        assignedTo: incident.assignedTo,
        findings: incident.findings.length,
      })),
      scenarioRuns: scopedResults.map((result) => ({
        scenarioId: result.scenarioId,
        completedAt: result.completedAt,
        eventsGenerated: result.eventsGenerated,
        alertsGenerated: result.alertsGenerated,
        durationSeconds: result.durationSeconds,
      })),
    }),
    [
      range,
      scopedEvents.length,
      scopedAlerts.length,
      scopedIncidents,
      detectionRate,
      mtta.minutes,
      mttr.minutes,
      severity,
      eventTypes,
      alertStatus,
      topRules,
      topHosts,
      scopedResults,
    ]
  );

  const exportReport = () => {
    downloadJson(timestampedFilename("sentinelx-report", "json"), report);
    toast.success("Report exported", {
      description: "JSON report includes the selected time range and synthetic-data notice.",
    });
  };

  const exportAlerts = () => {
    if (scopedAlerts.length === 0) {
      toast.info("No alerts in the selected range");
      return;
    }
    downloadCsv(
      timestampedFilename("sentinelx-alerts", "csv"),
      scopedAlerts.map((alert) => ({
        id: alert.id,
        title: alert.title,
        severity: alert.severity,
        status: alert.status,
        ruleId: alert.ruleId,
        firstSeen: alert.firstSeen,
        lastSeen: alert.lastSeen,
        assignedTo: alert.assignedTo ?? "",
        incidentId: alert.incidentId ?? "",
        scenarioId: alert.scenarioId ?? "",
      }))
    );
    toast.success(`Exported ${scopedAlerts.length} alerts`);
  };

  const exportEvents = () => {
    if (scopedEvents.length === 0) {
      toast.info("No events in the selected range");
      return;
    }
    downloadCsv(
      timestampedFilename("sentinelx-events", "csv"),
      scopedEvents.map((event) => ({
        id: event.id,
        timestamp: event.timestamp,
        eventType: event.eventType,
        severity: event.severity,
        sourceHostId: event.sourceHostId ?? "",
        destinationHostId: event.destinationHostId ?? "",
        sourceIp: event.sourceIp ?? "",
        destinationIp: event.destinationIp ?? "",
        userId: event.userId ?? "",
        description: event.description,
        scenarioId: event.scenarioId ?? "",
      }))
    );
    toast.success(`Exported ${scopedEvents.length} events`);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Operational reporting"
        title="Reports"
        description={`SOC operations summary for ${rangeLabel(range)}. All metrics are computed from local synthetic telemetry.`}
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button variant="secondary" size="sm" onClick={exportReport}>
              <FileJson /> Export JSON
            </Button>
            <Button variant="secondary" size="sm" onClick={exportAlerts}>
              <FileSpreadsheet /> Alerts CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={exportEvents}>
              <FileSpreadsheet /> Events CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={() => window.print()}>
              <Printer /> Print
            </Button>
          </div>
        }
      />

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard
            label="Events analyzed"
            value={scopedEvents.length}
            icon={<Activity />}
          />
          <KpiCard
            label="Alerts created"
            value={scopedAlerts.length}
            icon={<AlertTriangle />}
            tone="critical"
          />
          <KpiCard
            label="Incidents opened"
            value={scopedIncidents.length}
            icon={<FolderKanban />}
          />
          <KpiCard
            label="Detection rate"
            value={`${detectionRate}%`}
            hint="Alerts divided by analyzed events for the selected range."
            icon={<Sigma />}
          />
          <KpiCard
            label="MTTA"
            value={formatMinutes(mtta.minutes)}
            hint={`Mean time to acknowledge across ${mtta.sample} acknowledged alerts.`}
            icon={<Clock3 />}
          />
          <KpiCard
            label="MTTR"
            value={formatMinutes(mttr.minutes)}
            hint={`Mean time to resolve across ${mttr.sample} resolved incidents.`}
            icon={<ShieldCheck />}
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--subtle)]">
              Event severity distribution
            </h2>
            <div className="mt-3 space-y-2">
              {[...SEVERITIES].reverse().map((level) => (
                <div key={level} className="flex items-center gap-2">
                  <SeverityBadge severity={level} withIcon={false} />
                  <Progress
                    value={(severity[level] / maxSeverity) * 100}
                    tone={SEVERITY_TONE[level]}
                    className="flex-1"
                  />
                  <span className="w-10 text-right font-mono text-[10px]">
                    {severity[level]}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--subtle)]">
              Alert pipeline
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {["new", "in_review", "escalated", "resolved", "dismissed"].map(
                (status) => (
                  <div
                    key={status}
                    className="rounded border border-[var(--border)] bg-[var(--surface-2)] p-2.5"
                  >
                    <p className="font-mono text-base leading-none">
                      {alertStatus.get(status) ?? 0}
                    </p>
                    <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.06em] text-[var(--subtle)]">
                      {status.replace("_", " ")}
                    </p>
                  </div>
                )
              )}
            </div>
            <p className="mt-3 border-t border-[var(--border)] pt-2 text-[10px] leading-relaxed text-[var(--subtle)]">
              {scopedAlerts.length === 0
                ? "No alerts fall within the selected reporting window."
                : `${scopedAlerts.filter((alert) => alert.incidentId).length} of ${scopedAlerts.length} alerts are linked to an incident.`}
            </p>
          </section>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            <h2 className="border-b border-[var(--border)] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--subtle)]">
              Top triggering rules
            </h2>
            {topRules.length === 0 ? (
              <p className="px-4 py-5 text-center text-[11px] text-[var(--subtle)]">
                No rule activity in range.
              </p>
            ) : (
              <TableShell>
                <thead>
                  <tr>
                    <Th>Rule</Th>
                    <Th className="w-[100px]">Severity</Th>
                    <Th className="w-[70px]">Alerts</Th>
                  </tr>
                </thead>
                <tbody>
                  {topRules.map((rule) => (
                    <tr key={rule.ruleId}>
                      <Td>
                        <Link
                          href={`/rules?rule=${rule.ruleId}`}
                          className="text-[10px] hover:text-[var(--accent)] hover:underline"
                        >
                          {rule.name}
                        </Link>
                      </Td>
                      <Td>
                        <SeverityBadge severity={rule.severity} withIcon={false} />
                      </Td>
                      <Td className="font-mono text-[10px]">{rule.count}</Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            )}
          </section>

          <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            <h2 className="border-b border-[var(--border)] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--subtle)]">
              Most active source hosts
            </h2>
            {topHosts.length === 0 ? (
              <p className="px-4 py-5 text-center text-[11px] text-[var(--subtle)]">
                No host activity in range.
              </p>
            ) : (
              <TableShell>
                <thead>
                  <tr>
                    <Th>Host</Th>
                    <Th className="w-[90px]">Events</Th>
                    <Th className="w-[70px]" />
                  </tr>
                </thead>
                <tbody>
                  {topHosts.map((host) => (
                    <tr key={host.hostId}>
                      <Td className="font-mono text-[10px]">{host.hostId}</Td>
                      <Td className="font-mono text-[10px]">{host.count}</Td>
                      <Td>
                        <Link
                          href={`/assets?asset=${host.hostId}`}
                          className="text-[9px] text-[var(--accent)] hover:underline"
                        >
                          asset
                        </Link>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            )}
          </section>
        </div>

        <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--subtle)]">
              Event type breakdown
            </h2>
            <span className="font-mono text-[9px] text-[var(--subtle)]">
              {scopedEvents.length} events · top {eventTypes.length} types
            </span>
          </div>
          {eventTypes.length === 0 ? (
            <EmptyState
              icon={<Download className="size-4" />}
              title="No telemetry in range"
              description="Widen the global time range or run a scenario to generate synthetic events."
            />
          ) : (
            <div className="grid gap-x-6 gap-y-2 p-4 sm:grid-cols-2">
              {eventTypes.map((item) => {
                const max = Math.max(...eventTypes.map((entry) => entry.count));
                return (
                  <div key={item.type} className="flex items-center gap-2">
                    <span className="w-40 truncate font-mono text-[9px] text-[var(--muted)]">
                      {item.type}
                    </span>
                    <Progress
                      value={(item.count / max) * 100}
                      className="flex-1"
                    />
                    <span className="w-10 text-right font-mono text-[10px]">
                      {item.count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--subtle)]">
              Scenario runs in range ({scopedResults.length})
            </h2>
            <Link
              href="/scenarios"
              className="text-[10px] text-[var(--accent)] hover:underline"
            >
              open scenarios
            </Link>
          </div>
          {scopedResults.length === 0 ? (
            <p className="px-4 py-5 text-center text-[11px] text-[var(--subtle)]">
              No simulation completed in the selected window. Scenario results are
              recorded locally after each run.
            </p>
          ) : (
            <TableShell>
              <thead>
                <tr>
                  <Th>Scenario</Th>
                  <Th className="w-[170px]">Completed</Th>
                  <Th className="w-[100px]">Events</Th>
                  <Th className="w-[100px]">Alerts</Th>
                  <Th className="w-[110px]">Duration</Th>
                </tr>
              </thead>
              <tbody>
                {scopedResults.map((result) => (
                  <tr key={result.id}>
                    <Td>
                      <Link
                        href="/scenarios"
                        className="text-[10px] hover:text-[var(--accent)] hover:underline"
                      >
                        {scenarios.find((scenario) => scenario.id === result.scenarioId)
                          ?.title ?? result.scenarioId}
                      </Link>
                    </Td>
                    <Td className="font-mono text-[9px] text-[var(--muted)]">
                      {formatTimestamp(result.completedAt)}
                    </Td>
                    <Td className="font-mono text-[10px]">
                      {result.eventsGenerated}
                    </Td>
                    <Td className="font-mono text-[10px]">
                      {result.alertsGenerated}
                    </Td>
                    <Td className="font-mono text-[10px]">
                      {Math.floor(result.durationSeconds / 60)}m{" "}
                      {result.durationSeconds % 60}s
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </section>

        <p className="text-[10px] leading-relaxed text-[var(--subtle)]">
          Generated {formatTimestamp(report.generatedAt)} · SentinelX local demo ·
          Contains only fabricated synthetic telemetry. Exports run entirely in
          your browser.
        </p>
      </div>
    </div>
  );
}
