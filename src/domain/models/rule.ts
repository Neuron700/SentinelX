import type { RuleType, Severity } from "./common";

export interface RuleCondition {
  field: string;
  operator:
    | "eq"
    | "neq"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "contains"
    | "in"
    | "nin";
  value: string | number | string[];
  /** seconds — for threshold / correlation rules */
  timeWindowSeconds?: number;
  groupBy?: string;
  threshold?: number;
}

export interface DetectionRule {
  id: string;
  name: string;
  description: string;
  severity: Severity;
  enabled: boolean;
  detectionType: RuleType;
  conditions: RuleCondition[];
  logSources: string[];
  origin: "demo" | "custom";
  lastFiredAt: string | null;
  alertCount: number;
}
