"use client";

import Link from "next/link";
import { ArrowUpRight, Grid3x3 } from "lucide-react";
import type { HostActivityRow } from "@/features/overview/derive";
import { EmptyState } from "@/components/ui/empty-state";

function intensity(count: number, max: number): number {
  if (count === 0 || max === 0) return 0;
  return Math.max(0.12, Math.min(1, Math.log1p(count) / Math.log1p(max)));
}

export function HostHeatmap({ rows }: { rows: HostActivityRow[] }) {
  const max = Math.max(...rows.flatMap((row) => row.hours), 1);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-4 py-3">
        <div>
          <h3 className="text-xs font-semibold">Host activity by hour</h3>
          <p className="mt-0.5 text-[11px] text-[var(--subtle)]">
            Source-host event density across the day
          </p>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--subtle)]">
          low
          <span className="flex gap-0.5">
            {[0.15, 0.35, 0.6, 0.85, 1].map((value) => (
              <span
                key={value}
                className="size-2 rounded-[1px]"
                style={{
                  background: `color-mix(in srgb, var(--accent) ${value * 100}%, var(--surface-2))`,
                }}
              />
            ))}
          </span>
          high
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={<Grid3x3 className="size-4" />}
            title="No host activity"
            description="No events with a source host in the selected range."
          />
        </div>
      ) : (
        <div className="overflow-x-auto px-4 py-3">
          <div className="min-w-[560px]">
            <div className="mb-1 flex items-center gap-2 pl-[124px]">
              {Array.from({ length: 24 }, (_, hour) => (
                <span
                  key={hour}
                  className="flex-1 text-center font-mono text-[8px] text-[var(--subtle)]"
                >
                  {hour % 3 === 0 ? String(hour).padStart(2, "0") : ""}
                </span>
              ))}
            </div>
            <div className="space-y-1">
              {rows.map((row) => (
                <div key={row.hostId} className="flex items-center gap-2">
                  <Link
                    href={`/assets?asset=${row.hostId}`}
                    className="group flex w-[120px] shrink-0 items-center gap-1 truncate font-mono text-[10px] text-[var(--muted)] hover:text-[var(--foreground)]"
                    title={row.hostId}
                  >
                    <span className="truncate">{row.name}</span>
                    <ArrowUpRight className="size-2.5 shrink-0 opacity-0 group-hover:opacity-100" />
                  </Link>
                  {row.hours.map((count, hour) => (
                    <span
                      key={hour}
                      className="group relative h-3.5 flex-1 rounded-[1px]"
                      style={{
                        background:
                          count === 0
                            ? "var(--surface-2)"
                            : `color-mix(in srgb, var(--accent) ${Math.round(
                                intensity(count, max) * 100
                              )}%, var(--surface-2))`,
                      }}
                      title={`${row.name} · ${String(hour).padStart(2, "0")}:00 · ${count} events`}
                    />
                  ))}
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-[var(--subtle)]">
              Aggregate hour-of-day counts; hover a cell for the exact volume.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
