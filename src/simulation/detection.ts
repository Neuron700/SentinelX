import type { DetectionRule, RuleCondition } from "@/domain/models/rule";
import type { SecurityEvent } from "@/domain/models/event";
import type { Alert } from "@/domain/models/alert";
import type { Severity } from "@/domain/models/common";

export interface DetectOptions {
  runId: string;
  scenarioId: string;
  scenarioTitle: string;
  seed?: number;
}

interface RuleState {
  occurrences: { timestamp: number; group: string; eventId: string }[];
  fired: Set<string>;
}

export function resolveField(event: SecurityEvent, field: string): unknown {
  const path = field.split(".");
  let value: unknown = event;
  for (const key of path) {
    if (value == null || typeof value !== "object") return undefined;
    value = (value as Record<string, unknown>)[key];
  }
  return value;
}

function asComparable(value: unknown): string | number | boolean {
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value == null) return "";
  return String(value);
}

export function matchesCondition(
  event: SecurityEvent,
  condition: RuleCondition
): boolean {
  const actual = asComparable(resolveField(event, condition.field));
  const expected = condition.value;

  switch (condition.operator) {
    case "eq":
      return (
        String(actual).toLowerCase() === String(expected).toLowerCase() ||
        (typeof actual === "boolean" && String(actual) === String(expected))
      );
    case "neq":
      return String(actual).toLowerCase() !== String(expected).toLowerCase();
    case "gt":
      return Number(actual) > Number(expected);
    case "gte":
      return Number(actual) >= Number(expected);
    case "lt":
      return Number(actual) < Number(expected);
    case "lte":
      return Number(actual) <= Number(expected);
    case "contains":
      return String(actual).toLowerCase().includes(String(expected).toLowerCase());
    case "in":
      return Array.isArray(expected)
        ? expected.map(String).includes(String(actual))
        : String(actual) === String(expected);
    case "nin":
      return Array.isArray(expected)
        ? !expected.map(String).includes(String(actual))
        : String(actual) !== String(expected);
    default:
      return false;
  }
}

export function groupValue(event: SecurityEvent, condition: RuleCondition): string {
  return String(resolveField(event, condition.groupBy ?? "eventType") ?? "");
}

export class DetectionEngine {
  private readonly states = new Map<string, RuleState>();
  private alertCounter = 0;
  private readonly rules: DetectionRule[];

  constructor(
    rules: DetectionRule[],
    private readonly options: DetectOptions,
    private readonly confidenceBase = 82
  ) {
    this.rules = rules.filter((rule) => rule.enabled);
  }

  get firedCount(): number {
    return this.alertCounter;
  }

  process(events: SecurityEvent[]): Alert[] {
    const alerts: Alert[] = [];
    for (const event of events) {
      const eventTime = new Date(event.timestamp).getTime();
      for (const rule of this.rules) {
        const state = this.states.get(rule.id) ?? {
          occurrences: [],
          fired: new Set<string>(),
        };
        this.states.set(rule.id, state);

        const thresholdCondition = rule.conditions.find(
          (condition) => condition.threshold !== undefined
        );

        if (
          !rule.conditions.every((condition) =>
            matchesCondition(event, condition)
          )
        ) {
          continue;
        }

        let triggerKey = "*";
        let evidenceIds: string[] = [event.id];

        if (thresholdCondition) {
          const group = groupValue(event, thresholdCondition);
          triggerKey = `${group}`;
          const windowMs = (thresholdCondition.timeWindowSeconds ?? 300) * 1000;
          state.occurrences = state.occurrences.filter(
            (entry) => eventTime - entry.timestamp <= windowMs
          );
          state.occurrences.push({
            timestamp: eventTime,
            group,
            eventId: event.id,
          });
          const matching = state.occurrences.filter(
            (entry) => entry.group === group
          );
          const threshold = thresholdCondition.threshold ?? 1;
          if (matching.length < threshold) continue;
          if (state.fired.has(triggerKey)) continue;
          evidenceIds = matching.slice(-6).map((entry) => entry.eventId);
        } else {
          if (state.fired.has(triggerKey)) continue;
        }

        state.fired.add(triggerKey);
        const duplicate = alerts.some(
          (alert) =>
            alert.ruleId === rule.id
        );
        if (duplicate) continue;

        this.alertCounter += 1;
        const confidence = Math.min(
          99,
          this.confidenceBase +
            (rule.severity === "critical" ? 12 : rule.severity === "high" ? 7 : 2)
        );
        alerts.push({
          id: `alert-sim-${this.options.runId}-${this.alertCounter}`,
          title: `${rule.name} — ${this.options.scenarioTitle}`,
          severity: rule.severity as Severity,
          status: "new",
          confidence,
          ruleId: rule.id,
          firstSeen: event.timestamp,
          lastSeen: event.timestamp,
          relatedEventIds: [...new Set(evidenceIds)],
          relatedAssetIds: [
            ...new Set(
              [event.sourceHostId, event.destinationHostId].filter(
                (value): value is string => Boolean(value)
              )
            ),
          ],
          relatedEntityIds: [
            ...new Set(
              [event.userId, event.sourceIp, event.destinationIp].filter(
                (value): value is string => Boolean(value)
              )
            ),
          ],
          incidentId: null,
          assignedTo: null,
          acknowledgedAt: null,
          resolvedAt: null,
          resolution: null,
          notes: [],
          scenarioId: this.options.scenarioId,
        });
      }
    }
    return alerts;
  }
}
