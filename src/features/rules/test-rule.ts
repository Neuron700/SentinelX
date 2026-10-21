import type { DetectionRule } from "@/domain/models/rule";
import type { SecurityEvent } from "@/domain/models/event";
import {
  groupValue,
  matchesCondition,
  resolveField,
} from "@/simulation/detection";

export interface RuleTestResult {
  matchedEvents: number;
  groupsTriggered: number;
  sampleEventIds: string[];
  explanation: string;
}

export function testRuleAgainstEvents(
  rule: DetectionRule,
  events: SecurityEvent[]
): RuleTestResult {
  const sorted = [...events].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp)
  );
  const threshold = rule.conditions.find(
    (condition) => condition.threshold !== undefined
  );
  const baseMatches = sorted.filter((event) =>
    rule.conditions.every((condition) => matchesCondition(event, condition))
  );

  if (!threshold) {
    return {
      matchedEvents: baseMatches.length,
      groupsTriggered: baseMatches.length,
      sampleEventIds: baseMatches.slice(-5).map((event) => event.id),
      explanation: `${baseMatches.length} events satisfy all pattern conditions in the current dataset.`,
    };
  }

  const windowMs = (threshold.timeWindowSeconds ?? 300) * 1000;
  const thresholdCount = threshold.threshold ?? 1;
  const groups = new Map<string, number>();
  const fired = new Set<string>();
  const sampleIds: string[] = [];

  for (const event of baseMatches) {
    const group = groupValue(event, threshold);
    const time = new Date(event.timestamp).getTime();
    const key = `${group}|${Math.floor(time / windowMs)}`;
    const count = (groups.get(key) ?? 0) + 1;
    groups.set(key, count);
    if (count === thresholdCount) {
      fired.add(group);
      sampleIds.push(event.id);
    }
  }

  return {
    matchedEvents: baseMatches.length,
    groupsTriggered: fired.size,
    sampleEventIds: sampleIds.slice(0, 5),
    explanation: `${baseMatches.length} matching events; ${thresholdCount} per ${Math.round(
      windowMs / 1000
    )}s grouped by ${threshold.groupBy ?? "eventType"} would trigger for ${fired.size} group${fired.size === 1 ? "" : "s"}.`,
  };
}

export function describeCondition(
  field: string,
  operator: string,
  value: unknown
): string {
  const readableField = field.replaceAll("details.", "").replaceAll(".", " › ");
  const readableOperator: Record<string, string> = {
    eq: "is",
    neq: "is not",
    gt: ">",
    gte: "≥",
    lt: "<",
    lte: "≤",
    contains: "contains",
    in: "is one of",
    nin: "is not one of",
  };
  const readableValue = Array.isArray(value)
    ? value.join(", ")
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);
  return `${readableField} ${readableOperator[operator] ?? operator} ${readableValue}`;
}

export function ruleFieldValueLabel(
  rule: DetectionRule,
  events: SecurityEvent[]
): string {
  const fields = new Set<string>();
  for (const condition of rule.conditions) {
    const sample = events.find((event) =>
      matchesCondition(event, condition)
    );
    if (sample) {
      const value = resolveField(sample, condition.field);
      if (value != null) fields.add(String(value));
    }
  }
  return [...fields].slice(0, 3).join(", ");
}
