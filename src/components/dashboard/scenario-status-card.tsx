"use client";

import Link from "next/link";
import { ArrowRight, CirclePause, CirclePlay, FlaskConical } from "lucide-react";
import { useSimulationStore } from "@/store/simulation-store";
import { relativeTime } from "@/lib/time/time";

export function ScenarioStatusCard() {
  const running = useSimulationStore((s) => s.running);
  const lastCompleted = useSimulationStore((s) => s.lastCompleted);
  const active = running && running.status !== "stopped" ? running : null;

  return (
    <div className="flex h-full flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div>
          <h3 className="text-xs font-semibold">Simulation</h3>
          <p className="mt-0.5 text-[11px] text-[var(--subtle)]">
            Deterministic scenario traffic
          </p>
        </div>
        <FlaskConical className="size-4 text-[var(--accent)]" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        {active ? (
          <>
            <div className="flex items-center gap-2">
              {active.status === "running" ? (
                <CirclePlay className="size-4 text-[var(--sev-low)]" />
              ) : (
                <CirclePause className="size-4 text-[var(--sev-medium)]" />
              )}
              <span className="text-xs font-medium">
                {active.status === "running" ? "Running" : "Paused"} ·{" "}
                {active.scenarioTitle}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all"
                style={{ width: `${Math.round(active.progress * 100)}%` }}
              />
            </div>
            <dl className="grid grid-cols-3 gap-2 text-center">
              <div>
                <dt className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--subtle)]">
                  phase
                </dt>
                <dd className="mt-0.5 truncate text-[11px]">{active.phaseName}</dd>
              </div>
              <div>
                <dt className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--subtle)]">
                  events
                </dt>
                <dd className="mt-0.5 font-mono text-[11px]">
                  {active.eventsGenerated}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--subtle)]">
                  alerts
                </dt>
                <dd className="mt-0.5 font-mono text-[11px]">
                  {active.alertsGenerated}
                </dd>
              </div>
            </dl>
          </>
        ) : lastCompleted ? (
          <>
            <p className="text-xs font-medium">
              Last run · {lastCompleted.scenarioTitle}
            </p>
            <p className="font-mono text-[10px] text-[var(--subtle)]">
              {lastCompleted.eventsGenerated} events ·{" "}
              {lastCompleted.alertsGenerated} alerts · seed {lastCompleted.seed}
            </p>
            <p className="text-[10px] text-[var(--subtle)]">
              Completed {relativeTime(lastCompleted.simulatedClock)}
            </p>
          </>
        ) : (
          <>
            <p className="text-xs font-medium">No scenario running</p>
            <p className="text-[11px] leading-relaxed text-[var(--muted)]">
              Generate deterministic, labeled synthetic activity to exercise
              detections, alert triage, and the graph.
            </p>
          </>
        )}
        <Link
          href="/scenarios"
          className="mt-auto inline-flex items-center gap-1 text-[11px] font-medium text-[var(--accent)] hover:underline"
        >
          Open scenario simulator <ArrowRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}
