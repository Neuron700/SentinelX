import type { Incident, TimelineEntry, Finding, PlaybookProgress } from "@/domain/models/incident";
import type { Alert } from "@/domain/models/alert";
import type { SecurityEvent } from "@/domain/models/event";
import type { IncidentStatus, Severity } from "@/domain/models/common";
import { addMinutes } from "date-fns";
import { ANALYSTS } from "./world";

interface IncidentDefinition {
  key: string;
  id: string;
  title: string;
  description: string;
  severity: Severity;
  status: IncidentStatus;
  assignedTo: string;
  alertIds: string[];
  assetIds: string[];
  playbookId: string;
  completedStepIds: string[];
  findings: Omit<Finding, "createdAt">[];
  falsePositive?: boolean;
  closedReason?: string;
  resolutionSummary?: string;
  analystNotes: { content: string; minutesAfter: number; author: string }[];
}

const DEFINITIONS: IncidentDefinition[] = [
  {
    key: "inc-credential",
    id: "INC-2026-014",
    title: "Credential stuffing and suspicious VPN session for a.dewi",
    description:
      "External address 198.51.100.23 produced a burst of authentication failures across two accounts, followed by a successful VPN session for a.dewi and an impossible-travel indicator.",
    severity: "high",
    status: "investigating",
    assignedTo: ANALYSTS[1],
    alertIds: ["alert-0001", "alert-0002", "alert-0003", "alert-0009"],
    assetIds: ["asset-vpn-01", "asset-user-a-dewi", "asset-user-b-santoso", "asset-ws-fin-014"],
    playbookId: "playbook-credential",
    completedStepIds: ["cred-1", "cred-2", "cred-3", "cred-4"],
    findings: [
      {
        id: "find-cred-1",
        title: "Coordinated credential burst from a single external address",
        description:
          "12 failed VPN authentications for a.dewi and b.santoso from 198.51.100.23 within 8 minutes. Failure pattern is consistent with password spraying.",
        severity: "high",
        evidenceIds: ["alert-0001", "alert-0002"],
        author: ANALYSTS[1],
      },
      {
        id: "find-cred-2",
        title: "Successful session for a.dewi after the burst",
        description:
          "A VPN session was established for a.dewi from the same external address nine minutes after the failures. OTP was satisfied, indicating possible credential reuse or MFA fatigue.",
        severity: "high",
        evidenceIds: ["alert-0003", "alert-0009"],
        author: ANALYSTS[1],
      },
    ],
    analystNotes: [
      {
        author: ANALYSTS[1],
        content:
          "Correlated the credential burst with the impossible-travel alert. Scope currently limited to the VPN entry point and a.dewi. Checking whether the session touched ws-fin-014.",
        minutesAfter: 60,
      },
      {
        author: ANALYSTS[1],
        content:
          "Workspace is simulated only. No real VPN session exists; containment steps will update local state and the timeline.",
        minutesAfter: 95,
      },
    ],
  },
  {
    key: "inc-endpoint",
    id: "INC-2026-013",
    title: "Encoded PowerShell and synthetic malware on ws-fin-014",
    description:
      "Encoded PowerShell execution on ws-fin-014 was followed by finance share access, anomalous DNS queries, and a synthetic malware quarantine event.",
    severity: "critical",
    status: "contained",
    assignedTo: ANALYSTS[1],
    alertIds: ["alert-0004", "alert-0005", "alert-0011"],
    assetIds: ["asset-ws-fin-014", "asset-fs-01", "asset-user-a-dewi"],
    playbookId: "playbook-malware",
    completedStepIds: ["mal-1", "mal-2", "mal-3", "mal-4", "mal-5", "mal-6"],
    findings: [
      {
        id: "find-end-1",
        title: "Encoded PowerShell launched by a.dewi",
        description:
          "powershell.exe was launched with -nop -w hidden -enc on ws-fin-014. The encoded payload is synthetic and has not been executed outside the simulation.",
        severity: "high",
        evidenceIds: ["alert-0004"],
        author: ANALYSTS[1],
      },
      {
        id: "find-end-2",
        title: "Synthetic malware sample quarantined",
        description:
          "Win.Test.EICAR-SIM was flagged and quarantined by the synthetic endpoint agent. The sample is a known non-malicious test artifact.",
        severity: "critical",
        evidenceIds: ["alert-0005"],
        author: ANALYSTS[1],
      },
      {
        id: "find-end-3",
        title: "Unapproved privilege elevation attempt",
        description:
          "An elevation attempt using a simulated token manipulation technique followed the encoded PowerShell execution.",
        severity: "high",
        evidenceIds: ["alert-0011"],
        author: ANALYSTS[1],
      },
    ],
    analystNotes: [
      {
        author: ANALYSTS[1],
        content:
          "Host marked simulated-isolated in the workspace. Finance share access reviewed; only quarterly-close.xlsx was read.",
        minutesAfter: 70,
      },
    ],
  },
  {
    key: "inc-exfil",
    id: "INC-2026-011",
    title: "Large outbound transfer from the ERP integration",
    description:
      "The svc-backup service account moved 180 MB from erp-app to an external synthetic address outside the scheduled integration window.",
    severity: "high",
    status: "resolved",
    assignedTo: ANALYSTS[2],
    alertIds: ["alert-0006"],
    assetIds: ["asset-app-erp", "asset-backup-01", "asset-user-svc-backup"],
    playbookId: "playbook-exfil",
    completedStepIds: ["exf-1", "exf-2", "exf-3", "exf-4", "exf-5", "exf-6", "exf-7", "exf-8"],
    findings: [
      {
        id: "find-exf-1",
        title: "Transfer exceeded the integration baseline by 17x",
        description:
          "The nightly ERP integration transfers about 10 MB. This transfer moved 180 MB to 203.0.113.77 at an unscheduled time.",
        severity: "critical",
        evidenceIds: ["alert-0006"],
        author: ANALYSTS[2],
      },
      {
        id: "find-exf-2",
        title: "Destination matches a demo threat indicator",
        description:
          "203.0.113.77 is present in the synthetic threat intelligence dataset as a suspicious external endpoint.",
        severity: "high",
        evidenceIds: ["alert-0006"],
        author: ANALYSTS[2],
      },
    ],
    resolutionSummary:
      "Simulated outbound integration suspension applied. Service account credentials rotated in the simulation. No real systems involved.",
    analystNotes: [
      {
        author: ANALYSTS[2],
        content:
          "Playbook completed through simulated containment. Report exported for the case file.",
        minutesAfter: 260,
      },
    ],
  },
  {
    key: "inc-jump",
    id: "INC-2026-009",
    title: "Repeated RDP failures on jump-01",
    description:
      "Nine failed RDP sign-ins for b.santoso on jump-01 from the documented infrastructure test range. Determined to be authorized maintenance activity.",
    severity: "medium",
    status: "closed",
    assignedTo: ANALYSTS[0],
    alertIds: ["alert-0007"],
    assetIds: ["asset-jump-01", "asset-user-b-santoso"],
    playbookId: "playbook-triage",
    completedStepIds: ["tri-1", "tri-2", "tri-3", "tri-4", "tri-5", "tri-6"],
    findings: [
      {
        id: "find-jump-1",
        title: "Source address belongs to a documented test range",
        description:
          "192.0.2.45 is reserved for documentation and the infrastructure team's synthetic maintenance tests. Failure pattern aligns with the scheduled window.",
        severity: "info",
        evidenceIds: ["alert-0007"],
        author: ANALYSTS[0],
      },
    ],
    closedReason:
      "Authorized maintenance activity confirmed with the infrastructure team. No compromise.",
    resolutionSummary:
      "Closed before investigation. Alert dismissed as a false positive with documented justification.",
    analystNotes: [
      {
        author: ANALYSTS[0],
        content:
          "Confirmed with infrastructure: test range in use during the maintenance window. Closing the case.",
        minutesAfter: 150,
      },
    ],
  },
];

