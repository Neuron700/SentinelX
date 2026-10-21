import Dexie, { type Table } from "dexie";
import type {
  SecurityEvent,
  Alert,
  Incident,
  Asset,
  DetectionRule,
  Scenario,
  AuditEntry,
  ThreatIndicator,
  Playbook,
} from "@/domain/models";

export interface SettingRow {
  key: string;
  value: unknown;
}

export interface ScenarioResultRow {
  id: string;
  scenarioId: string;
  completedAt: string;
  eventsGenerated: number;
  alertsGenerated: number;
  durationSeconds: number;
  checkedCriteria: number[];
  notes: string;
}

export interface MetaRow {
  key: string;
  value: unknown;
}

export class SentinelXDatabase extends Dexie {
  events!: Table<SecurityEvent, string>;
  alerts!: Table<Alert, string>;
  incidents!: Table<Incident, string>;
  assets!: Table<Asset, string>;
  detectionRules!: Table<DetectionRule, string>;
  scenarios!: Table<Scenario, string>;
  auditLog!: Table<AuditEntry, string>;
  settings!: Table<SettingRow, string>;
  indicators!: Table<ThreatIndicator, string>;
  playbooks!: Table<Playbook, string>;
  scenarioResults!: Table<ScenarioResultRow, string>;
  meta!: Table<MetaRow, string>;

  constructor(name = "SentinelXDB") {
    super(name);
    this.version(1).stores({
      events:
        "id, timestamp, eventType, severity, sourceHostId, destinationHostId, userId, scenarioId, [severity+timestamp]",
      alerts:
        "id, title, severity, status, ruleId, incidentId, firstSeen, scenarioId, [status+severity]",
      incidents:
        "id, title, severity, status, assignedTo, createdAt, updatedAt, [status+updatedAt]",
      assets: "id, name, type, environment, riskScore, [type+environment]",
      detectionRules: "id, name, enabled, severity, detectionType",
      scenarios: "id, title, difficulty",
      auditLog:
        "id, timestamp, action, entityType, entityId, [entityType+entityId]",
      settings: "key",
      indicators: "id, type, value, riskRating",
      playbooks: "id, name",
      scenarioResults: "id, scenarioId, completedAt",
      meta: "key",
    });
  }
}

let dbInstance: SentinelXDatabase | null = null;

export function getDB(): SentinelXDatabase {
  if (typeof window === "undefined") {
    throw new Error("SentinelXDatabase is browser-only (IndexedDB)");
  }
  if (!dbInstance) {
    dbInstance = new SentinelXDatabase();
  }
  return dbInstance;
}
