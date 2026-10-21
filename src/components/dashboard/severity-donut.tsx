"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import type { Severity } from "@/domain/models/common";
import { SEVERITY_COLORS } from "./chart-tooltip";
import { EmptyState } from "@/components/ui/empty-state";
import { PieChart as PieIcon } from "lucide-react";

const ORDER: Severity[] = ["critical", "high", "medium", "low", "info"];

export function SeverityDonut({
  counts,
}: {
  counts: Record<Severity, number>;
}) {
  const data = ORDER.map((severity) => ({
    severity,
    count: counts[severity],
  })).filter((entry) => entry.count > 0);
  const total = data.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <div className="flex h-full flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <h3 className="text-xs font-semibold">Severity mix</h3>
        <p className="mt-0.5 text-[11px] text-[var(--subtle)]">
          Share of events by severity
        </p>
      </div>
      {total === 0 ? (
        <div className="flex-1 p-4">
          <EmptyState
            icon={<PieIcon className="size-4" />}
            title="Nothing to chart"
            description="No events in the selected range."
          />
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-center p-4">
          <div className="relative mx-auto h-40 w-full max-w-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="severity"
                  innerRadius="64%"
                  outerRadius="92%"
                  paddingAngle={2}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {data.map((entry) => (
                    <Cell
                      key={entry.severity}
                      fill={SEVERITY_COLORS[entry.severity]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-xl text-[var(--foreground)]">
                {total.toLocaleString()}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--subtle)]">
                events
              </span>
            </div>
          </div>
          <ul className="mt-4 space-y-1.5">
            {data.map((entry) => (
              <li
                key={entry.severity}
                className="flex items-center justify-between text-[11px]"
              >
                <span className="flex items-center gap-2 capitalize text-[var(--muted)]">
                  <span
                    className="size-2 rounded-full"
                    style={{ background: SEVERITY_COLORS[entry.severity] }}
                  />
                  {entry.severity}
                </span>
                <span className="font-mono text-[var(--foreground)]">
                  {entry.count.toLocaleString()}
                  <span className="ml-2 text-[var(--subtle)]">
                    {Math.round((entry.count / total) * 100)}%
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
