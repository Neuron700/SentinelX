"use client";

import Link from "next/link";
import {
  AlertOctagon,
  ArrowRight,
  BellRing,
  Clock3,
  FlaskConical,
  FolderSearch,
  Radar,
  Server,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { PageHeader, KpiCard } from "@/components/ui/kpi-card";
import { Button } from "@/components/ui/button";
import { EventTimeline } from "@/components/dashboard/event-timeline";
import { SeverityDonut } from "@/components/dashboard/severity-donut";
import { AlertTrend } from "@/components/dashboard/alert-trend";
import { EventTypeChart } from "@/components/dashboard/event-type-chart";
import { HostHeatmap } from "@/components/dashboard/host-heatmap";
import { ScenarioStatusCard } from "@/components/dashboard/scenario-status-card";
import { RecentIncidents } from "@/components/dashboard/recent-incidents";
import { UnhandledAlerts } from "@/components/dashboard/unhandled-alerts";
import {
  buildAlertSeries,
  buildEventSeries,
  computeMtta,
  computeMttr,
  eventTypeCounts,
  formatMinutes,
  hostActivity,
  severityCounts,
} from "@/features/overview/derive";
import { useTimeRangeStore } from "@/store/time-range-store";
import { useSettingsStore } from "@/store/settings-store";
import {
  useLiveAlerts,
  useLiveAssets,
  useLiveEvents,
  useLiveIncidents,
} from "@/hooks/use-live-data";
import { isInRange, rangeLabel } from "@/lib/time/time";

export default function CommandCenterPage() {
  const range = useTimeRangeStore((s) => s.range);
  const analystName = useSettingsStore((s) => s.analystName);

  const events = useLiveEvents();
  const alerts = useLiveAlerts();
  const incidents = useLiveIncidents();
  const assets = useLiveAssets();

  const rangedEvents = events.filter((e) => isInRange(e.timestamp, range));
  const rangedAlerts = alerts.filter((a) => isInRange(a.firstSeen, range));

  const criticalAlerts = alerts.filter(
    (a) =>
      a.severity === "critical" &&
      a.status !== "resolved" &&
      a.status !== "dismissed"
  );
  const activeIncidents = incidents.filter(
    (i) =>
      i.status === "open" || i.status === "investigating" || i.status === "contained"
  );
  const monitoredAssets = assets.filter((a) => a.type !== "user_account");
  const mtta = computeMtta(rangedAlerts);
  const mttr = computeMttr(
    incidents.filter((i) => isInRange(i.createdAt, range))
  );

  const eventSeries = buildEventSeries(rangedEvents, range);
  const alertSeries = buildAlertSeries(rangedAlerts, range);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Command center"
        title={`Good hunting, ${analystName.split(" ")[0]}.`}
        description={`Live rollup across ${rangeLabel(range).toLowerCase()}. Every number below is derived from the local synthetic dataset — nothing is hard-coded.`}
        actions={
          <>
            <Button asChild variant="secondary" size="sm">
              <Link href="/incidents">
                <FolderSearch /> Incident queue
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/scenarios">
                <FlaskConical /> Run scenario
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Events"
          value={rangedEvents.length.toLocaleString()}
          icon={<ShieldCheck />}
          href="/events"
          hint="Synthetic events ingested within the selected time range."
        />
        <KpiCard
          label="Critical alerts"
          value={criticalAlerts.length}
          tone="critical"
          icon={<AlertOctagon />}
          href="/alerts?severity=critical"
          hint="Unresolved alerts with critical severity, independent of the selected range."
        />
        <KpiCard
          label="Active incidents"
          value={activeIncidents.length}
          icon={<FolderSearch />}
          href="/incidents"
          hint="Incidents in open, investigating, or contained state."
        />
        <KpiCard
          label="Monitored assets"
          value={monitoredAssets.length}
          icon={<Server />}
          href="/assets"
          hint="Hosts, services, and gateways in the synthetic environment."
        />
        <KpiCard
          label="MTTA"
          value={formatMinutes(mtta.minutes)}
          icon={<BellRing />}
          hint={`Mean time to acknowledge, computed from ${mtta.sample} acknowledged alert${mtta.sample === 1 ? "" : "s"} in range.`}
        />
        <KpiCard
          label="MTTR"
          value={formatMinutes(mttr.minutes)}
          icon={<Timer />}
          hint={`Mean time to resolve, computed from ${mttr.sample} resolved incident${mttr.sample === 1 ? "" : "s"} created in range.`}
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <EventTimeline data={eventSeries} />
        </div>
        <SeverityDonut counts={severityCounts(rangedEvents)} />
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <AlertTrend data={alertSeries} />
        </div>
        <EventTypeChart data={eventTypeCounts(rangedEvents)} />
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <HostHeatmap rows={hostActivity(rangedEvents, assets)} />
        </div>
        <ScenarioStatusCard />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <RecentIncidents incidents={incidents} />
        <UnhandledAlerts alerts={alerts} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-[var(--border)] px-4 py-3 text-[11px] text-[var(--subtle)]">
        <span className="inline-flex items-center gap-1.5">
          <Radar className="size-3.5" />
          Correlation engine idle · detections evaluated on ingestion
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock3 className="size-3.5" />
          Dataset time uses your browser&apos;s local timezone
        </span>
        <Link
          href="/reports"
          className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline"
        >
          Generate a range report <ArrowRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}
