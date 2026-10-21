"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip, CHART_GRID, AXIS_TICK } from "./chart-tooltip";
import { EmptyState } from "@/components/ui/empty-state";
import { Layers } from "lucide-react";

const EVENT_TYPE_LABELS: Record<string, string> = {
  authentication_success: "Auth success",
  authentication_failure: "Auth failure",
  network_connection: "Network conn.",
  process_creation: "Process create",
  file_access: "File access",
  dns_query: "DNS query",
  privilege_escalation: "Priv. escalation",
  data_transfer: "Data transfer",
  configuration_change: "Config change",
  malware_detected: "Malware",
  port_scan_simulated: "Port scan (sim)",
  system_alert: "System alert",
};

export function EventTypeChart({
  data,
}: {
  data: { type: string; count: number }[];
}) {
  const chartData = data.map((entry) => ({
    ...entry,
    label: EVENT_TYPE_LABELS[entry.type] ?? entry.type.replaceAll("_", " "),
  }));

  return (
    <div className="flex h-full flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <h3 className="text-xs font-semibold">Event categories</h3>
        <p className="mt-0.5 text-[11px] text-[var(--subtle)]">
          Most frequent event types
        </p>
      </div>
      {chartData.length === 0 ? (
        <div className="flex-1 p-4">
          <EmptyState
            icon={<Layers className="size-4" />}
            title="No categories"
            description="No events in the selected range."
          />
        </div>
      ) : (
        <div className="flex-1 px-2 py-3" style={{ minHeight: 230 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 14, left: 4, bottom: 0 }}
            >
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="2 4" horizontal={false} />
              <XAxis
                type="number"
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ ...AXIS_TICK, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={92}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--surface-2)" }} />
              <Bar dataKey="count" radius={[0, 2, 2, 0]} isAnimationActive={false}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={entry.type}
                    fill={
                      index === 0
                        ? "var(--accent)"
                        : `color-mix(in srgb, var(--accent) ${Math.max(
                            25,
                            80 - index * 8
                          )}%, var(--surface-2))`
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
