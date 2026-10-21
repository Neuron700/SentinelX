"use client";

import * as React from "react";
import { BookOpen, Check, Clock3, RefreshCw } from "lucide-react";
import type { Incident } from "@/domain/models/incident";
import { playbookProgressPercent } from "@/domain/models/playbook";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { useLivePlaybooks } from "@/hooks/use-live-data";
import { useIncidentActions } from "./use-incident-actions";
import { cn } from "@/lib/utils/cn";
import { formatShortDateTime } from "@/lib/time/time";

const STEP_TYPE_LABELS: Record<string, string> = {
  action: "Action",
  decision: "Decision",
  documentation: "Documentation",
  verification: "Verification",
};

export function IncidentPlaybook({ incident }: { incident: Incident }) {
  const playbooks = useLivePlaybooks();
  const { setPlaybook, toggleStep } = useIncidentActions();
  const [selected, setSelected] = React.useState(incident.playbookId ?? "");
  const [busyStep, setBusyStep] = React.useState<string | null>(null);

  React.useEffect(() => {
    setSelected(incident.playbookId ?? "");
  }, [incident.playbookId]);

  const playbook = playbooks.find((item) => item.id === incident.playbookId);
  const steps = playbook
    ? [...playbook.steps].sort((a, b) => a.order - b.order)
    : [];
  const percent = playbook
    ? playbookProgressPercent(steps, incident.playbookProgress)
    : 0;

  const toggle = async (stepId: string, completed: boolean) => {
    setBusyStep(stepId);
    await toggleStep(incident, stepId, completed);
    setBusyStep(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
        <div className="min-w-[220px] flex-1">
          <label
            htmlFor="playbook-select"
            className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--subtle)]"
          >
            Response playbook
          </label>
          <Select
            id="playbook-select"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">No playbook attached</option>
            {playbooks.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={selected === (incident.playbookId ?? "")}
          onClick={() => void setPlaybook(incident, selected || null)}
        >
          <RefreshCw /> {incident.playbookId ? "Update" : "Attach"}
        </Button>
      </div>

      {!playbook ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <EmptyState
            icon={<BookOpen className="size-4" />}
            title="No playbook attached"
            description="Attach a structured response playbook to track containment, evidence preservation, and recovery steps."
          />
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xs font-semibold">{playbook.name}</h3>
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                  {playbook.description}
                </p>
              </div>
              <span className="font-mono text-lg text-[var(--accent)]">
                {percent}%
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="mt-1.5 font-mono text-[9px] text-[var(--subtle)]">
              {
                steps.filter((step) =>
                  incident.playbookProgress.some(
                    (progress) => progress.stepId === step.id && progress.completed
                  )
                ).length
              }{" "}
              of {steps.length} steps complete ·{" "}
              {steps.reduce((sum, step) => sum + step.estimatedMinutes, 0)} min
              estimated
            </p>
          </div>

          <ol className="space-y-1.5">
            {steps.map((step) => {
              const progress = incident.playbookProgress.find(
                (item) => item.stepId === step.id
              );
              const completed = progress?.completed ?? false;
              return (
                <li
                  key={step.id}
                  className={cn(
                    "rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 transition-colors",
                    completed && "opacity-75"
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <button
                      type="button"
                      onClick={() => void toggle(step.id, !completed)}
                      disabled={busyStep !== null}
                      aria-pressed={completed}
                      aria-label={`${completed ? "Reopen" : "Complete"} step: ${step.title}`}
                      className={cn(
                        "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                        completed
                          ? "border-[var(--accent)] bg-[var(--accent)] text-[#04141a]"
                          : "border-[var(--border-hover)] hover:border-[var(--accent)]"
                      )}
                    >
                      {completed && <Check className="size-3" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={cn(
                            "text-[11px] font-medium",
                            completed && "line-through decoration-[var(--subtle)]"
                          )}
                        >
                          {step.order}. {step.title}
                        </p>
                        <span className="rounded border border-[var(--border)] px-1 py-0.5 font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--subtle)]">
                          {STEP_TYPE_LABELS[step.type]}
                        </span>
                        {step.required && (
                          <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--sev-medium)]">
                            required
                          </span>
                        )}
                        <span className="ml-auto inline-flex items-center gap-1 font-mono text-[9px] text-[var(--subtle)]">
                          <Clock3 className="size-2.5" /> {step.estimatedMinutes}m
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--muted)]">
                        {step.description}
                      </p>
                      {completed && progress?.completedAt && (
                        <p className="mt-1 font-mono text-[9px] text-[var(--subtle)]">
                          completed {formatShortDateTime(progress.completedAt)}
                          {progress.completedBy
                            ? ` by ${progress.completedBy}`
                            : ""}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
}
