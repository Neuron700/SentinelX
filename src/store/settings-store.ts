"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_SETTINGS, type AppSettings, type TableDensity, type ThemeMode } from "@/domain/models/settings";

interface SettingsState extends AppSettings {
  setTheme: (theme: ThemeMode) => void;
  setDensity: (density: TableDensity) => void;
  setSimulationSpeed: (speed: number) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setDefaultTimeRange: (range: AppSettings["defaultTimeRange"]) => void;
  setAnalystName: (name: string) => void;
  resetToDefaults: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setTheme: (theme) => set({ theme }),
      setDensity: (tableDensity) => set({ tableDensity }),
      setSimulationSpeed: (simulationSpeed) => set({ simulationSpeed }),
      setNotificationsEnabled: (notificationsEnabled) =>
        set({ notificationsEnabled }),
      setDefaultTimeRange: (defaultTimeRange) => set({ defaultTimeRange }),
      setAnalystName: (analystName) => set({ analystName }),
      resetToDefaults: () => set({ ...DEFAULT_SETTINGS }),
    }),
    { name: "sentinelx-settings" }
  )
);

export function applyTheme(theme: ThemeMode): void {
  if (typeof document === "undefined") return;
  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const dark = theme === "dark" || (theme === "system" && prefersDark);
  document.documentElement.classList.toggle("light", !dark);
  document.documentElement.classList.toggle("dark", dark);
}
