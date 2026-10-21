"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TimeSeriesPoint } from "@/domain/models/common";
import { ChartTooltip, CHART_GRID, AXIS_TICK, SEVERITY_COLORS } from "./chart-tooltip";
import { EmptyState } from "@/components/ui/empty-state";
import { Activity } from "lucide-react";

export function EventTimeline({ data }: { data: TimeSeriesPoint[] }) {
  const total = data.reduce((sum, point) => sum + point.count, 0);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-4 py-3">
        <div>
          <h3 className="text-xs font-semibold">Event volume</h3>
          <p className="mt-0.5 text-[11px] text-[var(--subtle)]">
            Ingested events by severity over the selected range
          </p>
        </div>
        <span className="font-mono text-lg leading-none text-[var(--foreground)]">
          {total.toLocaleString()}
        </span>
      </div>
      {total === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={<Activity className="size-4" />}
            title="No events in this range"
            description="Widen the time range or use the scenario simulator to generate traffic."
          />
        </div>
      ) : (
        <div className="h-60 px-2 pb-3 pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 0, right: 8, left: -18, bottom: 0 }}>
              <defs>
                {(["critical", "high", "medium", "low", "info"] as const).map(
                  (severity) => (
                    <linearGradient
                      key={severity}
                      id={`fill-${severity}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={SEVERITY_COLORS[severity]}
                        stopOpacity={0.55}
                      />
                      <stop
                        offset="95%"
                        stopColor={SEVERITY_COLORS[severity]}
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  )
                )}
              </defs>
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
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: CHART_GRID }} />
              {(["info", "low", "medium", "high", "critical"] as const).map(
                (severity) => (
                  <Area
                    key={severity}
                    type="monotone"
                    dataKey={severity}
                    stackId="events"
                    stroke={SEVERITY_COLORS[severity]}
                    strokeWidth={1}
                    fill={`url(#fill-${severity})`}
                    isAnimationActive={false}
                  />
                )
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
