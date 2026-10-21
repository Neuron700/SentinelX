"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TimeSeriesPoint } from "@/domain/models/common";
import { ChartTooltip, CHART_GRID, AXIS_TICK, SEVERITY_COLORS } from "./chart-tooltip";
import { EmptyState } from "@/components/ui/empty-state";
import { BellOff } from "lucide-react";

export function AlertTrend({ data }: { data: TimeSeriesPoint[] }) {
  const total = data.reduce((sum, point) => sum + point.count, 0);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-4 py-3">
        <div>
          <h3 className="text-xs font-semibold">Alert activity</h3>
          <p className="mt-0.5 text-[11px] text-[var(--subtle)]">
            Alerts raised, stacked by severity
          </p>
        </div>
        <span className="font-mono text-lg leading-none text-[var(--foreground)]">
          {total}
        </span>
      </div>
      {total === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={<BellOff className="size-4" />}
            title="No alerts in this range"
            description="Detection rules did not fire during the selected window."
          />
        </div>
      ) : (
        <div className="h-52 px-2 pb-3 pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey="label"
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
                minTickGap={28}
              />
              <YAxis
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                width={40}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--surface-2)" }} />
              {(["info", "low", "medium", "high", "critical"] as const).map(
                (severity) => (
                  <Bar
                    key={severity}
                    dataKey={severity}
                    stackId="alerts"
                    fill={SEVERITY_COLORS[severity]}
                    radius={
                      severity === "critical" ? [2, 2, 0, 0] : [0, 0, 0, 0]
                    }
                    isAnimationActive={false}
                  />
                )
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
