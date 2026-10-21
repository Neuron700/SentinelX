export const SEVERITIES = ["info", "low", "medium", "high", "critical"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const SEVERITY_RANK: Record<Severity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export const ALERT_STATUSES = [
  "new",
  "in_review",
  "escalated",
  "resolved",
  "dismissed",
] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];

export const INCIDENT_STATUSES = [
  "open",
  "investigating",
  "contained",
  "resolved",
  "closed",
] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const ASSET_TYPES = [
  "workstation",
  "server",
  "application",
  "user_account",
  "gateway",
  "endpoint",
] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const EVENT_TYPES = [
  "authentication_success",
  "authentication_failure",
  "network_connection",
  "process_creation",
  "file_access",
  "dns_query",
  "privilege_escalation",
  "data_transfer",
  "configuration_change",
  "malware_detected",
  "port_scan_simulated",
  "system_alert",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const RULE_TYPES = [
  "threshold",
  "pattern",
  "anomaly",
  "correlation",
] as const;
export type RuleType = (typeof RULE_TYPES)[number];

export const TIMELINE_TYPES = [
  "event",
  "alert",
  "action",
  "note",
  "status_change",
] as const;
export type TimelineType = (typeof TIMELINE_TYPES)[number];

export const DIRECTORIES = [
  "north",
  "south",
  "east",
  "west",
] as const;

export type SortDirection = "asc" | "desc";

export interface TimeRange {
  /** ISO timestamp, inclusive */
  from: string;
  /** ISO timestamp, inclusive */
  to: string;
  /** preset label for display */
  preset:
    | "1h"
    | "6h"
    | "24h"
    | "7d"
    | "30d"
    | "custom";
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface TimeSeriesPoint {
  timestamp: string;
  label: string;
  count: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export const TIME_RANGE_PRESETS: { value: TimeRange["preset"]; label: string; hours: number }[] = [
  { value: "1h", label: "Last 1 hour", hours: 1 },
  { value: "6h", label: "Last 6 hours", hours: 6 },
  { value: "24h", label: "Last 24 hours", hours: 24 },
  { value: "7d", label: "Last 7 days", hours: 24 * 7 },
  { value: "30d", label: "Last 30 days", hours: 24 * 30 },
];
