export interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  entityType:
    | "event"
    | "alert"
    | "incident"
    | "asset"
    | "rule"
    | "indicator"
    | "playbook"
    | "scenario"
    | "settings"
    | "report"
    | "system";
  entityId: string;
  entityLabel: string;
  details: Record<string, unknown>;
  userId: string;
}
