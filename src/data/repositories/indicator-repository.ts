import type { SentinelXDatabase } from "@/lib/storage/db";
import { BaseRepository } from "./base-repository";
import { schemas } from "@/domain/validation/schemas";
import type { ThreatIndicator, IndicatorType } from "@/domain/models/indicator";

export class IndicatorRepository extends BaseRepository<ThreatIndicator> {
  constructor(db: SentinelXDatabase) {
    super(db.indicators, "indicator", schemas.indicator);
  }

  async getByType(type: IndicatorType): Promise<ThreatIndicator[]> {
    return this.table.where("type").equals(type).toArray();
  }

  async search(query: string): Promise<ThreatIndicator[]> {
    const q = query.trim().toLowerCase();
    const all = await this.getAll();
    if (!q) return all.sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
    return all
      .filter(
        (i) =>
          i.value.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.source.toLowerCase().includes(q) ||
          i.type.includes(q)
      )
      .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
  }

  async findByValue(value: string): Promise<ThreatIndicator | null> {
    const rows = await this.table.where("value").equals(value).toArray();
    return rows[0] ?? null;
  }
}
