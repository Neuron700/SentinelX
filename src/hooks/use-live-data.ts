"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDB } from "@/lib/storage/db";
import type {
  SecurityEvent,
  Alert,
  Incident,
  Asset,
  DetectionRule,
  ThreatIndicator,
  Playbook,
  Scenario,
  AuditEntry,
} from "@/domain/models";
import type { ScenarioResultRow } from "@/lib/storage/db";

function safeQuery<T>(fn: () => Promise<T>, fallback: T) {
  return async () => {
    if (typeof window === "undefined") return fallback;
    try {
      return await fn();
    } catch {
      return fallback;
    }
  };
}

export function useLiveEvents(): SecurityEvent[] {
  return (
    useLiveQuery(safeQuery(() => getDB().events.toArray(), []), [], [] as SecurityEvent[]) ??
    []
  );
}

export function useLiveAlerts(): Alert[] {
  return (
    useLiveQuery(safeQuery(() => getDB().alerts.toArray(), []), [], [] as Alert[]) ??
    []
  );
}

export function useLiveIncidents(): Incident[] {
  return (
    useLiveQuery(safeQuery(() => getDB().incidents.toArray(), []), [], [] as Incident[]) ??
    []
  );
}

export function useLiveAssets(): Asset[] {
  return (
    useLiveQuery(safeQuery(() => getDB().assets.toArray(), []), [], [] as Asset[]) ??
    []
  );
}

export function useLiveRules(): DetectionRule[] {
  return (
    useLiveQuery(
      safeQuery(() => getDB().detectionRules.toArray(), []),
      [],
      [] as DetectionRule[]
    ) ?? []
  );
}

export function useLiveIndicators(): ThreatIndicator[] {
  return (
    useLiveQuery(
      safeQuery(() => getDB().indicators.toArray(), []),
      [],
      [] as ThreatIndicator[]
    ) ?? []
  );
}

export function useLivePlaybooks(): Playbook[] {
  return (
    useLiveQuery(safeQuery(() => getDB().playbooks.toArray(), []), [], [] as Playbook[]) ??
    []
  );
}

export function useLiveScenarios(): Scenario[] {
  return (
    useLiveQuery(safeQuery(() => getDB().scenarios.toArray(), []), [], [] as Scenario[]) ??
    []
  );
}

export function useLiveAudit(): AuditEntry[] {
  return (
    useLiveQuery(
      safeQuery(async () => {
        const all = await getDB().auditLog.toArray();
        return all.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      }, []),
      [],
      [] as AuditEntry[]
    ) ?? []
  );
}

export function useLiveScenarioResults(): ScenarioResultRow[] {
  return (
    useLiveQuery(
      safeQuery(() => getDB().scenarioResults.toArray(), []),
      [],
      [] as ScenarioResultRow[]
    ) ?? []
  );
}
