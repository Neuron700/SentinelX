"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  CirclePause,
  CirclePlay,
  Clock3,
  FlaskConical,
  Gauge,
  History,
  Lightbulb,
  ListChecks,
  Play,
  RotateCcw,
  ShieldAlert,
  Square,
  X,
} from "lucide-react";
import type { Scenario } from "@/domain/models/scenario";
import { PageHeader } from "@/components/ui/kpi-card";
import { Button } from "@/components/ui/button";
import { Dialog, Drawer } from "@/components/ui/dialog";
import { Label, Select } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  useLiveScenarioResults,
  useLiveScenarios,
} from "@/hooks/use-live-data";
import { useSimulationStore } from "@/store/simulation-store";
import { useSettingsStore } from "@/store/settings-store";
import {
  dismissSimulationSummary,
  isSimulationSupported,
  pauseSimulation,
  resumeSimulation,
  setSimulationSpeed,
  startScenarioSimulation,
  stopSimulation,
} from "@/simulation/runner";
import { formatShortDateTime, formatTimestamp } from "@/lib/time/time";
import { cn } from "@/lib/utils/cn";

const DIFFICULTY_STYLES: Record<Scenario["difficulty"], string> = {
  beginner: "text-[var(--success)] border-[color-mix(in_srgb,var(--success)_40%,transparent)]",
  intermediate: "text-[var(--warning)] border-[color-mix(in_srgb,var(--warning)_40%,transparent)]",
  advanced: "text-[var(--sev-critical)] border-[color-mix(in_srgb,var(--sev-critical)_40%,transparent)]",
};

const SPEEDS = [1, 2, 4, 8];

