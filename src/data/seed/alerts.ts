import type { Alert, AlertNote } from "@/domain/models/alert";
import type { AlertStatus, Severity } from "@/domain/models/common";
import type { SecurityEvent } from "@/domain/models/event";
import { addMinutes } from "date-fns";
import { EXTERNAL_IPS, ANALYSTS } from "./world";

interface AlertDefinition {
  id: string;
  title: string;
  severity: Severity;
  status: AlertStatus;
  confidence: number;
  ruleId: string;
  cluster: string;
  eventFilter?: (e: SecurityEvent) => boolean;
  assetIds: string[];
  entityIds: string[];
  incidentKey?: string;
  assignedTo: string | null;
  acknowledgedMinutes?: number;
  resolvedMinutes?: number;
  resolution?: string;
  notes?: { author: string; content: string; minutesAfter: number }[];
}

const DEFINITIONS: AlertDefinition[] = [
  {
    id: "alert-0001",
    title: "Authentication failure burst against a.dewi from 198.51.100.23",
    severity: "high",
    status: "new",
    confidence: 88,
    ruleId: "rule-brute-force",
    cluster: "credential-stuffing",
    eventFilter: (e) =>
      e.eventType === "authentication_failure" && e.userId === "a.dewi",
    assetIds: ["asset-vpn-01", "asset-user-a-dewi"],
    entityIds: ["198.51.100.23", "a.dewi", "vpn-gw-01"],
    incidentKey: "inc-credential",
    assignedTo: null,
  },
  {
    id: "alert-0002",
    title: "Authentication failure burst against b.santoso from 198.51.100.23",
    severity: "high",
    status: "new",
    confidence: 84,
    ruleId: "rule-brute-force",
    cluster: "credential-stuffing",
    eventFilter: (e) =>
      e.eventType === "authentication_failure" && e.userId === "b.santoso",
    assetIds: ["asset-vpn-01", "asset-user-b-santoso"],
    entityIds: ["198.51.100.23", "b.santoso", "vpn-gw-01"],
    incidentKey: "inc-credential",
    assignedTo: null,
  },
  {
    id: "alert-0003",
    title: "VPN sign-in succeeded for a.dewi after repeated failures",
    severity: "high",
    status: "in_review",
    confidence: 91,
    ruleId: "rule-suspicious-login",
    cluster: "credential-stuffing",
    eventFilter: (e) => e.eventType === "authentication_success",
    assetIds: ["asset-vpn-01", "asset-user-a-dewi", "asset-ws-fin-014"],
    entityIds: ["198.51.100.23", "a.dewi", "vpn-gw-01"],
    incidentKey: "inc-credential",
    assignedTo: ANALYSTS[0],
    acknowledgedMinutes: 14,
    notes: [
      {
        author: ANALYSTS[0],
        content:
          "Successful VPN session from the same external address that produced the failure burst. OTP was satisfied — possible credential reuse. Escalating to investigation.",
        minutesAfter: 22,
      },
    ],
  },
  {
    id: "alert-0004",
    title: "Encoded PowerShell execution on ws-fin-014",
    severity: "high",
    status: "escalated",
    confidence: 93,
    ruleId: "rule-suspicious-process",
    cluster: "encoded-powershell",
    eventFilter: (e) => e.eventType === "process_creation",
    assetIds: ["asset-ws-fin-014", "asset-user-a-dewi"],
    entityIds: ["a.dewi", "ws-fin-014"],
    incidentKey: "inc-endpoint",
    assignedTo: ANALYSTS[1],
    acknowledgedMinutes: 8,
    notes: [
      {
        author: ANALYSTS[1],
        content:
          "Command line uses -nop -w hidden -enc. Correlated with a subsequent file read on the finance share. Treating as active endpoint compromise.",
        minutesAfter: 16,
      },
    ],
  },
  {
    id: "alert-0005",
    title: "Synthetic malware signature detected on ws-fin-014",
    severity: "critical",
    status: "resolved",
    confidence: 97,
    ruleId: "rule-malware-detected",
    cluster: "encoded-powershell",
    eventFilter: (e) => e.eventType === "malware_detected",
    assetIds: ["asset-ws-fin-014"],
    entityIds: ["ws-fin-014", "Win.Test.EICAR-SIM"],
    incidentKey: "inc-endpoint",
    assignedTo: ANALYSTS[1],
    acknowledgedMinutes: 5,
    resolvedMinutes: 95,
    resolution:
      "Synthetic sample quarantined. Host marked simulated-isolated; no real system was affected.",
    notes: [
      {
        author: ANALYSTS[1],
        content:
          "Signature Win.Test.EICAR-SIM is intentionally synthetic. Quarantine confirmed in the local telemetry.",
        minutesAfter: 30,
      },
    ],
  },
  {
    id: "alert-0006",
    title: "180 MB outbound transfer from erp-app to 203.0.113.77",
    severity: "critical",
    status: "resolved",
    confidence: 95,
    ruleId: "rule-data-exfil",
    cluster: "data-exfil",
    eventFilter: (e) => e.eventType === "data_transfer",
    assetIds: ["asset-app-erp", "asset-user-svc-backup", "asset-backup-01"],
    entityIds: ["svc-backup", "erp-app", "203.0.113.77"],
    incidentKey: "inc-exfil",
    assignedTo: ANALYSTS[2],
    acknowledgedMinutes: 18,
    resolvedMinutes: 240,
    resolution:
      "Simulated integration suspension applied in the local workspace. Destination indicator added to demo intelligence.",
    notes: [
      {
        author: ANALYSTS[2],
        content:
          "Transfer occurred outside the nightly backup window and exceeded the integration baseline by 17x.",
        minutesAfter: 45,
      },
    ],
  },
  {
    id: "alert-0007",
    title: "Repeated RDP failures for b.santoso on jump-01",
    severity: "medium",
    status: "dismissed",
    confidence: 62,
    ruleId: "rule-brute-force",
    cluster: "jump-failures",
    assetIds: ["asset-jump-01", "asset-user-b-santoso"],
    entityIds: ["192.0.2.45", "b.santoso", "jump-01"],
    incidentKey: "inc-jump",
    assignedTo: ANALYSTS[0],
    acknowledgedMinutes: 25,
    resolvedMinutes: 130,
    resolution:
      "False positive: verified authorized maintenance activity from the infrastructure team test range.",
    notes: [
      {
        author: ANALYSTS[0],
        content:
          "Source 192.0.2.45 is the documented infrastructure test range. Maintenance window confirmed with the team.",
        minutesAfter: 40,
      },
    ],
  },
  {
    id: "alert-0008",
    title: "Simulated port sweep against web-01 from 203.0.113.77",
    severity: "medium",
    status: "resolved",
    confidence: 80,
    ruleId: "rule-port-scan",
    cluster: "port-scan",
    assetIds: ["asset-web-01"],
    entityIds: ["203.0.113.77", "web-01"],
    assignedTo: ANALYSTS[2],
    acknowledgedMinutes: 20,
    resolvedMinutes: 120,
    resolution:
      "All simulated connections were blocked at the edge. No exposure confirmed.",
    notes: [
      {
        author: ANALYSTS[2],
        content: "24 distinct ports touched within 5 minutes. Edge firewall blocked the sweep.",
        minutesAfter: 30,
      },
    ],
  },
  {
    id: "alert-0009",
    title: "Impossible travel indicator for a.dewi",
    severity: "high",
    status: "escalated",
    confidence: 86,
    ruleId: "rule-impossible-travel",
    cluster: "impossible-travel",
    assetIds: ["asset-user-a-dewi", "asset-vpn-01", "asset-ws-fin-014"],
    entityIds: ["a.dewi", "198.51.100.23", "10.10.4.14"],
    incidentKey: "inc-credential",
    assignedTo: ANALYSTS[1],
    acknowledgedMinutes: 9,
    notes: [
      {
        author: ANALYSTS[1],
        content:
          "Internal SSO session at 10.10.4.14 followed by an external VPN session from 198.51.100.23 within 5 minutes. Correlated with the credential burst.",
        minutesAfter: 20,
      },
    ],
  },
  {
    id: "alert-0010",
    title: "After-hours finance share access by d.maya",
    severity: "medium",
    status: "new",
    confidence: 71,
    ruleId: "rule-after-hours",
    cluster: "after-hours",
    assetIds: ["asset-ws-hr-007", "asset-fs-01", "asset-user-d-maya"],
    entityIds: ["d.maya", "corp-fs-01", "payroll-march.xlsx"],
    assignedTo: null,
  },
  {
    id: "alert-0011",
    title: "Suspicious privilege elevation on ws-fin-014",
    severity: "high",
    status: "new",
    confidence: 82,
    ruleId: "rule-privilege-escalation",
    cluster: "encoded-powershell",
    eventFilter: (e) => e.eventType === "privilege_escalation",
    assetIds: ["asset-ws-fin-014", "asset-user-a-dewi"],
    entityIds: ["a.dewi", "ws-fin-014"],
    incidentKey: "inc-endpoint",
    assignedTo: null,
  },
  {
    id: "alert-0012",
    title: "DNS beaconing from ws-eng-022 to cdn-storage.example",
    severity: "medium",
    status: "in_review",
    confidence: 74,
    ruleId: "rule-dns-tunneling",
    cluster: "dns-tunneling",
    assetIds: ["asset-ws-eng-022", "asset-user-c-rahman"],
    entityIds: ["c.rahman", "ws-eng-022", "cdn-storage.example"],
    assignedTo: ANALYSTS[2],
    acknowledgedMinutes: 35,
    notes: [
      {
        author: ANALYSTS[2],
        content:
          "42 sequential subdomain lookups in under an hour. Pattern is consistent with synthetic beaconing.",
        minutesAfter: 50,
      },
    ],
  },
  {
    id: "alert-0013",
    title: "certutil download activity on ws-eng-022",
    severity: "high",
    status: "new",
    confidence: 78,
    ruleId: "rule-suspicious-process",
    cluster: "certutil-eng",
    eventFilter: (e) => e.eventType === "process_creation",
    assetIds: ["asset-ws-eng-022", "asset-user-c-rahman"],
    entityIds: ["c.rahman", "ws-eng-022", "192.0.2.45"],
    assignedTo: null,
  },
  {
    id: "alert-0014",
    title: "Encoded PowerShell execution on ws-eng-031",
    severity: "high",
    status: "resolved",
    confidence: 85,
    ruleId: "rule-suspicious-process",
    cluster: "powershell-eng",
    assetIds: ["asset-ws-eng-031", "asset-user-c-rahman"],
    entityIds: ["c.rahman", "ws-eng-031"],
    assignedTo: ANALYSTS[0],
    acknowledgedMinutes: 12,
    resolvedMinutes: 80,
    resolution:
      "Verified as an approved automation wrapper with a documented signing certificate. Closed as false positive.",
    notes: [
      {
        author: ANALYSTS[0],
        content:
          "Hash matched the internal automation allowlist. Recommend adding a rule exclusion for signed wrappers.",
        minutesAfter: 28,
      },
    ],
  },
  {
    id: "alert-0015",
    title: "Synthetic signature flagged by the mail scanner",
    severity: "low",
    status: "dismissed",
    confidence: 55,
    ruleId: "rule-malware-detected",
    cluster: "malware-mail",
    assetIds: ["asset-mail-01"],
    entityIds: ["mail-01", "Synthetic.Legit.Tool"],
    assignedTo: ANALYSTS[2],
    acknowledgedMinutes: 22,
    resolvedMinutes: 60,
    resolution:
      "False positive: Synthetic.Legit.Tool is an approved mail hygiene utility.",
    notes: [
      {
        author: ANALYSTS[2],
        content: "Confirmed with the messaging team — approved tooling.",
        minutesAfter: 35,
      },
    ],
  },
  {
    id: "alert-0016",
    title: "Simulated port sweep against mail-01 from 192.0.2.45",
    severity: "medium",
    status: "resolved",
    confidence: 77,
    ruleId: "rule-port-scan",
    cluster: "port-scan-mail",
    assetIds: ["asset-mail-01"],
    entityIds: ["192.0.2.45", "mail-01"],
    assignedTo: ANALYSTS[1],
    acknowledgedMinutes: 40,
    resolvedMinutes: 160,
    resolution:
      "Sweep blocked by the edge policy. No successful connections recorded.",
    notes: [
      {
        author: ANALYSTS[1],
        content: "21 blocked attempts; all classified as simulated reconnaissance.",
        minutesAfter: 55,
      },
    ],
  },
  {
    id: "alert-0017",
    title: "Suspicious 120 MB outbound transfer from backup-01",
    severity: "high",
    status: "new",
    confidence: 87,
    ruleId: "rule-data-exfil",
    cluster: "backup-exfil",
    assetIds: ["asset-backup-01", "asset-user-svc-backup"],
    entityIds: ["svc-backup", "backup-01", "198.51.100.23"],
    assignedTo: null,
  },
  {
    id: "alert-0018",
    title: "Fresh authentication burst for c.rahman from 198.51.100.23",
    severity: "high",
    status: "new",
    confidence: 83,
    ruleId: "rule-brute-force",
    cluster: "vpn-burst-2",
    assetIds: ["asset-vpn-01", "asset-user-c-rahman"],
    entityIds: ["198.51.100.23", "c.rahman", "vpn-gw-01"],
    assignedTo: null,
  },
];

