import type { SentinelXDatabase, ScenarioResultRow } from "@/lib/storage/db";
import { BaseRepository } from "./base-repository";
import type { Scenario } from "@/domain/models/scenario";
import { z } from "zod";

const scenarioSchema: z.ZodType<Scenario> = z.custom<Scenario>(
  (v) =>
    typeof v === "object" &&
    v !== null &&
    typeof (v as Scenario).id === "string" &&
    typeof (v as Scenario).title === "string" &&
    Array.isArray((v as Scenario).phases),
  { message: "Invalid scenario definition" }
);

export class ScenarioRepository extends BaseRepository<Scenario> {
  private readonly results: SentinelXDatabase["scenarioResults"];

  constructor(db: SentinelXDatabase) {
    super(db.scenarios, "scenario", scenarioSchema);
    this.results = db.scenarioResults;
  }

  async getByDifficulty(
    difficulty: Scenario["difficulty"]
  ): Promise<Scenario[]> {
    return this.table.where("difficulty").equals(difficulty).toArray();
  }

  async saveResult(result: ScenarioResultRow): Promise<void> {
    await this.results.put(result);
  }

  async getResults(): Promise<ScenarioResultRow[]> {
    return this.results.toArray();
  }

  async getResultForScenario(
    scenarioId: string
  ): Promise<ScenarioResultRow | null> {
    const rows = await this.results
      .where("scenarioId")
      .equals(scenarioId)
      .toArray();
    return rows.sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0] ?? null;
  }

  async clearResults(): Promise<void> {
    await this.results.clear();
  }
}