function buildTimeline(
  def: IncidentDefinition,
  linkedAlerts: Alert[],
  linkedEvents: SecurityEvent[],
  createdAt: string
): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  const push = (
    timestamp: string,
    type: TimelineEntry["type"],
    title: string,
    description: string,
    entityId: string,
    entityType: TimelineEntry["entityType"],
    actor?: string
  ) => {
    entries.push({
      id: "",
      timestamp,
      type,
      title,
      description,
      entityId,
      entityType,
      actor,
    });
  };

  push(
    createdAt,
    "action",
    "Incident created",
    `Incident opened by ${def.assignedTo} from correlated alert review.`,
    def.key,
    "incident",
    def.assignedTo
  );

  for (const alert of linkedAlerts) {
    push(
      alert.firstSeen,
      "alert",
      `Alert: ${alert.title}`,
      `Rule ${alert.ruleId} fired with ${alert.confidence}% confidence.`,
      alert.id,
      "alert"
    );
  }

  for (const event of linkedEvents) {
    push(
      event.timestamp,
      "event",
      event.eventType.replaceAll("_", " "),
      event.description,
      event.id,
      "event"
    );
  }

  for (const note of def.analystNotes) {
    push(
      addMinutes(new Date(createdAt), note.minutesAfter).toISOString(),
      "note",
      "Analyst note",
      note.content,
      def.key,
      "incident",
      note.author
    );
  }

  push(
    addMinutes(new Date(createdAt), 300).toISOString(),
    "status_change",
    `Status set to ${def.status}`,
    def.status === "closed"
      ? (def.closedReason ?? "Incident closed.")
      : `Investigation status updated to ${def.status}.`,
    def.key,
    "incident",
    def.assignedTo
  );

  return entries
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .map((entry, idx) => ({
      ...entry,
      id: `${def.key}-tl-${String(idx + 1).padStart(2, "0")}`,
    }));
}

