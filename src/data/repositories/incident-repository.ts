import type { SentinelXDatabase } from "@/lib/storage/db";
import { BaseRepository } from "./base-repository";
import { schemas } from "@/domain/validation/schemas";
import type { Incident, TimelineEntry, Finding, PlaybookProgress } from "@/domain/models/incident";
import type { IncidentStatus } from "@/domain/models/common";

export class IncidentRepository extends BaseRepository<Incident> {
  constructor(db: SentinelXDatabase) {
    super(db.incidents, "incident", schemas.incident);
  }

  async getByStatus(status: IncidentStatus): Promise<Incident[]> {
    const rows = await this.table.where("status").equals(status).toArray();
    return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getByAssignedTo(userId: string): Promise<Incident[]> {
    return this.table.where("assignedTo").equals(userId).toArray();
  }

  async getActive(): Promise<Incident[]> {
    const all = await this.getAll();
    return all
      .filter(
        (i) =>
          i.status === "open" ||
          i.status === "investigating" ||
          i.status === "contained"
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async addTimelineEntry(
    incidentId: string,
    entry: TimelineEntry
  ): Promise<Incident> {
    const incident = await this.getById(incidentId);
    if (!incident) throw new Error(`Incident ${incidentId} not found`);
    return this.update(incidentId, {
      timeline: [...incident.timeline, entry],
      updatedAt: new Date().toISOString(),
    });
  }

  async addFinding(incidentId: string, finding: Finding): Promise<Incident> {
    const incident = await this.getById(incidentId);
    if (!incident) throw new Error(`Incident ${incidentId} not found`);
    return this.update(incidentId, {
      findings: [...incident.findings, finding],
      updatedAt: new Date().toISOString(),
    });
  }

  async updatePlaybookProgress(
    incidentId: string,
    progress: PlaybookProgress
  ): Promise<Incident> {
    const incident = await this.getById(incidentId);
    if (!incident) throw new Error(`Incident ${incidentId} not found`);
    const existing = incident.playbookProgress.filter(
      (p) => p.stepId !== progress.stepId
    );
    return this.update(incidentId, {
      playbookProgress: [...existing, progress],
      updatedAt: new Date().toISOString(),
    });
  }

  async linkAlert(incidentId: string, alertId: string): Promise<Incident> {
    const incident = await this.getById(incidentId);
    if (!incident) throw new Error(`Incident ${incidentId} not found`);
    if (incident.alertIds.includes(alertId)) return incident;
    return this.update(incidentId, {
      alertIds: [...incident.alertIds, alertId],
      updatedAt: new Date().toISOString(),
    });
  }

  async linkEvent(incidentId: string, eventId: string): Promise<Incident> {
    const incident = await this.getById(incidentId);
    if (!incident) throw new Error(`Incident ${incidentId} not found`);
    if (incident.eventIds.includes(eventId)) return incident;
    return this.update(incidentId, {
      eventIds: [...incident.eventIds, eventId],
      updatedAt: new Date().toISOString(),
    });
  }

  async linkAsset(incidentId: string, assetId: string): Promise<Incident> {
    const incident = await this.getById(incidentId);
    if (!incident) throw new Error(`Incident ${incidentId} not found`);
    if (incident.assetIds.includes(assetId)) return incident;
    return this.update(incidentId, {
      assetIds: [...incident.assetIds, assetId],
      updatedAt: new Date().toISOString(),
    });
  }

  async countByStatus(): Promise<Record<IncidentStatus, number>> {
    const all = await this.getAll();
    const counts: Record<IncidentStatus, number> = {
      open: 0,
      investigating: 0,
      contained: 0,
      resolved: 0,
      closed: 0,
    };
    for (const i of all) counts[i.status]++;
    return counts;
  }
}
