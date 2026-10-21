import type { SentinelXDatabase } from "@/lib/storage/db";
import { BaseRepository } from "./base-repository";
import { schemas } from "@/domain/validation/schemas";
import type { DetectionRule } from "@/domain/models/rule";

export class RuleRepository extends BaseRepository<DetectionRule> {
  constructor(db: SentinelXDatabase) {
    super(db.detectionRules, "rule", schemas.rule);
  }

  async getEnabled(): Promise<DetectionRule[]> {
    return this.table.where("enabled").equals(1 as unknown as number).toArray();
  }

  async getEnabledRules(): Promise<DetectionRule[]> {
    const all = await this.getAll();
    return all.filter((r) => r.enabled);
  }

  async setEnabled(id: string, enabled: boolean): Promise<DetectionRule> {
    return this.update(id, { enabled });
  }

  async registerFiring(id: string, at: string): Promise<DetectionRule> {
    const rule = await this.getById(id);
    if (!rule) throw new Error(`Rule ${id} not found`);
    return this.update(id, {
      lastFiredAt: at,
      alertCount: rule.alertCount + 1,
    });
  }
}
