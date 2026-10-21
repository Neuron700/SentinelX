import type { TimeSeriesPoint, Severity, TimeRange } from "@/domain/models/common";
import type { SecurityEvent } from "@/domain/models/event";
import type { Alert } from "@/domain/models/alert";
import type { Incident } from "@/domain/models/incident";
import type { Asset } from "@/domain/models/asset";
import { bucketMinutesForRange, rangeHours } from "@/lib/time/time";
import { format, parseISO } from "date-fns";

export function buildEventSeries(
  events: SecurityEvent[],
  range: TimeRange
): TimeSeriesPoint[] {
  const hours = rangeHours(range);
  const bucketMinutes = bucketMinutesForRange(hours);
  const bucketMs = bucketMinutes * 60_000;
  const start = Math.floor(new Date(range.from).getTime() / bucketMs) * bucketMs;
  const end = new Date(range.to).getTime();

  const buckets = new Map<
    number,
    { count: number } & Record<Severity, number>
  >();
  for (let t = start; t < end; t += bucketMs) {
    buckets.set(t, { count: 0, info: 0, low: 0, medium: 0, high: 0, critical: 0 });
  }

  for (const event of events) {
    const t = new Date(event.timestamp).getTime();
    if (t < start || t > end) continue;
    const bucket = start + Math.floor((t - start) / bucketMs) * bucketMs;
    const entry = buckets.get(bucket);
    if (!entry) continue;
    entry.count += 1;
    entry[event.severity] += 1;
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([t, entry]) => ({
      timestamp: new Date(t).toISOString(),
      label:
        bucketMinutes >= 1440
          ? format(parseISO(new Date(t).toISOString()), "MMM d")
          : hours > 24
            ? format(parseISO(new Date(t).toISOString()), "MMM d HH:mm")
            : format(parseISO(new Date(t).toISOString()), "HH:mm"),
      count: entry.count,
      critical: entry.critical,
      high: entry.high,
      medium: entry.medium,
      low: entry.low,
      info: entry.info,
    }));
}

export function buildAlertSeries(
  alerts: Alert[],
  range: TimeRange
): TimeSeriesPoint[] {
  const series = buildEventSeries([], range);
  const bucketMinutes = bucketMinutesForRange(rangeHours(range));
  const bucketMs = bucketMinutes * 60_000;
  const start = Math.floor(new Date(range.from).getTime() / bucketMs) * bucketMs;
  const end = new Date(range.to).getTime();

  for (const alert of alerts) {
    const t = new Date(alert.firstSeen).getTime();
    if (t < start || t > end) continue;
    const bucket = start + Math.floor((t - start) / bucketMs) * bucketMs;
    const entry = series.find(
      (p) => new Date(p.timestamp).getTime() === bucket
    );
    if (!entry) continue;
    entry.count += 1;
    entry[alert.severity] += 1;
  }
  return series;
}

export function severityCounts(
  events: SecurityEvent[]
): Record<Severity, number> {
  const counts: Record<Severity, number> = {
    info: 0,
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };
  for (const event of events) counts[event.severity] += 1;
  return counts;
}

export function eventTypeCounts(
  events: SecurityEvent[],
  limit = 7
): { type: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const event of events) {
    counts.set(event.eventType, (counts.get(event.eventType) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export interface HostActivityRow {
  hostId: string;
  name: string;
  total: number;
  hours: number[];
}

export function hostActivity(
  events: SecurityEvent[],
  assets: Asset[],
  maxHosts = 7
): HostActivityRow[] {
  const hostNames = new Map(
    assets.filter((a) => a.type !== "user_account").map((a) => [a.id, a.name])
  );
  const byHost = new Map<string, number[]>();

  for (const event of events) {
    if (!event.sourceHostId) continue;
    const hours = byHost.get(event.sourceHostId) ?? new Array(24).fill(0);
    const hour = new Date(event.timestamp).getHours();
    hours[hour] += 1;
    byHost.set(event.sourceHostId, hours);
  }

  return [...byHost.entries()]
    .map(([hostId, hours]) => ({
      hostId,
      name: hostNames.get(hostId) ?? hostId,
      hours,
      total: hours.reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, maxHosts);
}

export function computeMtta(alerts: Alert[]): {
  minutes: number | null;
  sample: number;
} {
  const acknowledged = alerts.filter((a) => a.acknowledgedAt);
  if (acknowledged.length === 0) return { minutes: null, sample: 0 };
  const total = acknowledged.reduce((sum, alert) => {
    const first = new Date(alert.firstSeen).getTime();
    const ack = new Date(alert.acknowledgedAt!).getTime();
    return sum + Math.max(0, ack - first);
  }, 0);
  return {
    minutes: total / acknowledged.length / 60_000,
    sample: acknowledged.length,
  };
}

export function computeMttr(incidents: Incident[]): {
  minutes: number | null;
  sample: number;
} {
  const resolved = incidents.filter(
    (i) => i.status === "resolved" || i.status === "closed"
  );
  if (resolved.length === 0) return { minutes: null, sample: 0 };
  const total = resolved.reduce((sum, incident) => {
    const created = new Date(incident.createdAt).getTime();
    const updated = new Date(incident.updatedAt).getTime();
    return sum + Math.max(0, updated - created);
  }, 0);
  return {
    minutes: total / resolved.length / 60_000,
    sample: resolved.length,
  };
}

export function formatMinutes(minutes: number | null): string {
  if (minutes === null || !isFinite(minutes)) return "—";
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}