export default function ScenariosPage() {
  const scenarios = useLiveScenarios();
  const results = useLiveScenarioResults();
  const running = useSimulationStore((s) => s.running);
  const settingsSpeed = useSettingsStore((s) => s.simulationSpeed);
  const setSettingsSpeed = useSettingsStore((s) => s.setSimulationSpeed);

  const [selected, setSelected] = React.useState<Scenario | null>(null);
  const [starting, setStarting] = React.useState<Scenario | null>(null);
  const [speed, setSpeed] = React.useState(settingsSpeed);
  const [supported, setSupported] = React.useState(true);

  React.useEffect(() => {
    setSupported(isSimulationSupported());
  }, []);

  const active =
    running && (running.status === "running" || running.status === "paused")
      ? running
      : null;
  const finished =
    running && (running.status === "completed" || running.status === "stopped")
      ? running
      : null;
  const errored = running?.status === "error" ? running : null;

  const resultsFor = (scenarioId: string) =>
    results
      .filter((result) => result.scenarioId === scenarioId)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];

  const start = () => {
    if (!starting) return;
    setSettingsSpeed(speed);
    const ok = startScenarioSimulation(starting, speed);
    if (ok) setStarting(null);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Training range"
        title="Scenario simulator"
        description="Run deterministic synthetic scenarios through a Web Worker. Generated events and detections are written to the local dataset and clearly labeled by scenario."
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link href="/reports">
              <History /> Simulation results
            </Link>
          </Button>
        }
      />

      {!supported && (
        <div className="rounded-lg border border-[color-mix(in_srgb,var(--sev-high)_40%,transparent)] bg-[color-mix(in_srgb,var(--sev-high)_8%,transparent)] p-3 text-[11px]">
          This browser does not expose Web Workers, so the simulator cannot run.
          All other platform features remain available.
        </div>
      )}

      {active && (
        <section className="rounded-lg border border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent)_5%,var(--surface))] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="relative flex size-9 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--accent)_40%,transparent)] bg-[var(--surface)] text-[var(--accent)]">
                <FlaskConical className="size-4" />
                {active.status === "running" && (
                  <span className="absolute inset-0 animate-ping rounded-full border border-[var(--accent)] opacity-20" />
                )}
              </span>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--accent)]">
                  {active.status === "running" ? "Running" : "Paused"} ·{" "}
                  {active.phaseName}
                </p>
                <h2 className="mt-0.5 text-sm font-semibold">
                  {active.scenarioTitle}
                </h2>
                <p className="font-mono text-[10px] text-[var(--subtle)]">
                  simulated clock {formatTimestamp(active.simulatedClock)} · seed{" "}
                  {active.seed} · phase {active.phaseIndex + 1}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {SPEEDS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setSimulationSpeed(value);
                    setSettingsSpeed(value);
                  }}
                  className={cn(
                    "rounded border px-1.5 py-1 font-mono text-[9px] transition-colors",
                    active.speed === value
                      ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--accent)]"
                      : "border-[var(--border)] text-[var(--subtle)] hover:text-[var(--foreground)]"
                  )}
                  aria-pressed={active.speed === value}
                >
                  {value}×
                </button>
              ))}
              {active.status === "running" ? (
                <Button variant="secondary" size="sm" onClick={pauseSimulation}>
                  <CirclePause /> Pause
                </Button>
              ) : (
                <Button variant="secondary" size="sm" onClick={resumeSimulation}>
                  <CirclePlay /> Resume
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={stopSimulation}>
                <Square /> Stop
              </Button>
            </div>
          </div>
          <Progress value={Math.round(active.progress * 100)} className="mt-3" />
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[10px] text-[var(--subtle)]">
            <span>{Math.round(active.progress * 100)}% complete</span>
            <span>{active.eventsGenerated} events generated</span>
            <span>{active.alertsGenerated} alerts raised</span>
            <Link
              href="/alerts"
              className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline"
            >
              <ShieldAlert className="size-3" /> Review alerts
            </Link>
            <Link
              href="/events"
              className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline"
            >
              <ArrowRight className="size-3" /> Review events
            </Link>
          </div>
        </section>
      )}

      {(finished || errored) && (
        <section className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-full border",
              errored
                ? "border-[color-mix(in_srgb,var(--sev-critical)_40%,transparent)] text-[var(--sev-critical)]"
                : "border-[color-mix(in_srgb,var(--success)_40%,transparent)] text-[var(--success)]"
            )}
          >
            {errored ? <X className="size-4" /> : <ListChecks className="size-4" />}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium">
              {errored
                ? "Scenario error"
                : finished?.status === "stopped"
                  ? "Scenario stopped"
                  : "Scenario completed"}{" "}
              · {running?.scenarioTitle}
            </p>
            <p className="font-mono text-[10px] text-[var(--subtle)]">
              {errored
                ? errored.errorMessage
                : `${finished?.eventsGenerated} events · ${finished?.alertsGenerated} alerts · seed ${finished?.seed}`}
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                dismissSimulationSummary();
                if (finished) {
                  setStarting(
                    scenarios.find((s) => s.id === finished.scenarioId) ?? null
                  );
                }
              }}
            >
              <RotateCcw /> Run again
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => dismissSimulationSummary()}
            >
              Dismiss
            </Button>
          </div>
        </section>
      )}

      {scenarios.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <EmptyState
            icon={<FlaskConical className="size-4" />}
            title="No scenarios installed"
            description="Reset the demo dataset from the top bar to restore the built-in scenarios."
          />
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {scenarios.map((scenario) => {
            const lastResult = resultsFor(scenario.id);
            const isThisRunning = active?.scenarioId === scenario.id;
            return (
              <article
                key={scenario.id}
                className={cn(
                  "flex flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4",
                  isThisRunning && "border-[color-mix(in_srgb,var(--accent)_45%,transparent)]"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em]",
                      DIFFICULTY_STYLES[scenario.difficulty]
                    )}>
                      {scenario.difficulty}
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--subtle)]">
                      {scenario.category}
                    </span>
                  </div>
                  <SeverityBadge severity={scenario.severity} withIcon={false} />
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(scenario)}
                  className="mt-2 text-left"
                >
                  <h2 className="text-sm font-semibold hover:text-[var(--accent)]">
                    {scenario.title}
                  </h2>
                  <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">
                    {scenario.description}
                  </p>
                </button>
                <div className="mt-3 grid grid-cols-4 gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-2 font-mono text-[9px] text-[var(--subtle)]">
                  <span>
                    <span className="block text-[var(--muted)]">{scenario.phases.length}</span>
                    phases
                  </span>
                  <span>
                    <span className="block text-[var(--muted)]">
                      {scenario.phases.reduce(
                        (sum, phase) => sum + phase.durationSeconds,
                        0
                      )}
                      s
                    </span>
                    timeline
                  </span>
                  <span>
                    <span className="block text-[var(--muted)]">{scenario.rules.length}</span>
                    rules
                  </span>
                  <span>
                    <span className="block text-[var(--muted)]">{scenario.seed}</span>
                    seed
                  </span>
                </div>
                <ul className="mt-3 space-y-1">
                  {scenario.learningObjectives.slice(0, 2).map((objective) => (
                    <li
                      key={objective}
                      className="flex items-start gap-1.5 text-[10px] leading-relaxed text-[var(--muted)]"
                    >
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-[var(--accent)]" />
                      {objective}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
                  <span className="font-mono text-[9px] text-[var(--subtle)]">
                    {lastResult
                      ? `last ${formatShortDateTime(lastResult.completedAt)} · ${lastResult.alertsGenerated} alerts`
                      : "not run yet"}
                  </span>
                  <div className="flex gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelected(scenario)}
                    >
                      Details
                    </Button>
                    <Button
                      size="sm"
                      disabled={!supported || active !== null}
                      onClick={() => {
                        setSpeed(settingsSpeed);
                        setStarting(scenario);
                      }}
                    >
                      <Play /> Run
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="rounded-lg border border-dashed border-[var(--border)] p-3 text-[10px] leading-relaxed text-[var(--subtle)]">
        Scenarios are defensive training simulations. They generate synthetic
        telemetry only — no real network traffic, scanning, or exploitation.
        Every generated record carries the scenario ID, and detections use the
        same local rule definitions shown in the rule explorer.
      </div>

      <Drawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.title ?? ""}
        subtitle={
          selected ? (
            <span className="font-mono">
              {selected.category} · {selected.difficulty} · seed {selected.seed}
            </span>
          ) : undefined
        }
        width="max-w-2xl"
      >
        {selected && (
          <div className="space-y-5">
            <p className="text-xs leading-relaxed text-[var(--muted)]">
              {selected.description}
            </p>

            <section>
              <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--subtle)]">
                Phases
              </h3>
              <ol className="space-y-1.5">
                {selected.phases.map((phase, index) => (
                  <li
                    key={phase.name}
                    className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-medium">
                        {index + 1}. {phase.name}
                      </p>
                      <span className="inline-flex items-center gap-1 font-mono text-[9px] text-[var(--subtle)]">
                        <Clock3 className="size-2.5" /> {phase.durationSeconds}s ·{" "}
                        {phase.eventRatePerMinute}/min
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                      {phase.description}
                    </p>
                  </li>
                ))}
              </ol>
            </section>

            <section>
              <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--subtle)]">
                Detection rules exercised
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {selected.rules.map((rule) => (
                  <span
                    key={rule.id}
                    className="rounded border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 font-mono text-[10px] text-[var(--muted)]"
                  >
                    {rule.name}
                  </span>
                ))}
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              <div>
                <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--subtle)]">
                  Learning objectives
                </h3>
                <ul className="space-y-1">
                  {selected.learningObjectives.map((objective) => (
                    <li key={objective} className="flex gap-1.5 text-[10px] leading-relaxed text-[var(--muted)]">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-[var(--accent)]" />
                      {objective}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--subtle)]">
                  Expected findings
                </h3>
                <ul className="space-y-1">
                  {selected.expectedFindings.map((finding) => (
                    <li key={finding} className="flex gap-1.5 text-[10px] leading-relaxed text-[var(--muted)]">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-[var(--secondary-accent)]" />
                      {finding}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section>
              <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--subtle)]">
                Success criteria
              </h3>
              <ul className="space-y-1">
                {selected.successCriteria.map((criterion) => (
                  <li key={criterion} className="flex gap-1.5 text-[10px] leading-relaxed text-[var(--muted)]">
                    <ListChecks className="mt-0.5 size-3 shrink-0 text-[var(--success)]" />
                    {criterion}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--subtle)]">
                <Lightbulb className="size-3" /> Self-check questions
              </h3>
              <ul className="space-y-2">
                {selected.evaluationQuestions.map((question) => (
                  <li key={question.question} className="rounded border border-[var(--border)] p-2">
                    <p className="text-[11px]">{question.question}</p>
                    <details className="mt-1">
                      <summary className="cursor-pointer font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--accent)]">
                        reveal hint
                      </summary>
                      <p className="mt-1 text-[10px] text-[var(--muted)]">
                        {question.expectedAnswerHint}
                      </p>
                    </details>
                  </li>
                ))}
              </ul>
            </section>

            <div className="flex gap-2">
              <Button
                disabled={!supported || active !== null}
                onClick={() => {
                  setSpeed(settingsSpeed);
                  setStarting(selected);
                  setSelected(null);
                }}
              >
                <Play /> Start scenario
              </Button>
              <Button variant="ghost" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      <Dialog
        open={starting !== null}
        onClose={() => setStarting(null)}
        title={`Run “${starting?.title ?? ""}”`}
        description="Choose a simulation speed. Generated events persist in the local dataset until you reset the demo."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setStarting(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={start}>
              <Play /> Start simulation
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <Label htmlFor="simulation-speed">Simulation speed</Label>
            <Select
              id="simulation-speed"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            >
              {SPEEDS.map((value) => (
                <option key={value} value={value}>
                  {value}× {value === 8 ? "(fastest)" : ""}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-[10px] text-[var(--subtle)]">
              At 1× the scenario runs in roughly{" "}
              {starting
                ? Math.ceil(
                    starting.phases.reduce(
                      (sum, phase) => sum + phase.durationSeconds,
                      0
                    ) / 60
                  )
                : 0}{" "}
              minutes. Determinism is preserved at any speed.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
            <Gauge className="size-4 text-[var(--accent)]" />
            <p className="text-[10px] leading-relaxed text-[var(--muted)]">
              The engine runs in a Web Worker so the interface stays responsive.
              Pause, resume, change speed, or stop at any time; generated data
              remains.
            </p>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
