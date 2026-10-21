"use client";

import type { TooltipProps } from "recharts";

export function ChartTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 shadow-lg">
      <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--subtle)]">
        {label}
      </p>
      {payload.map((entry) => (
        <div
          key={String(entry.dataKey)}
          className="flex items-center justify-between gap-4 py-0.5"
        >
          <span className="flex items-center gap-1.5 text-[11px] capitalize text-[var(--muted)]">
            <span
              className="size-1.5 rounded-full"
              style={{ background: entry.color }}
            />
            {String(entry.dataKey)}
          </span>
          <span className="font-mono text-[11px] text-[var(--foreground)]">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export const CHART_GRID = "var(--border)";
export const AXIS_TICK = {
  fill: "var(--subtle)",
  fontSize: 10,
  fontFamily: "var(--font-mono)",
} as const;

export const SEVERITY_COLORS: Record<string, string> = {
  critical: "var(--sev-critical)",
  high: "var(--sev-high)",
  medium: "var(--sev-medium)",
  low: "var(--sev-low)",
  info: "var(--sev-info)",
};
