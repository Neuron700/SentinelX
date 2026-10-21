import { describe, expect, it } from "vitest";
import { ScenarioEngine } from "@/simulation/engine";
import type { Scenario } from "@/domain/models/scenario";
import type { DetectionRule } from "@/domain/models/rule";
import type { SecurityEvent } from "@/domain/models/event";

const rule: DetectionRule = {
  id: "rule-brute-force",
  name: "Authentication Failure Burst",
  description: "test",
  severity: "high",
  enabled: true,
  detectionType: "threshold",
  conditions: [
    {
      field: "eventType",
      operator: "eq",
      value: "authentication_failure",
      timeWindowSeconds: 600,
      groupBy: "sourceIp",
      threshold: 3,
    },
  ],
  logSources: ["synthetic"],
  origin: "demo",
  lastFiredAt: null,
  alertCount: 0,
};

const sample: SecurityEvent = {
  id: "sample-1",
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

const scenario: Scenario = {
  id: "scenario-test",
  title: "Test Scenario",
  description: "test",
  difficulty: "beginner",
  category: "Authentication",
  learningObjectives: [],
  estimatedDurationMinutes: 1,
  seed: 42,
  phases: [
    {
      name: "Failures",
      description: "auth failures",
      durationSeconds: 60,
      eventRatePerMinute: 10,
      eventTypes: ["authentication_failure"],
    },
  ],
  ruleIds: [rule.id],
  rules: [rule],
  expectedFindings: [],
  successCriteria: [],
  evaluationQuestions: [],
  sampleEvents: [sample],
  severity: "high",
};

const startTime = new Date("2026-10-21T10:00:00.000Z");

describe("ScenarioEngine", () => {
  it("is deterministic for a fixed seed and step sequence", () => {
    const a = new ScenarioEngine({
      scenario,
      rules: [rule],
      seed: 123,
      startTime,
      runId: "run-a",
    });
    const b = new ScenarioEngine({
      scenario,
      rules: [rule],
      seed: 123,
      startTime,
      runId: "run-a",
    });
    const batchA = a.step(30_000);
    const batchB = b.step(30_000);
    expect(batchA.events.map((event) => event.description)).toEqual(
      batchB.events.map((event) => event.description)
    );
    expect(batchA.events.map((event) => event.timestamp)).toEqual(
      batchB.events.map((event) => event.timestamp)
    );
  });

  it("generates synthetic events with scenario id and details", () => {
    const engine = new ScenarioEngine({
      scenario,
      rules: [rule],
      seed: 7,
      startTime,
      runId: "run-c",
    });
    const batch = engine.step(30_000);
    expect(batch.events.length).toBeGreaterThan(0);
    for (const event of batch.events) {
      expect(event.scenarioId).toBe("scenario-test");
      expect(event.id.startsWith("evt-run-c")).toBe(true);
      expect(event.description).toContain("[sim]");
      expect(event.details?.synthetic).toBe(true);
    }
  });

  it("fires the threshold rule once enough failures accumulate", () => {
    const engine = new ScenarioEngine({
      scenario,
      rules: [rule],
      seed: 99,
      startTime,
      runId: "run-d",
    });
    const batch = engine.step(60_000);
    expect(batch.alerts.length).toBeGreaterThanOrEqual(1);
    expect(batch.alerts[0].ruleId).toBe(rule.id);
    expect(batch.alerts[0].relatedEventIds.length).toBeGreaterThanOrEqual(3);
    expect(batch.alerts[0].scenarioId).toBe("scenario-test");
  });

  it("completes after the phase duration", () => {
    const engine = new ScenarioEngine({
      scenario,
      rules: [rule],
      seed: 5,
      startTime,
      runId: "run-e",
    });
    const batch = engine.step(61_000);
    expect(batch.done).toBe(true);
    expect(batch.progress).toBe(1);
    expect(engine.isComplete).toBe(true);
    const after = engine.step(1000);
    expect(after.events).toHaveLength(0);
    expect(after.alerts).toHaveLength(0);
  });

  it("advances the simulated clock consistently", () => {
    const engine = new ScenarioEngine({
      scenario,
      rules: [rule],
      seed: 5,
      startTime,
      runId: "run-f",
    });
    const batch = engine.step(15_000);
    expect(batch.simulatedClock).toBe("2026-10-21T10:00:15.000Z");
    const next = engine.step(15_000);
    expect(next.simulatedClock).toBe("2026-10-21T10:00:30.000Z");
  });
});