export function buildSeedIncidents(
  events: SecurityEvent[],
  alerts: Alert[]
): { incidents: Incident[]; alertIncidentMap: Map<string, string> } {
  const eventById = new Map(events.map((e) => [e.id, e]));
  const alertById = new Map(alerts.map((a) => [a.id, a]));
  const incidents: Incident[] = [];
  const alertIncidentMap = new Map<string, string>();

  for (const def of DEFINITIONS) {
    const linkedAlerts = def.alertIds
      .map((id) => alertById.get(id))
      .filter((a): a is Alert => !!a)
      .sort((a, b) => a.firstSeen.localeCompare(b.firstSeen));

    const eventIdSet = new Set<string>();
    for (const alert of linkedAlerts) {
      for (const eventId of alert.relatedEventIds) eventIdSet.add(eventId);
    }
    const linkedEvents = [...eventIdSet]
      .map((id) => eventById.get(id))
      .filter((e): e is SecurityEvent => !!e)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    const firstAlert = linkedAlerts[0];
    const createdAt = firstAlert
      ? addMinutes(new Date(firstAlert.firstSeen), -15).toISOString()
      : new Date().toISOString();

    const timeline = buildTimeline(def, linkedAlerts, linkedEvents, createdAt);

    const findings: Finding[] = def.findings.map((f, idx) => ({
      ...f,
      createdAt: addMinutes(
        new Date(createdAt),
        60 + idx * 25
      ).toISOString(),
    }));

    const playbookProgress: PlaybookProgress[] = def.completedStepIds.map(
      (stepId, idx) => ({
        stepId,
        completed: true,
        completedAt: addMinutes(new Date(createdAt), 30 + idx * 15).toISOString(),
        completedBy: def.assignedTo,
        notes:
          idx === 0
            ? "Validated against the detection rule and raw events."
            : "",
      })
    );

    const lastTime = linkedAlerts.reduce(
      (latest, a) => (a.lastSeen > latest ? a.lastSeen : latest),
      createdAt
    );

    incidents.push({
      id: def.id,
      title: def.title,
      description: def.description,
      severity: def.severity,
      status: def.status,
      createdAt,
      updatedAt: addMinutes(new Date(lastTime), 30).toISOString(),
      assignedTo: def.assignedTo,
      alertIds: def.alertIds,
      eventIds: linkedEvents.map((e) => e.id),
      assetIds: def.assetIds,
      timeline,
      findings,
      playbookId: def.playbookId,
      playbookProgress,
      falsePositive: def.falsePositive ?? false,
      closedReason: def.closedReason ?? null,
      resolutionSummary: def.resolutionSummary ?? null,
    });

    for (const alertId of def.alertIds) {
      alertIncidentMap.set(alertId, def.key);
    }
  }

  return { incidents, alertIncidentMap };
}
