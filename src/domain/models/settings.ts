export type ThemeMode = "dark" | "light" | "system";
export type TableDensity = "compact" | "normal" | "comfortable";

export interface AppSettings {
  theme: ThemeMode;
  tableDensity: TableDensity;
  simulationSpeed: number;
  notificationsEnabled: boolean;
  defaultTimeRange: "1h" | "6h" | "24h" | "7d" | "30d";
  analystName: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  tableDensity: "normal",
  simulationSpeed: 1,
  notificationsEnabled: true,
  defaultTimeRange: "7d",
  analystName: "demo-analyst",
};
