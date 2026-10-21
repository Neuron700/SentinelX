import type { Table } from "dexie";
import type { ZodType } from "zod";
import { validate } from "@/domain/validation/schemas";

export interface QueryOptions<T> {
  filter?: (item: T) => boolean;
  sortBy?: keyof T;
  direction?: "asc" | "desc";
  offset?: number;
  limit?: number;
}

function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

export abstract class BaseRepository<T extends { id: string }> {
  protected constructor(
    protected readonly table: Table<T, string>,
    private readonly entityName: string,
    private readonly schema: ZodType<T>
  ) {}

  async getAll(): Promise<T[]> {
    return this.table.toArray();
  }

  async count(): Promise<number> {
    return this.table.count();
  }

  async getById(id: string): Promise<T | null> {
    const row = await this.table.get(id);
    return row ?? null;
  }

  async create(entity: T): Promise<T> {
    const valid = validate(this.schema, this.entityName, entity);
    await this.table.add(valid);
    return valid;
  }

  async bulkCreate(entities: T[]): Promise<void> {
    const valid = entities.map((e) =>
      validate(this.schema, this.entityName, e)
    );
    await this.table.bulkPut(valid);
  }

  async update(id: string, changes: Partial<T>): Promise<T> {
    const existing = await this.table.get(id);
    if (!existing) {
      throw new Error(`${this.entityName} ${id} not found`);
    }
    const merged = { ...existing, ...changes, id } as T;
    const valid = validate(this.schema, this.entityName, merged);
    await this.table.put(valid);
    return valid;
  }

  async delete(id: string): Promise<void> {
    await this.table.delete(id);
  }

  async clear(): Promise<void> {
    await this.table.clear();
  }

  async query(options: QueryOptions<T> = {}): Promise<T[]> {
    let items = await this.table.toArray();
    if (options.filter) items = items.filter(options.filter);
    if (options.sortBy) {
      const key = options.sortBy;
      const dir = options.direction === "desc" ? -1 : 1;
      items = items.sort((a, b) => compareValues(a[key], b[key]) * dir);
    }
    const offset = options.offset ?? 0;
    if (offset > 0 || options.limit !== undefined) {
      items = items.slice(offset, options.limit ? offset + options.limit : undefined);
    }
    return items;
  }
}
