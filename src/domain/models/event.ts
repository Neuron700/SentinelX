import type { Severity } from "./common";

export interface SecurityEvent {
  id: string;
  timestamp: string;
  eventType: string;
  severity: Severity;
  sourceHostId: string | null;
  destinationHostId: string | null;
  sourceIp: string | null;
  destinationIp: string | null;
  userId: string | null;
  description: string;
  relatedAlertIds: string[];
  scenarioId: string | null;
  /** Structured, synthetic telemetry used by detection rules and the event drawer. */
  details?: Record<string, unknown>;
}

export interface EventFilters {
  search: string;
  severities: Severity[];
  eventTypes: string[];
  hostId: string | null;
  userId: string | null;
  scenarioId: string | null;
  minSeverity: Severity | null;
}
