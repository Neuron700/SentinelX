import type { IncidentStatus, Severity, TimelineType } from "./common";

export interface TimelineEntry {
  id: string;
  timestamp: string;
  type: TimelineType;
  title: string;
  description: string;
  entityId: string;
  entityType: "event" | "alert" | "incident" | "asset" | "playbook";
  actor?: string;
  metadata?: Record<string, unknown>;
}

export interface Finding {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  evidenceIds: string[];
  createdAt: string;
  author: string;
}

export interface PlaybookProgress {
  stepId: string;
  completed: boolean;
  completedAt: string | null;
  completedBy: string | null;
  notes: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  status: IncidentStatus;
  createdAt: string;
  updatedAt: string;
  assignedTo: string | null;
  alertIds: string[];
  eventIds: string[];
  assetIds: string[];
  timeline: TimelineEntry[];
  findings: Finding[];
  playbookId: string | null;
  playbookProgress: PlaybookProgress[];
  falsePositive: boolean;
  closedReason: string | null;
  resolutionSummary: string | null;
}

export const INCIDENT_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  open: ["investigating", "closed"],
  investigating: ["contained", "resolved", "closed"],
  contained: ["resolved", "investigating"],
  resolved: ["closed", "investigating"],
  closed: [],
};

export function canTransitionIncident(
  from: IncidentStatus,
  to: IncidentStatus
): boolean {
  return INCIDENT_TRANSITIONS[from].includes(to);
}
