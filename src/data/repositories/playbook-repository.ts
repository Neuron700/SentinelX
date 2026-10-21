import type { SentinelXDatabase } from "@/lib/storage/db";
import { BaseRepository } from "./base-repository";
import type { Playbook } from "@/domain/models/playbook";
import { z } from "zod";

const playbookSchema: z.ZodType<Playbook> = z.custom<Playbook>(
  (v) =>
    typeof v === "object" &&
    v !== null &&
    typeof (v as Playbook).id === "string" &&
    Array.isArray((v as Playbook).steps),
  { message: "Invalid playbook definition" }
);

export class PlaybookRepository extends BaseRepository<Playbook> {
  constructor(db: SentinelXDatabase) {
    super(db.playbooks, "playbook", playbookSchema);
  }

  async getByName(name: string): Promise<Playbook | null> {
    const all = await this.getAll();
    return all.find((p) => p.name === name) ?? null;
  }
}
