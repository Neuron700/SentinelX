"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  ChevronRight,
  Clock3,
  ExternalLink,
  GitBranch,
  ListChecks,
  Search,
} from "lucide-react";
import type { Playbook } from "@/domain/models/playbook";
import { PageHeader } from "@/components/ui/kpi-card";
import { Input } from "@/components/ui/input";
import { Drawer } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { useLiveIncidents, useLivePlaybooks } from "@/hooks/use-live-data";
import { cn } from "@/lib/utils/cn";

const STEP_TYPE_STYLES: Record<string, string> = {
  action: "border-[var(--accent)]/40 text-[var(--accent)]",
  decision: "border-[var(--warning)]/40 text-[var(--warning)]",
  documentation: "border-[var(--border)] text-[var(--muted)]",
  verification: "border-[var(--success)]/40 text-[var(--success)]",
};

export function PlaybookLibrary() {
  const playbooks = useLivePlaybooks();
  const incidents = useLiveIncidents();
  const [search, setSearch] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return playbooks;
    return playbooks.filter(
      (playbook) =>
        playbook.name.toLowerCase().includes(query) ||
        playbook.description.toLowerCase().includes(query) ||
        playbook.applicableTo.some((tag) => tag.toLowerCase().includes(query))
    );
  }, [playbooks, search]);

  const selected = playbooks.find((playbook) => playbook.id === selectedId) ?? null;
  const linkedIncidents = incidents.filter(
    (incident) => incident.playbookId === selectedId
  );
  const totalMinutes = (playbook: Playbook) =>
    playbook.steps.reduce((sum, step) => sum + step.estimatedMinutes, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Response procedures"
        title="Playbooks"
        description="Repeatable response checklists used in incident workspaces. Steps can be attached to incidents and tracked to completion."
      />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--subtle)]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search playbooks by name, tag, or description…"
              className="pl-8"
              aria-label="Search playbooks"
            />
          </div>
          <span className="font-mono text-[10px] text-[var(--subtle)]">
            {filtered.length} of {playbooks.length} playbooks
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            <EmptyState
              icon={<BookOpen className="size-4" />}
              title="No playbooks found"
              description="Try a different search term."
            />
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map((playbook) => {
              const used = incidents.filter(
                (incident) => incident.playbookId === playbook.id
              ).length;
              return (
                <button
                  key={playbook.id}
                  type="button"
                  onClick={() => setSelectedId(playbook.id)}
                  className="group flex flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded border border-[var(--border)] bg-[var(--surface-2)] text-[var(--accent)]">
                      <BookOpen className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-sm font-medium">{playbook.name}</h2>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[var(--muted)]">
                        {playbook.description}
                      </p>
                    </div>
                    <ChevronRight className="mt-1 size-4 text-[var(--subtle)] transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-2.5 text-[10px] text-[var(--subtle)]">
                    <span className="inline-flex items-center gap-1">
                      <ListChecks className="size-3" />
                      {playbook.steps.length} steps
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="size-3" />
                      ~{totalMinutes(playbook)} min
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <GitBranch className="size-3" />
                      used by {used} incident{used === 1 ? "" : "s"}
                    </span>
                    <span className="ml-auto flex gap-1">
                      {playbook.applicableTo.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded border border-[var(--border)] px-1.5 py-0.5 font-mono text-[9px]"
                        >
                          {tag}
                        </span>
                      ))}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Drawer
        open={selected !== null}
        onClose={() => setSelectedId(null)}
        title={selected?.name ?? ""}
        subtitle={
          selected ? (
            <span className="font-mono">{selected.id} · {selected.applicableTo.join(", ")}</span>
          ) : undefined
        }
        width="max-w-xl"
      >
        {selected && (
          <div className="space-y-5">
            <p className="text-[11px] leading-relaxed text-[var(--muted)]">
              {selected.description}
            </p>

            <div className="grid grid-cols-3 gap-2">
              <Stat label="Steps" value={selected.steps.length} />
              <Stat label="Est. minutes" value={totalMinutes(selected)} />
              <Stat label="Linked incidents" value={linkedIncidents.length} />
            </div>

            <section>
              <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--subtle)]">
                Procedure
              </h3>
              <ol className="space-y-2">
                {[...selected.steps]
                  .sort((a, b) => a.order - b.order)
                  .map((step) => (
                    <li
                      key={step.id}
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] font-mono text-[9px]">
                          {step.order}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h4 className="text-[11px] font-medium">{step.title}</h4>
                            <span
                              className={cn(
                                "rounded border px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.06em]",
                                STEP_TYPE_STYLES[step.type]
                              )}
                            >
                              {step.type}
                            </span>
                            {step.required && (
                              <span className="rounded border border-[var(--danger)]/40 px-1.5 py-0.5 font-mono text-[8px] uppercase text-[var(--danger)]">
                                required
                              </span>
                            )}
                            <span className="ml-auto font-mono text-[9px] text-[var(--subtle)]">
                              ~{step.estimatedMinutes}m
                            </span>
                          </div>
                          <p className="mt-1 text-[10px] leading-relaxed text-[var(--muted)]">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
              </ol>
            </section>

            <section>
              <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--subtle)]">
                Incidents using this playbook
              </h3>
              {linkedIncidents.length === 0 ? (
                <p className="text-[11px] text-[var(--subtle)]">
                  Not yet attached to an incident. Open an incident workspace to
                  attach and track this procedure.
                </p>
              ) : (
                <ul className="space-y-1">
                  {linkedIncidents.map((incident) => (
                    <li key={incident.id}>
                      <Link
                        href={`/incidents/${incident.id}?tab=playbook`}
                        className="flex items-center gap-2 rounded border border-[var(--border)] px-2.5 py-1.5 text-[10px] hover:bg-[var(--surface-2)]"
                      >
                        <span className="font-mono text-[9px] text-[var(--accent)]">
                          {incident.id}
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          {incident.title}
                        </span>
                        <ExternalLink className="size-3 text-[var(--subtle)]" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="border-t border-[var(--border)] pt-3">
              <Link
                href="/incidents"
                className="inline-flex items-center gap-1.5 rounded border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-[10px] hover:bg-[var(--elevated)]"
              >
                <ExternalLink className="size-3" /> Open incident queue
              </Link>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
      <p className="font-mono text-base leading-none">{value}</p>
      <p className="mt-1 text-[9px] uppercase tracking-[0.08em] text-[var(--subtle)]">
        {label}
      </p>
    </div>
  );
}
