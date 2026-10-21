"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import type { Incident, Finding, TimelineEntry } from "@/domain/models/incident";
import type { IncidentStatus, Severity } from "@/domain/models/common";
import { canTransitionIncident } from "@/domain/models/incident";
import { getRepositories } from "@/data/repositories";
import { useSettingsStore } from "@/store/settings-store";
import { recordAudit } from "@/lib/audit";

export interface CreateIncidentInput {
  title: string;
  description: string;
  severity: Severity;
}

export function useIncidentActions() {
  const analyst = useSettingsStore((s) => s.analystName);

  const createIncident = useCallback(
    async (input: CreateIncidentInput): Promise<Incident | null> => {
      try {
        const { incidents } = getRepositories();
        const all = await incidents.getAll();
        const year = new Date().getFullYear();
        const numbers = all
          .map((incident) => {
            const match = incident.id.match(/INC-\d{4}-(\d+)/);
            return match ? Number(match[1]) : 0;
          })
          .filter((value) => Number.isFinite(value));
        const id = `INC-${year}-${String(Math.max(0, ...numbers) + 1).padStart(3, "0")}`;
        const now = new Date().toISOString();
        const incident: Incident = {
          id,
          title: input.title.trim(),
          description: input.description.trim(),
          severity: input.severity,
          status: "open",
          createdAt: now,
          updatedAt: now,
          assignedTo: analyst,
          alertIds: [],
          eventIds: [],
          assetIds: [],
          timeline: [
            {
              id: `tl-${Date.now()}`,
              timestamp: now,
              type: "action",
              title: "Incident created",
              description: `Manually opened by ${analyst}.`,
              entityId: id,
              entityType: "incident",
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
        await recordAudit({
          action: "incident.created",
          entityType: "incident",
          entityId: id,
          entityLabel: incident.title,
          details: { source: "manual", severity: incident.severity },
        });
        toast.success("Incident created", { description: id });
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

  const transition = useCallback(
    async (
      incident: Incident,
      nextStatus: IncidentStatus,
      options?: { resolutionSummary?: string; closedReason?: string }
    ): Promise<Incident | null> => {
      if (!canTransitionIncident(incident.status, nextStatus)) {
        toast.error("That transition is not allowed", {
          description: `${incident.status} cannot move directly to ${nextStatus}.`,
        });
        return null;
      }
      if (nextStatus === "resolved" && !options?.resolutionSummary?.trim()) {
        toast.error("Resolution summary required");
        return null;
      }
      if (nextStatus === "closed" && !options?.closedReason?.trim()) {
        toast.error("Closure reason required");
        return null;
      }
      try {
        const { incidents } = getRepositories();
        const now = new Date().toISOString();
        const entry: TimelineEntry = {
          id: `tl-${Date.now()}`,
          timestamp: now,
          type: "status_change",
          title: `Status changed to ${nextStatus}`,
          description:
            options?.resolutionSummary ??
            options?.closedReason ??
            `${incident.status} → ${nextStatus}`,
          entityId: incident.id,
          entityType: "incident",
          actor: analyst,
        };
        const updated = await incidents.update(incident.id, {
          status: nextStatus,
          updatedAt: now,
          timeline: [...incident.timeline, entry],
          resolutionSummary:
            options?.resolutionSummary ?? incident.resolutionSummary,
          closedReason: options?.closedReason ?? incident.closedReason,
        });
        await recordAudit({
          action: `incident.${nextStatus}`,
          entityType: "incident",
          entityId: incident.id,
          entityLabel: incident.title,
          details: { from: incident.status, to: nextStatus },
        });
        toast.success(`Incident ${nextStatus}`);
        return updated;
      } catch (error) {
        toast.error("Could not update incident", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
        return null;
      }
    },
    [analyst]
  );

  const assignToMe = useCallback(
    async (incident: Incident) => {
      try {
        const { incidents } = getRepositories();
        const updated = await incidents.update(incident.id, {
          assignedTo: analyst,
          updatedAt: new Date().toISOString(),
        });
        await recordAudit({
          action: "incident.assigned",
          entityType: "incident",
          entityId: incident.id,
          entityLabel: incident.title,
          details: { assignedTo: analyst },
        });
        toast.success("Assigned to you");
        return updated;
      } catch {
        toast.error("Could not assign incident");
        return null;
      }
    },
    [analyst]
  );

  const addNote = useCallback(
    async (incident: Incident, content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return null;
      try {
        const { incidents } = getRepositories();
        const entry: TimelineEntry = {
          id: `tl-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: "note",
          title: "Analyst note",
          description: trimmed,
          entityId: incident.id,
          entityType: "incident",
          actor: analyst,
        };
        const updated = await incidents.addTimelineEntry(incident.id, entry);
        await recordAudit({
          action: "incident.note_added",
          entityType: "incident",
          entityId: incident.id,
          entityLabel: incident.title,
          details: { entryId: entry.id },
        });
        toast.success("Timeline note added");
        return updated;
      } catch {
        toast.error("Could not add note");
        return null;
      }
    },
    [analyst]
  );

  const addFinding = useCallback(
    async (
      incident: Incident,
      input: {
        title: string;
        description: string;
        severity: Severity;
        evidenceIds: string[];
      }
    ) => {
      try {
        const { incidents } = getRepositories();
        const finding: Finding = {
          id: `find-${Date.now()}`,
          title: input.title.trim(),
          description: input.description.trim(),
          severity: input.severity,
          evidenceIds: input.evidenceIds,
          createdAt: new Date().toISOString(),
          author: analyst,
        };
        const updated = await incidents.addFinding(incident.id, finding);
        const entry: TimelineEntry = {
          id: `tl-${Date.now()}-f`,
          timestamp: finding.createdAt,
          type: "note",
          title: `Finding recorded: ${finding.title}`,
          description: finding.description,
          entityId: finding.id,
          entityType: "incident",
          actor: analyst,
        };
        await incidents.addTimelineEntry(incident.id, entry);
        await recordAudit({
          action: "incident.finding_added",
          entityType: "incident",
          entityId: incident.id,
          entityLabel: incident.title,
          details: { findingId: finding.id, severity: finding.severity },
        });
        toast.success("Finding recorded");
        return updated;
      } catch {
        toast.error("Could not record finding");
        return null;
      }
    },
    [analyst]
  );

  const setPlaybook = useCallback(
    async (incident: Incident, playbookId: string | null) => {
      try {
        const { incidents } = getRepositories();
        const updated = await incidents.update(incident.id, {
          playbookId,
          playbookProgress: [],
          updatedAt: new Date().toISOString(),
        });
        await recordAudit({
          action: "incident.playbook_selected",
          entityType: "incident",
          entityId: incident.id,
          entityLabel: incident.title,
          details: { playbookId },
        });
        toast.success(playbookId ? "Playbook attached" : "Playbook detached");
        return updated;
      } catch {
        toast.error("Could not update playbook");
        return null;
      }
    },
    []
  );

  const toggleStep = useCallback(
    async (incident: Incident, stepId: string, completed: boolean) => {
      try {
        const { incidents } = getRepositories();
        const now = new Date().toISOString();
        const updated = await incidents.updatePlaybookProgress(incident.id, {
          stepId,
          completed,
          completedAt: completed ? now : null,
          completedBy: completed ? analyst : null,
          notes: "",
        });
        await recordAudit({
          action: completed
            ? "incident.playbook_step_completed"
            : "incident.playbook_step_reopened",
          entityType: "incident",
          entityId: incident.id,
          entityLabel: incident.title,
          details: { stepId },
        });
        return updated;
      } catch {
        toast.error("Could not update playbook step");
        return null;
      }
    },
    [analyst]
  );

  return {
    createIncident,
    transition,
    assignToMe,
    addNote,
    addFinding,
    setPlaybook,
    toggleStep,
  };
}
