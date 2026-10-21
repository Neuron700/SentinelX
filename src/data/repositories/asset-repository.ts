import type { SentinelXDatabase } from "@/lib/storage/db";
import { BaseRepository } from "./base-repository";
import { schemas } from "@/domain/validation/schemas";
import type { Asset } from "@/domain/models/asset";
import type { AssetType } from "@/domain/models/common";

export class AssetRepository extends BaseRepository<Asset> {
  constructor(db: SentinelXDatabase) {
    super(db.assets, "asset", schemas.asset);
  }

  async getByType(type: AssetType): Promise<Asset[]> {
    return this.table.where("type").equals(type).toArray();
  }

  async getByEnvironment(environment: string): Promise<Asset[]> {
    return this.table.where("environment").equals(environment).toArray();
  }

  async getHighRisk(minScore = 60): Promise<Asset[]> {
    const all = await this.getAll();
    return all
      .filter((a) => a.riskScore >= minScore)
      .sort((a, b) => b.riskScore - a.riskScore);
  }

  async getByIds(ids: string[]): Promise<Asset[]> {
    if (ids.length === 0) return [];
    return this.table.bulkGet(ids).then((rows) =>
      rows.filter((r): r is Asset => !!r)
    );
  }

  async distinctEnvironments(): Promise<string[]> {
    const all = await this.getAll();
    return [...new Set(all.map((a) => a.environment))].sort();
  }
}
