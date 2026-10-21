import type { SentinelXDatabase } from "@/lib/storage/db";
import { BaseRepository } from "./base-repository";
import { schemas } from "@/domain/validation/schemas";
import type { Alert } from "@/domain/models/alert";
import type { AlertStatus, Severity, TimeRange } from "@/domain/models/common";

export class AlertRepository extends BaseRepository<Alert> {
  constructor(db: SentinelXDatabase) {
    super(db.alerts, "alert", schemas.alert);
  }

  async getByStatus(status: AlertStatus): Promise<Alert[]> {
    const rows = await this.table.where("status").equals(status).toArray();
    return rows.sort((a, b) => b.firstSeen.localeCompare(a.firstSeen));
  }

  async getByRule(ruleId: string): Promise<Alert[]> {
    return this.table.where("ruleId").equals(ruleId).toArray();
  }

  async getUnassigned(): Promise<Alert[]> {
    const all = await this.getAll();
    return all
      .filter((a) => !a.assignedTo && a.status !== "resolved" && a.status !== "dismissed")
      .sort((a, b) => b.firstSeen.localeCompare(a.firstSeen));
  }

  async getOpen(): Promise<Alert[]> {
    const all = await this.getAll();
    return all
      .filter((a) => a.status === "new" || a.status === "in_review" || a.status === "escalated")
      .sort((a, b) => b.firstSeen.localeCompare(a.firstSeen));
  }

  async getOpenCriticalCount(): Promise<number> {
    const open = await this.getOpen();
    return open.filter((a) => a.severity === "critical").length;
  }

  async countByStatus(): Promise<Record<AlertStatus, number>> {
    const all = await this.getAll();
    const counts: Record<AlertStatus, number> = {
      new: 0,
      in_review: 0,
      escalated: 0,
      resolved: 0,
      dismissed: 0,
    };
    for (const a of all) counts[a.status]++;
    return counts;
  }

  async countBySeverity(range?: TimeRange): Promise<Record<Severity, number>> {
    const all = await this.getAll();
    const scoped = range
      ? all.filter(
          (a) =>
            a.firstSeen >= range.from && a.firstSeen <= range.to
        )
      : all;
    const counts: Record<Severity, number> = {
      info: 0,
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };
    for (const a of scoped) counts[a.severity]++;
    return counts;
  }

  async getForTimeline(range: TimeRange): Promise<Alert[]> {
    const all = await this.getAll();
    return all.filter((a) => a.firstSeen >= range.from && a.firstSeen <= range.to);
  }

  async linkToIncident(alertId: string, incidentId: string): Promise<void> {
    await this.update(alertId, { incidentId });
  }

  async unlinkFromIncident(alertId: string): Promise<void> {
    await this.update(alertId, { incidentId: null });
  }

  async getByIncident(incidentId: string): Promise<Alert[]> {
    const rows = await this.table.where("incidentId").equals(incidentId).toArray();
    return rows.sort((a, b) => b.firstSeen.localeCompare(a.firstSeen));
  }

  async appendNote(
    alertId: string,
    note: { id: string; author: string; timestamp: string; content: string }
  ): Promise<Alert> {
    const alert = await this.getById(alertId);
    if (!alert) throw new Error(`Alert ${alertId} not found`);
    return this.update(alertId, { notes: [...alert.notes, note] });
  }
}
