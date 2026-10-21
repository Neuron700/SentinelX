import type { SentinelXDatabase } from "@/lib/storage/db";
import { DEFAULT_SETTINGS, type AppSettings } from "@/domain/models/settings";

export class SettingsRepository {
  constructor(private readonly db: SentinelXDatabase) {}

  async get<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
    const row = await this.db.settings.get(key as string);
    return (row?.value as AppSettings[K]) ?? DEFAULT_SETTINGS[key];
  }

  async getAll(): Promise<AppSettings> {
    const rows = await this.db.settings.toArray();
    const merged = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      if (row.key in merged) {
        (merged as Record<string, unknown>)[row.key] = row.value;
      }
    }
    return merged;
  }

  async set<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ): Promise<void> {
    await this.db.settings.put({ key: key as string, value });
  }

  async setMany(settings: Partial<AppSettings>): Promise<void> {
    const rows = Object.entries(settings).map(([key, value]) => ({
      key,
      value,
    }));
    await this.db.settings.bulkPut(rows);
  }

  async reset(): Promise<void> {
    await this.db.settings.clear();
    await this.setMany(DEFAULT_SETTINGS);
  }
}
