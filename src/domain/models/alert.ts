import type { AlertStatus, Severity } from "./common";

export interface AlertNote {
  id: string;
  author: string;
  timestamp: string;
  content: string;
}

export interface Alert {
  id: string;
  title: string;
  severity: Severity;
  status: AlertStatus;
  confidence: number;
  ruleId: string;
  firstSeen: string;
  lastSeen: string;
  relatedEventIds: string[];
  relatedAssetIds: string[];
  relatedEntityIds: string[];
  incidentId: string | null;
  assignedTo: string | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  resolution: string | null;
  notes: AlertNote[];
  scenarioId: string | null;
}

export const ALERT_TRANSITIONS: Record<
  AlertStatus,
  AlertStatus[]
> = {
  new: ["in_review", "dismissed"],
  in_review: ["escalated", "resolved", "dismissed"],
  escalated: ["resolved", "dismissed"],
  resolved: [],
  dismissed: [],
};

export const ALERT_ACTION_LABELS: Record<string, string> = {
  "new->in_review": "Acknowledge",
  "new->dismissed": "Dismiss as false positive",
  "in_review->escalated": "Escalate",
  "in_review->resolved": "Resolve",
  "in_review->dismissed": "Dismiss as false positive",
  "escalated->resolved": "Resolve",
  "escalated->dismissed": "Dismiss as false positive",
};

export function canTransitionAlert(from: AlertStatus, to: AlertStatus): boolean {
  return ALERT_TRANSITIONS[from].includes(to);
}
