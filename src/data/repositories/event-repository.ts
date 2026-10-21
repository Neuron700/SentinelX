import type { SentinelXDatabase } from "@/lib/storage/db";
import { BaseRepository } from "./base-repository";
import { schemas } from "@/domain/validation/schemas";
import type { SecurityEvent, EventFilters } from "@/domain/models/event";
import type { Severity, TimeRange, TimeSeriesPoint } from "@/domain/models/common";
import { SEVERITIES, SEVERITY_RANK } from "@/domain/models/common";
import { format } from "date-fns";
import { parseISO } from "date-fns";

export class EventRepository extends BaseRepository<SecurityEvent> {
  constructor(db: SentinelXDatabase) {
    super(db.events, "event", schemas.event);
  }

  async getByTimeRange(range: TimeRange): Promise<SecurityEvent[]> {
    return this.table
      .where("timestamp")
      .between(range.from, range.to, true, true)
      .toArray();
  }

  async getByScenario(scenarioId: string): Promise<SecurityEvent[]> {
    return this.table.where("scenarioId").equals(scenarioId).toArray();
  }

  async getByHost(hostId: string): Promise<SecurityEvent[]> {
    const src = await this.table.where("sourceHostId").equals(hostId).toArray();
    const dst = await this.table
      .where("destinationHostId")
      .equals(hostId)
      .toArray();
    const map = new Map<string, SecurityEvent>();
    for (const e of [...src, ...dst]) map.set(e.id, e);
    return [...map.values()].sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp)
    );
  }

  async getNeighbors(
    event: SecurityEvent,
    count = 10
  ): Promise<{ before: SecurityEvent[]; after: SecurityEvent[] }> {
    const all = await this.table.orderBy("timestamp").toArray();
    const idx = all.findIndex((e) => e.id === event.id);
    if (idx === -1) return { before: [], after: [] };
    return {
      before: all.slice(Math.max(0, idx - count), idx),
      after: all.slice(idx + 1, idx + 1 + count),
    };
  }

  async search(
    filters: EventFilters,
    range: TimeRange,
    options: { offset?: number; limit?: number; sortDirection?: "asc" | "desc" } = {}
  ): Promise<{ items: SecurityEvent[]; total: number }> {
    const inRange = await this.getByTimeRange(range);
    const q = filters.search.trim().toLowerCase();
    const minRank = filters.minSeverity
      ? SEVERITY_RANK[filters.minSeverity]
      : -1;

    const filtered = inRange.filter((e) => {
      if (minRank >= 0 && SEVERITY_RANK[e.severity] < minRank) return false;
      if (filters.severities.length > 0 && !filters.severities.includes(e.severity))
        return false;
      if (
        filters.eventTypes.length > 0 &&
        !filters.eventTypes.includes(e.eventType)
      )
        return false;
      if (filters.hostId) {
        if (
          e.sourceHostId !== filters.hostId &&
          e.destinationHostId !== filters.hostId
        )
          return false;
      }
      if (filters.userId && e.userId !== filters.userId) return false;
      if (filters.scenarioId && e.scenarioId !== filters.scenarioId) return false;
      if (q) {
        const haystack = [
          e.id,
          e.eventType,
          e.description,
          e.sourceIp,
          e.destinationIp,
          e.userId,
          e.sourceHostId,
          e.destinationHostId,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    const dir = options.sortDirection === "desc" ? -1 : 1;
    filtered.sort((a, b) => a.timestamp.localeCompare(b.timestamp) * dir);
    const total = filtered.length;
    const offset = options.offset ?? 0;
    const limit = options.limit ?? total;
    return { items: filtered.slice(offset, offset + limit), total };
  }

  async countBySeverity(range?: TimeRange): Promise<Record<Severity, number>> {
    const events = range ? await this.getByTimeRange(range) : await this.getAll();
    const counts: Record<Severity, number> = {
      info: 0,
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };
    for (const e of events) counts[e.severity]++;
    return counts;
  }

  async countByEventType(
    range: TimeRange,
    limit = 8
  ): Promise<{ type: string; count: number }[]> {
    const events = await this.getByTimeRange(range);
    const map = new Map<string, number>();
    for (const e of events) {
      map.set(e.eventType, (map.get(e.eventType) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  async getTimelineSeries(
    range: TimeRange,
    bucketMinutes: number
  ): Promise<TimeSeriesPoint[]> {
    const events = await this.getByTimeRange(range);
    const bucketMs = bucketMinutes * 60_000;
    const start = new Date(range.from).getTime();
    const end = new Date(range.to).getTime();
    const buckets = new Map<
      number,
      { count: number } & Record<Severity, number>
    >();

    for (let t = start; t < end; t += bucketMs) {
      buckets.set(t, {
        count: 0,
        info: 0,
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      });
    }

    for (const e of events) {
      const t = new Date(e.timestamp).getTime();
      const bucket = start + Math.floor((t - start) / bucketMs) * bucketMs;
      const b = buckets.get(bucket);
      if (!b) continue;
      b.count++;
      b[e.severity]++;
    }

    return [...buckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([t, b]) => ({
        timestamp: new Date(t).toISOString(),
        label:
          bucketMinutes >= 1440
            ? format(parseISO(new Date(t).toISOString()), "MMM d")
            : format(parseISO(new Date(t).toISOString()), "HH:mm"),
        count: b.count,
        critical: b.critical,
        high: b.high,
        medium: b.medium,
        low: b.low,
        info: b.info,
      }));
  }

  async distinctEventTypes(): Promise<string[]> {
    const all = await this.getAll();
    return [...new Set(all.map((e) => e.eventType))].sort();
  }

  async distinctUserIds(): Promise<string[]> {
    const all = await this.getAll();
    return [...new Set(all.map((e) => e.userId).filter((u): u is string => !!u))].sort();
  }

  async severityOrderCheck(): Promise<Severity[]> {
    return [...SEVERITIES];
  }
}
