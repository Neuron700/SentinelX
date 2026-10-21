"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import type { Alert } from "@/domain/models/alert";
import type { AlertStatus } from "@/domain/models/common";
import type { Incident } from "@/domain/models/incident";
import { getRepositories } from "@/data/repositories";
import { useSettingsStore } from "@/store/settings-store";
import { recordAudit } from "@/lib/audit";
import { canTransitionAlert } from "@/domain/models/alert";

function nextIncidentId(incidents: Incident[]): string {
  const year = new Date().getFullYear();
  const numbers = incidents
    .map((incident) => {
      const match = incident.id.match(/INC-\d{4}-(\d+)/);
      return match ? Number(match[1]) : 0;
    })
    .filter((value) => Number.isFinite(value));
  const next = Math.max(0, ...numbers) + 1;
  return `INC-${year}-${String(next).padStart(3, "0")}`;
}

export function useAlertActions() {
  const analyst = useSettingsStore((s) => s.analystName);

  const transition = useCallback(
    async (
      alert: Alert,
      nextStatus: AlertStatus,
      options?: { resolution?: string }
    ) => {
      if (!canTransitionAlert(alert.status, nextStatus)) {
        toast.error("That transition is not allowed", {
          description: `${alert.status} cannot move directly to ${nextStatus}.`,
        });
        return null;
      }
      try {
        const { alerts } = getRepositories();
        const now = new Date().toISOString();
        const patch: Partial<Alert> = { status: nextStatus, lastSeen: alert.lastSeen };
        if (nextStatus === "in_review") {
          patch.acknowledgedAt = alert.acknowledgedAt ?? now;
          patch.assignedTo = alert.assignedTo ?? analyst;
        }
        if (nextStatus === "resolved") {
          patch.resolvedAt = now;
          patch.resolution =
            options?.resolution ?? "True positive — resolved by analyst";
        }
        if (nextStatus === "dismissed") {
          patch.resolvedAt = now;
          patch.resolution = options?.resolution ?? "False positive";
        }
        const updated = await alerts.update(alert.id, patch);
        const action =
          nextStatus === "in_review"
            ? "alert.acknowledged"
            : nextStatus === "escalated"
              ? "alert.escalated"
              : `alert.${nextStatus}`;
        await recordAudit({
          action,
          entityType: "alert",
          entityId: alert.id,
          entityLabel: alert.title,
          details: {
            from: alert.status,
            to: nextStatus,
            resolution: options?.resolution ?? null,
          },
        });
        toast.success(
          nextStatus === "in_review"
            ? "Alert acknowledged"
            : nextStatus === "escalated"
              ? "Alert escalated"
              : nextStatus === "resolved"
                ? "Alert resolved"
                : "Alert dismissed",
          { description: alert.title }
        );
        return updated;
      } catch (error) {
        toast.error("Could not update alert", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
        return null;
      }
    },
    [analyst]
  );

  const assignToMe = useCallback(
    async (alert: Alert) => {
      try {
        const { alerts } = getRepositories();
        const updated = await alerts.update(alert.id, { assignedTo: analyst });
        await recordAudit({
          action: "alert.assigned",
          entityType: "alert",
          entityId: alert.id,
          entityLabel: alert.title,
          details: { assignedTo: analyst },
        });
        toast.success("Assigned to you", { description: alert.title });
        return updated;
      } catch (error) {
        toast.error("Could not assign alert", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
        return null;
      }
    },
    [analyst]
  );

  const addNote = useCallback(
    async (alert: Alert, content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return null;
      try {
        const { alerts } = getRepositories();
        const updated = await alerts.appendNote(alert.id, {
          id: `note-${Date.now()}`,
          author: analyst,
          timestamp: new Date().toISOString(),
          content: trimmed,
        });
        await recordAudit({
          action: "alert.note_added",
          entityType: "alert",
          entityId: alert.id,
          entityLabel: alert.title,
          details: { noteId: updated.notes.at(-1)?.id ?? null },
        });
        toast.success("Note added");
        return updated;
      } catch (error) {
        toast.error("Could not add note", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
        return null;
      }
    },
    [analyst]
  );

  const promoteToIncident = useCallback(
    async (alert: Alert): Promise<Incident | null> => {
      try {
        const { alerts, incidents } = getRepositories();
        const existing = await incidents.getAll();
        const now = new Date().toISOString();
        const incident: Incident = {
          id: nextIncidentId(existing),
          title: alert.title,
          description: `Promoted from alert ${alert.id}. Detection rule ${alert.ruleId} fired with ${alert.confidence}% confidence.`,
          severity: alert.severity,
          status: "open",
          createdAt: now,
          updatedAt: now,
          assignedTo: analyst,
          alertIds: [alert.id],
          eventIds: [...alert.relatedEventIds],
          assetIds: [...alert.relatedAssetIds],
          timeline: [
            {
              id: `tl-${Date.now()}`,
              timestamp: now,
              type: "alert",
              title: "Incident created from alert",
              description: `${alert.title} (${alert.id})`,
              entityId: alert.id,
              entityType: "alert",
              actor: analyst,
            },
          ],
          findings: [],
          playbookId: null,
          playbookProgress: [],
          falsePositive: false,
          closedReason: null,
          resolutionSummary: null,
        };
        const created = await incidents.create(incident);
        await alerts.update(alert.id, {
          incidentId: created.id,
          status:
            alert.status === "new" || alert.status === "in_review"
              ? "escalated"
              : alert.status,
          assignedTo: alert.assignedTo ?? analyst,
        });
        await recordAudit({
          action: "incident.created",
          entityType: "incident",
          entityId: created.id,
          entityLabel: created.title,
          details: {
            source: "alert",
            alertId: alert.id,
            severity: created.severity,
          },
        });
        toast.success("Incident created", {
          description: `${created.id} linked to ${alert.id}.`,
        });
        return created;
      } catch (error) {
        toast.error("Could not create incident", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
        return null;
      }
    },
    [analyst]
  );

  return { transition, assignToMe, addNote, promoteToIncident };
}
