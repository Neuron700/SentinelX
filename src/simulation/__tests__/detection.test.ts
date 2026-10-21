import { describe, expect, it } from "vitest";
import {
  DetectionEngine,
  matchesCondition,
} from "@/simulation/detection";
import { testRuleAgainstEvents } from "@/features/rules/test-rule";
import { buildSeedEvents } from "@/data/seed/events";
import { SEED_RULES } from "@/data/seed/rules";
import type { DetectionRule, RuleCondition } from "@/domain/models/rule";
import type { SecurityEvent } from "@/domain/models/event";

const authFailure: SecurityEvent = {
  id: "evt-auth-failure",
  timestamp: "2026-10-21T10:00:00.000Z",
  eventType: "authentication_failure",
  severity: "medium",
  sourceHostId: null,
  destinationHostId: "asset-vpn-01",
  sourceIp: "198.51.100.23",
  destinationIp: "203.0.113.10",
  userId: "a.dewi",
  description: "failed sign-in",
  relatedAlertIds: [],
  scenarioId: null,
};

const networkConnection: SecurityEvent = {
  ...authFailure,
  id: "evt-network",
  eventType: "network_connection",
  description: "outbound connection",
};

const thresholdCondition: RuleCondition = {
  field: "eventType",
  operator: "eq",
  value: "authentication_failure",
  timeWindowSeconds: 600,
  groupBy: "sourceIp",
  threshold: 3,
};

const thresholdRule: DetectionRule = {
  id: "rule-threshold-test",
  name: "Threshold test",
  description: "test",
  severity: "high",
  enabled: true,
  detectionType: "threshold",
  conditions: [thresholdCondition],
  logSources: ["synthetic"],
  origin: "demo",
  lastFiredAt: null,
  alertCount: 0,
};

describe("detection predicates", () => {
  it("evaluates the predicate on threshold conditions", () => {
    expect(matchesCondition(authFailure, thresholdCondition)).toBe(true);
    expect(matchesCondition(networkConnection, thresholdCondition)).toBe(false);
  });

  it("does not count unrelated event types toward a threshold rule", () => {
    const engine = new DetectionEngine(
      [thresholdRule],
      { runId: "run-threshold", scenarioId: "scenario", scenarioTitle: "test" },
      80
    );
    const unrelated = Array.from({ length: 5 }, (_, index) => ({
      ...networkConnection,
      id: `evt-network-${index}`,
      timestamp: `2026-10-21T10:0${index}:00.000Z`,
    }));

    expect(engine.process(unrelated)).toHaveLength(0);

    const failures = Array.from({ length: 3 }, (_, index) => ({
      ...authFailure,
      id: `evt-failure-${index}`,
      timestamp: `2026-10-21T10:1${index}:00.000Z`,
    }));
    const alerts = engine.process(failures);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].ruleId).toBe(thresholdRule.id);
  });

  it("only tests events that satisfy the threshold condition predicate", () => {
    const rule: DetectionRule = {
      ...thresholdRule,
      id: "rule-data-exfil-test",
      conditions: [
        {
          field: "eventType",
          operator: "eq",
          value: "data_transfer",
          threshold: 1,
          groupBy: "userId",
          timeWindowSeconds: 3600,
        },
        { field: "details.bytesOut", operator: "gt", value: 1000 },
      ],
    };
    const events: SecurityEvent[] = [
      {
        ...authFailure,
        id: "evt-transfer",
        eventType: "data_transfer",
        details: { bytesOut: 5000 },
      },
      {
        ...networkConnection,
        id: "evt-unrelated-transfer",
        details: { bytesOut: 9000 },
      },
    ];

    const result = testRuleAgainstEvents(rule, events);
    expect(result.matchedEvents).toBe(1);
    expect(result.groupsTriggered).toBe(1);
    expect(result.sampleEventIds).toEqual(["evt-transfer"]);
  });
});

describe("seed rules against seed telemetry", () => {
  const { events } = buildSeedEvents(new Date("2026-10-21T12:00:00.000Z"));

  it("matches the seeded outbound transfer events with rule-data-exfil", () => {
    const rule = SEED_RULES.find((entry) => entry.id === "rule-data-exfil");
    expect(rule).toBeDefined();
    const result = testRuleAgainstEvents(rule!, events);
    expect(result.matchedEvents).toBeGreaterThanOrEqual(2);
    expect(result.groupsTriggered).toBeGreaterThanOrEqual(1);
  });

  it("matches the seeded encoded process events with rule-suspicious-process", () => {
    const rule = SEED_RULES.find(
      (entry) => entry.id === "rule-suspicious-process"
    );
    expect(rule).toBeDefined();
    const result = testRuleAgainstEvents(rule!, events);
    expect(result.matchedEvents).toBeGreaterThanOrEqual(2);
  });
});
