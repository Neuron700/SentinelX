import { describe, expect, it } from "vitest";
import { schemas, validate, ValidationError } from "@/domain/validation/schemas";

const validEvent = {
  id: "evt-1",
  timestamp: "2026-10-21T12:00:00.000Z",
  eventType: "authentication_failure",
  severity: "high",
  sourceHostId: null,
  destinationHostId: "asset-vpn-01",
  sourceIp: "198.51.100.23",
  destinationIp: "203.0.113.10",
  userId: "a.dewi",
  description: "Failed sign-in",
  relatedAlertIds: [],
  scenarioId: null,
};

describe("validation schemas", () => {
  it("accepts a valid event", () => {
    const parsed = validate(schemas.event, "event", validEvent);
    expect(parsed.id).toBe("evt-1");
  });

  it("rejects an invalid severity", () => {
    expect(() =>
      validate(schemas.event, "event", { ...validEvent, severity: "extreme" })
    ).toThrow(ValidationError);
  });

  it("rejects a bad timestamp", () => {
    expect(() =>
      validate(schemas.event, "event", { ...validEvent, timestamp: "yesterday" })
    ).toThrow(ValidationError);
  });

  it("accepts optional structured details", () => {
    const parsed = validate(schemas.event, "event", {
      ...validEvent,
      details: { bytesOut: 1200, domain: "example.test" },
    });
    expect(parsed.details).toEqual({ bytesOut: 1200, domain: "example.test" });
  });

  it("validates alert confidence bounds", () => {
    const baseAlert = {
      id: "alert-1",
      title: "Test",
      severity: "high",
      status: "new",
      confidence: 120,
      ruleId: "rule-1",
      firstSeen: "2026-10-21T12:00:00.000Z",
      lastSeen: "2026-10-21T12:00:00.000Z",
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
    };
    expect(() => validate(schemas.alert, "alert", baseAlert)).toThrow(
      ValidationError
    );
    expect(() =>
      validate(schemas.alert, "alert", { ...baseAlert, confidence: 80 })
    ).not.toThrow();
  });
});
