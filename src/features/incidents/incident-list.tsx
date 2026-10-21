"use client";

import * as React from "react";
import Link from "next/link";
import {
  FolderPlus,
  FolderSearch,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { Incident } from "@/domain/models/incident";
import type { Severity } from "@/domain/models/common";
import { SEVERITIES, SEVERITY_RANK } from "@/domain/models/common";
import { SeverityBadge, StatusBadge } from "@/components/ui/severity-badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { useIncidentActions } from "./use-incident-actions";
import { useLiveIncidents } from "@/hooks/use-live-data";
import { relativeTime } from "@/lib/time/time";
import { cn } from "@/lib/utils/cn";

const STATUS_TABS: { value: "all" | Incident["status"]; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "investigating", label: "Investigating" },
  { value: "contained", label: "Contained" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

export function IncidentList() {
  const incidents = useLiveIncidents();
  const { createIncident } = useIncidentActions();
  const [status, setStatus] = React.useState<"all" | Incident["status"]>("all");
  const [search, setSearch] = React.useState("");
  const [severities, setSeverities] = React.useState<Severity[]>([]);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [severity, setSeverity] = React.useState<Severity>("high");
  const [saving, setSaving] = React.useState(false);
  const [createdId, setCreatedId] = React.useState<string | null>(null);

  const counts = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const incident of incidents) {
      map.set(incident.status, (map.get(incident.status) ?? 0) + 1);
    }
    return map;
  }, [incidents]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...incidents]
      .filter((incident) => {
        if (status !== "all" && incident.status !== status) return false;
        if (severities.length > 0 && !severities.includes(incident.severity))
          return false;
        if (!q) return true;
        return (
          incident.title.toLowerCase().includes(q) ||
          incident.id.toLowerCase().includes(q) ||
          incident.description.toLowerCase().includes(q) ||
          (incident.assignedTo ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const activeRank = (value: Incident) =>
          value.status === "closed" ? 1 : 0;
        const active = activeRank(a) - activeRank(b);
        if (active !== 0) return active;
        return (
          SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] ||
          b.updatedAt.localeCompare(a.updatedAt)
        );
      });
  }, [incidents, status, severities, search]);

  const submit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const created = await createIncident({ title, description, severity });
    setSaving(false);
    if (created) {
      setCreatedId(created.id);
      setCreateOpen(false);
      setTitle("");
      setDescription("");
      setSeverity("high");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5">
        <div className="flex flex-1 flex-wrap items-center gap-1">
          {STATUS_TABS.map((tab) => {
            const count =
              tab.value === "all"
                ? incidents.length
                : (counts.get(tab.value) ?? 0);
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatus(tab.value)}
                className={cn(
                  "rounded px-2.5 py-1.5 text-[11px] transition-colors",
                  status === tab.value
                    ? "bg-[var(--surface-2)] text-[var(--foreground)]"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                )}
              >
                {tab.label}
                <span className="ml-1 font-mono text-[9px] text-[var(--subtle)]">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--subtle)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search incidents…"
            className="pl-8"
            aria-label="Search incidents"
          />
        </div>
        <div className="flex items-center gap-1">
          {SEVERITIES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setSeverities((current) =>
                  current.includes(value)
                    ? current.filter((item) => item !== value)
                    : [...current, value]
                )
              }
              aria-pressed={severities.includes(value)}
              className={cn(
                "rounded border px-1.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.06em] transition-colors",
                severities.includes(value)
                  ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-[var(--foreground)]"
                  : "border-[var(--border)] text-[var(--subtle)] hover:text-[var(--foreground)]"
              )}
            >
              {value}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <FolderPlus /> New incident
        </Button>
      </div>

      {createdId && (
        <div className="flex items-center justify-between rounded-lg border border-[color-mix(in_srgb,var(--success)_35%,transparent)] bg-[color-mix(in_srgb,var(--success)_8%,transparent)] px-3 py-2 text-[11px]">
          <span>
            Incident <span className="font-mono">{createdId}</span> created.
          </span>
          <span className="flex gap-3">
            <Link
              href={`/incidents/${createdId}`}
              className="text-[var(--accent)] hover:underline"
            >
              Open workspace
            </Link>
            <button
              type="button"
              onClick={() => setCreatedId(null)}
              className="text-[var(--subtle)] hover:text-[var(--foreground)]"
            >
              Dismiss
            </button>
          </span>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <EmptyState
            icon={<FolderSearch className="size-4" />}
            title="No incidents match"
            description={
              incidents.length === 0
                ? "Create an incident or promote a high-confidence alert from the alert queue."
                : "Adjust the status, severity, or search filters."
            }
            action={{
              label: "Clear filters",
              onClick: () => {
                setStatus("all");
                setSeverities([]);
                setSearch("");
              },
            }}
          />
        </div>
      ) : (
        <div className="grid gap-2.5 lg:grid-cols-2">
          {filtered.map((incident) => (
            <Link
              key={incident.id}
              href={`/incidents/${incident.id}`}
              className="group relative overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--border-hover)]"
            >
              <span
                className={cn(
                  "absolute inset-y-0 left-0 w-0.5",
                  incident.severity === "critical"
                    ? "bg-[var(--sev-critical)]"
                    : incident.severity === "high"
                      ? "bg-[var(--sev-high)]"
                      : incident.severity === "medium"
                        ? "bg-[var(--sev-medium)]"
                        : "bg-[var(--sev-low)]"
                )}
              />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--subtle)]">
                    {incident.id} · updated {relativeTime(incident.updatedAt)}
                  </p>
                  <h3 className="mt-0.5 truncate text-xs font-semibold text-[var(--foreground)]">
                    {incident.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[var(--muted)]">
                    {incident.description || "No description recorded."}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <SeverityBadge severity={incident.severity} withIcon={false} />
                  <StatusBadge kind="incident" status={incident.status} />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[var(--border)] pt-2.5 font-mono text-[9px] text-[var(--subtle)]">
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="size-3" />
                  {incident.alertIds.length} alerts
                </span>
                <span>{incident.eventIds.length} evidence events</span>
                <span>{incident.findings.length} findings</span>
                <span className="ml-auto inline-flex items-center gap-1">
                  <Users className="size-3" />
                  {incident.assignedTo ?? "unassigned"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create incident"
        description="Open a manual investigation. Synthetic data only."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!title.trim() || saving}
              onClick={() => void submit()}
            >
              Create incident
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <Label htmlFor="incident-title">Title</Label>
            <Input
              id="incident-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Suspicious outbound transfer from finance host"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="incident-description">Description</Label>
            <Textarea
              id="incident-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What prompted this investigation?"
            />
          </div>
          <div>
            <Label htmlFor="incident-severity">Severity</Label>
            <Select
              id="incident-severity"
              value={severity}
              onChange={(e) => setSeverity(e.target.value as Severity)}
            >
              {[...SEVERITIES].reverse().map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
