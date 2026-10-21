import { describe, expect, it } from "vitest";
import {
  buildEventSeries,
  buildAlertSeries,
  severityCounts,
  eventTypeCounts,
  computeMtta,
  computeMttr,
  formatMinutes,
  hostActivity,
} from "@/features/overview/derive";
import type { SecurityEvent } from "@/domain/models/event";
import type { Alert } from "@/domain/models/alert";
import type { Incident } from "@/domain/models/incident";
import type { Asset } from "@/domain/models/asset";
import type { TimeRange } from "@/domain/models/common";

const range: TimeRange = {
  from: "2026-10-21T10:00:00.000Z",
  to: "2026-10-21T12:00:00.000Z",
  preset: "custom",
};

function event(partial: Partial<SecurityEvent>): SecurityEvent {
  return {
    id: "evt-1",
    timestamp: "2026-10-21T11:00:00.000Z",
    eventType: "authentication_failure",
    severity: "medium",
    sourceHostId: "asset-a",
    destinationHostId: null,
    sourceIp: null,
    destinationIp: null,
    userId: "u1",
    description: "test",
    relatedAlertIds: [],
    scenarioId: null,
    ...partial,
  };
}

function alert(partial: Partial<Alert>): Alert {
  return {
    id: "alert-1",
    title: "Test",
    severity: "high",
    status: "new",
    confidence: 80,
    ruleId: "rule-1",
    firstSeen: "2026-10-21T11:00:00.000Z",
    lastSeen: "2026-10-21T11:00:00.000Z",
    relatedEventIds: [],
    relatedAssetIds: [],
    relatedEntityIds: [],
    incidentId: null,
    assignedTo: null,
    acknowledgedAt: null,
    resolvedAt: null,
    resolution: null,
    notes: [],
    scenarioId: null,
    ...partial,
  };
}

describe("dashboard derivations", () => {
  it("buckets events into the correct number of points", () => {
    const series = buildEventSeries(
      [
        event({ timestamp: "2026-10-21T10:05:00.000Z" }),
        event({ timestamp: "2026-10-21T11:05:00.000Z" }),
      ],
      range
    );
    expect(series.length).toBe(4);
    expect(series.reduce((sum, p) => sum + p.count, 0)).toBe(2);
  });

  it("counts severities", () => {
    const counts = severityCounts([
      event({ severity: "critical" }),
      event({ severity: "critical" }),
      event({ severity: "low" }),
    ]);
    expect(counts.critical).toBe(2);
    expect(counts.low).toBe(1);
    expect(counts.info).toBe(0);
  });

  it("ranks event types by count", () => {
    const result = eventTypeCounts([
      event({ eventType: "dns_query" }),
      event({ eventType: "dns_query" }),
      event({ eventType: "file_access" }),
    ]);
    expect(result[0]).toEqual({ type: "dns_query", count: 2 });
  });

  it("builds 24-hour host activity rows", () => {
    const assets: Asset[] = [
      {
        id: "asset-a",
        name: "host-a",
        type: "workstation",
        environment: "corp",
        os: null,
        ipAddress: null,
        riskScore: 10,
        riskFactors: [],
        lastSeen: "2026-10-21T11:00:00.000Z",
        relatedAlertIds: [],
        tags: [],
      },
    ];
    const rows = hostActivity(
      [event({ timestamp: "2026-10-21T11:00:00.000Z" })],
      assets
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].hours).toHaveLength(24);
    expect(rows[0].total).toBe(1);
    expect(rows[0].name).toBe("host-a");
  });

  it("computes MTTA only from acknowledged alerts", () => {
    const result = computeMtta([
      alert({
        firstSeen: "2026-10-21T10:00:00.000Z",
        acknowledgedAt: "2026-10-21T10:30:00.000Z",
      }),
      alert({ id: "alert-2", acknowledgedAt: null }),
    ]);
    expect(result.sample).toBe(1);
    expect(result.minutes).toBe(30);
  });

  it("computes MTTR from resolved or closed incidents", () => {
    const base = {
      id: "INC-1",
      title: "t",
      description: "",
      severity: "high",
      status: "resolved",
      createdAt: "2026-10-21T10:00:00.000Z",
      updatedAt: "2026-10-21T12:00:00.000Z",
      assignedTo: null,
      alertIds: [],
      eventIds: [],
      assetIds: [],
      timeline: [],
      findings: [],
      playbookId: null,
      playbookProgress: [],
      falsePositive: false,
      closedReason: null,
      resolutionSummary: null,
    } satisfies Incident;
    const result = computeMttr([base]);
    expect(result.sample).toBe(1);
    expect(result.minutes).toBe(120);
  });

  it("returns null metrics with no samples", () => {
    expect(computeMtta([])).toEqual({ minutes: null, sample: 0 });
    expect(computeMttr([])).toEqual({ minutes: null, sample: 0 });
    expect(formatMinutes(null)).toBe("—");
  });

  it("builds alert series from alert firstSeen", () => {
    const series = buildAlertSeries(
      [alert({ firstSeen: "2026-10-21T10:10:00.000Z", severity: "critical" })],
      range
    );
    expect(series.reduce((sum, p) => sum + p.count, 0)).toBe(1);
    expect(series.reduce((sum, p) => sum + p.critical, 0)).toBe(1);
  });
});
