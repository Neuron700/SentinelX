import type { SentinelXDatabase } from "@/lib/storage/db";
import { BaseRepository } from "./base-repository";
import { schemas } from "@/domain/validation/schemas";
import type { AuditEntry } from "@/domain/models/audit";

export type AuditInput = Omit<AuditEntry, "id" | "timestamp">;

export class AuditRepository extends BaseRepository<AuditEntry> {
  constructor(db: SentinelXDatabase) {
    super(db.auditLog, "audit entry", schemas.audit);
  }

  async log(input: AuditInput): Promise<AuditEntry> {
    const entry: AuditEntry = {
      ...input,
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
    };
    return this.create(entry);
  }

  async getRecent(limit = 100): Promise<AuditEntry[]> {
    const all = await this.getAll();
    return all
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, limit);
  }

  async getForEntity(
    entityType: AuditEntry["entityType"],
    entityId: string
  ): Promise<AuditEntry[]> {
    const all = await this.getAll();
    return all
      .filter((a) => a.entityType === entityType && a.entityId === entityId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }
}
