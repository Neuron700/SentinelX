"use client";

import { create } from "zustand";
import type { RunningScenario } from "@/domain/models/scenario";

interface SimulationState {
  running: RunningScenario | null;
  lastCompleted: RunningScenario | null;
  setRunning: (running: RunningScenario | null) => void;
  patchRunning: (patch: Partial<RunningScenario>) => void;
  clear: () => void;
}

export const useSimulationStore = create<SimulationState>()((set) => ({
  running: null,
  lastCompleted: null,
  setRunning: (running) =>
    set((state) => ({
      running,
      lastCompleted:
        running?.status === "completed" ? running : state.lastCompleted,
    })),
  patchRunning: (patch) =>
    set((state) =>
      state.running
        ? { running: { ...state.running, ...patch } }
        : { running: null }
    ),
  clear: () => set({ running: null }),
}));
