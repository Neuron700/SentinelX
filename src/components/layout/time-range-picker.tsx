"use client";

import { useState } from "react";
import { CalendarRange, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/dropdown";
import { Input, Label } from "@/components/ui/input";
import { TIME_RANGE_PRESETS } from "@/domain/models/common";
import { rangeLabel } from "@/lib/time/time";
import { useTimeRangeStore } from "@/store/time-range-store";
import { cn } from "@/lib/utils/cn";

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TimeRangePicker({ compact = false }: { compact?: boolean }) {
  const { range, setPreset, setCustom } = useTimeRangeStore();
  const [customFrom, setCustomFrom] = useState(toLocalInput(range.from));
  const [customTo, setCustomTo] = useState(toLocalInput(range.to));
  const [showCustom, setShowCustom] = useState(false);

  return (
    <Dropdown
      trigger={
        <Button
          variant="secondary"
          size={compact ? "sm" : "md"}
          className="gap-2 font-mono text-[11px]"
          aria-label="Select time range"
        >
          <CalendarRange />
          <span className="hidden sm:inline">{rangeLabel(range)}</span>
          <ChevronDown className="size-3 opacity-60" />
        </Button>
      }
      align="right"
      className="w-64"
    >
      <div className="space-y-0.5">
        {TIME_RANGE_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => {
              if (preset.value !== "custom") {
                setPreset(preset.value);
              }
              setShowCustom(false);
            }}
            className={cn(
              "flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-[var(--surface-2)]",
              range.preset === preset.value
                ? "text-[var(--accent)]"
                : "text-[var(--foreground)]"
            )}
          >
            {preset.label}
            {range.preset === preset.value && <Check className="size-3" />}
          </button>
        ))}
        <div className="my-1 h-px bg-[var(--border)]" />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowCustom((v) => !v);
          }}
          className="flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-xs text-[var(--foreground)] hover:bg-[var(--surface-2)]"
        >
          Custom range…
          <span className="font-mono text-[10px] text-[var(--subtle)]">
            {range.preset === "custom" ? "active" : ""}
          </span>
        </button>
        {showCustom && (
          <div
            className="space-y-2 rounded border border-[var(--border)] bg-[var(--surface-2)] p-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <Label htmlFor="range-from">From</Label>
              <Input
                id="range-from"
                type="datetime-local"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label htmlFor="range-to">To</Label>
              <Input
                id="range-to"
                type="datetime-local"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <Button
              size="sm"
              variant="primary"
              className="w-full"
              onClick={() => {
                const from = new Date(customFrom);
                const to = new Date(customTo);
                if (
                  Number.isNaN(from.getTime()) ||
                  Number.isNaN(to.getTime()) ||
                  from >= to
                ) {
                  return;
                }
                setCustom(from, to);
                setShowCustom(false);
              }}
            >
              Apply range
            </Button>
          </div>
        )}
      </div>
    </Dropdown>
  );
}