export function buildSeedAlerts(
  events: SecurityEvent[],
  clusters: Record<string, string[]>
): { alerts: Alert[]; eventAlertLinks: Map<string, string[]> } {
  const eventById = new Map(events.map((e) => [e.id, e]));
  const eventAlertLinks = new Map<string, string[]>();
  const alerts: Alert[] = [];

  for (const def of DEFINITIONS) {
    const eventIds = (clusters[def.cluster] ?? []).filter((id) => {
      if (!def.eventFilter) return true;
      const event = eventById.get(id);
      return event ? def.eventFilter(event) : false;
    });
    const generated =
      def.id === "alert-0018"
        ? eventIds
        : eventIds.length > 0
          ? eventIds
          : (clusters[def.cluster] ?? []);

    const times = generated
      .map((id) => eventById.get(id)?.timestamp)
      .filter((t): t is string => !!t)
      .sort();

    const firstSeen = times[0] ?? new Date().toISOString();
    const lastSeen = times[times.length - 1] ?? firstSeen;
    const notes: AlertNote[] = (def.notes ?? []).map((n, idx) => ({
      id: `${def.id}-note-${idx + 1}`,
      author: n.author,
      timestamp: addMinutes(new Date(firstSeen), n.minutesAfter).toISOString(),
      content: n.content,
    }));

    const alert: Alert = {
      id: def.id,
      title: def.title,
      severity: def.severity,
      status: def.status,
      confidence: def.confidence,
      ruleId: def.ruleId,
      firstSeen,
      lastSeen,
      relatedEventIds: generated,
      relatedAssetIds: def.assetIds,
      relatedEntityIds: def.entityIds,
      incidentId: null,
      assignedTo: def.assignedTo,
      acknowledgedAt:
        def.acknowledgedMinutes !== undefined
          ? addMinutes(new Date(firstSeen), def.acknowledgedMinutes).toISOString()
          : null,
      resolvedAt:
        def.resolvedMinutes !== undefined
          ? addMinutes(new Date(lastSeen), def.resolvedMinutes).toISOString()
          : null,
      resolution: def.resolution ?? null,
      notes,
      scenarioId: null,
    };

    alerts.push(alert);
    for (const eventId of generated) {
      const list = eventAlertLinks.get(eventId) ?? [];
      list.push(def.id);
      eventAlertLinks.set(eventId, list);
    }
  }

  return { alerts, eventAlertLinks };
}

export const ALERT_INCIDENT_MAP: Record<string, string> = {
  "alert-0001": "inc-credential",
  "alert-0002": "inc-credential",
  "alert-0003": "inc-credential",
  "alert-0009": "inc-credential",
  "alert-0004": "inc-endpoint",
  "alert-0005": "inc-endpoint",
  "alert-0011": "inc-endpoint",
  "alert-0006": "inc-exfil",
  "alert-0007": "inc-jump",
};

export { EXTERNAL_IPS };
