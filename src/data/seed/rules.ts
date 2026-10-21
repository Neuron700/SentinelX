import type { DetectionRule } from "@/domain/models/rule";

export const SEED_RULES: DetectionRule[] = [
  {
    id: "rule-brute-force",
    name: "Authentication Failure Burst",
    description:
      "Fires when 8 or more authentication failures occur from the same source IP within 10 minutes.",
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
        threshold: 8,
      },
    ],
    logSources: ["vpn-gw-01", "corp-dc-01", "jump-01"],
    origin: "demo",
    lastFiredAt: null,
    alertCount: 0,
  },
  {
    id: "rule-suspicious-login",
    name: "Sign-in From Untrusted External Address",
    description:
      "Successful authentication from a synthetic high-risk external IP address.",
    severity: "high",
    enabled: true,
    detectionType: "pattern",
    conditions: [
      { field: "eventType", operator: "eq", value: "authentication_success" },
      {
        field: "sourceIp",
        operator: "in",
        value: ["198.51.100.23", "203.0.113.77", "192.0.2.45"],
      },
    ],
    logSources: ["vpn-gw-01", "corp-dc-01"],
    origin: "demo",
    lastFiredAt: null,
    alertCount: 0,
  },
  {
    id: "rule-impossible-travel",
    name: "Impossible Travel Indicator (Demo)",
    description:
      "Successful sign-in from an external address shortly after an internal sign-in for the same account.",
    severity: "high",
    enabled: true,
    detectionType: "correlation",
    conditions: [
      {
        field: "eventType",
        operator: "eq",
        value: "authentication_success",
        timeWindowSeconds: 1800,
        groupBy: "userId",
        threshold: 2,
      },
      {
        field: "sourceIp",
        operator: "in",
        value: ["198.51.100.23"],
      },
    ],
    logSources: ["vpn-gw-01", "corp-dc-01"],
    origin: "demo",
    lastFiredAt: null,
    alertCount: 0,
  },
  {
    id: "rule-suspicious-process",
    name: "Suspicious Process Execution",
    description:
      "Fires when encoded PowerShell or a download utility is launched on an endpoint.",
    severity: "high",
    enabled: true,
    detectionType: "pattern",
    conditions: [
      { field: "eventType", operator: "eq", value: "process_creation" },
      {
        field: "details.processName",
        operator: "in",
        value: ["powershell-encoded", "certutil-download", "wmic-remote"],
      },
    ],
    logSources: ["endpoint-telemetry"],
    origin: "demo",
    lastFiredAt: null,
    alertCount: 0,
  },
  {
    id: "rule-data-exfil",
    name: "Large Outbound Data Transfer",
    description:
      "Fires when a single transfer greater than 100 MB leaves the environment in any direction.",
    severity: "critical",
    enabled: true,
    detectionType: "threshold",
    conditions: [
      {
        field: "eventType",
        operator: "eq",
        value: "data_transfer",
        timeWindowSeconds: 3600,
        groupBy: "userId",
        threshold: 1,
      },
      { field: "details.bytesOut", operator: "gt", value: 104857600 },
    ],
    logSources: ["erp-app", "backup-01", "network-flow"],
    origin: "demo",
    lastFiredAt: null,
    alertCount: 0,
  },
  {
    id: "rule-malware-detected",
    name: "Synthetic Malware Signature",
    description:
      "Fires on any endpoint telemetry event flagged as synthetic malware detection.",
    severity: "critical",
    enabled: true,
    detectionType: "pattern",
    conditions: [
      { field: "eventType", operator: "eq", value: "malware_detected" },
    ],
    logSources: ["endpoint-telemetry"],
    origin: "demo",
    lastFiredAt: null,
    alertCount: 0,
  },
  {
    id: "rule-port-scan",
    name: "Simulated Port Sweep",
    description:
      "Fires when 20 or more connection attempts from one source occur within 5 minutes.",
    severity: "medium",
    enabled: true,
    detectionType: "threshold",
    conditions: [
      {
        field: "eventType",
        operator: "eq",
        value: "network_connection",
        timeWindowSeconds: 300,
        groupBy: "sourceIp",
        threshold: 20,
      },
    ],
    logSources: ["network-flow"],
    origin: "demo",
    lastFiredAt: null,
    alertCount: 0,
  },
  {
    id: "rule-privilege-escalation",
    name: "Suspicious Privilege Elevation",
    description:
      "Fires when an elevation event is marked suspicious by endpoint telemetry.",
    severity: "high",
    enabled: true,
    detectionType: "pattern",
    conditions: [
      { field: "eventType", operator: "eq", value: "privilege_escalation" },
      { field: "details.suspicious", operator: "eq", value: "true" },
    ],
    logSources: ["endpoint-telemetry", "corp-dc-01"],
    origin: "demo",
    lastFiredAt: null,
    alertCount: 0,
  },
  {
    id: "rule-after-hours",
    name: "After-Hours Finance Access",
    description:
      "Fires on file access to the finance share outside 08:00–18:00 by non-finance accounts.",
    severity: "medium",
    enabled: true,
    detectionType: "anomaly",
    conditions: [
      { field: "eventType", operator: "eq", value: "file_access" },
      { field: "details.afterHours", operator: "eq", value: "true" },
      { field: "details.segment", operator: "eq", value: "finance" },
    ],
    logSources: ["corp-fs-01"],
    origin: "demo",
    lastFiredAt: null,
    alertCount: 0,
  },
  {
    id: "rule-dns-tunneling",
    name: "DNS Beaconing Pattern",
    description:
      "Fires when 40 or more DNS queries to the same domain are observed within one hour.",
    severity: "medium",
    enabled: true,
    detectionType: "correlation",
    conditions: [
      {
        field: "eventType",
        operator: "eq",
        value: "dns_query",
        timeWindowSeconds: 3600,
        groupBy: "details.domain",
        threshold: 40,
      },
    ],
    logSources: ["corp-dc-01"],
    origin: "demo",
    lastFiredAt: null,
    alertCount: 0,
  },
];

export const RULE_BY_ID = new Map(SEED_RULES.map((r) => [r.id, r]));
