"use client";

import { create } from "zustand";
import type { TimeRange } from "@/domain/models/common";
import { presetRange } from "@/lib/time/time";

interface TimeRangeState {
  range: TimeRange;
  setPreset: (preset: Exclude<TimeRange["preset"], "custom">) => void;
  setCustom: (from: Date, to: Date) => void;
  setRange: (range: TimeRange) => void;
  refresh: () => void;
}

const initial = presetRange("7d");

export const useTimeRangeStore = create<TimeRangeState>((set, get) => ({
  range: initial,
  setPreset: (preset) => set({ range: presetRange(preset) }),
  setCustom: (from, to) =>
    set({
      range: {
        from: from.toISOString(),
        to: to.toISOString(),
        preset: "custom",
      },
    }),
  setRange: (range) => set({ range }),
  refresh: () => {
    const current = get().range;
    if (current.preset === "custom") {
      set({ range: { ...current, to: new Date().toISOString() } });
    } else {
      set({ range: presetRange(current.preset) });
    }
  },
}));
