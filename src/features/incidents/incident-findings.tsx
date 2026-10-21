"use client";

import * as React from "react";
import { FileSearch, Plus } from "lucide-react";
import type { Incident } from "@/domain/models/incident";
import type { SecurityEvent } from "@/domain/models/event";
import type { Severity } from "@/domain/models/common";
import { SEVERITIES } from "@/domain/models/common";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, Input, Label, Select, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { formatShortDateTime } from "@/lib/time/time";
import { useIncidentActions } from "./use-incident-actions";

export function IncidentFindings({
  incident,
  events,
}: {
  incident: Incident;
  events: SecurityEvent[];
}) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [severity, setSeverity] = React.useState<Severity>("medium");
  const [evidenceIds, setEvidenceIds] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);
  const { addFinding } = useIncidentActions();

  const evidenceEvents = incident.eventIds
    .map((id) => events.find((event) => event.id === id))
    .filter((event): event is SecurityEvent => Boolean(event));

  const submit = async () => {
    if (!title.trim() || !description.trim()) return;
    setSaving(true);
    const updated = await addFinding(incident, {
      title,
      description,
      severity,
      evidenceIds,
    });
    setSaving(false);
    if (updated) {
      setOpen(false);
      setTitle("");
      setDescription("");
      setSeverity("medium");
      setEvidenceIds([]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--subtle)]">
          {incident.findings.length} recorded findings
        </p>
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          <Plus /> Add finding
        </Button>
      </div>

      {incident.findings.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <EmptyState
            icon={<FileSearch className="size-4" />}
            title="No findings recorded"
            description="Capture conclusions with supporting evidence so the investigation can be reviewed and reported."
            action={{ label: "Add finding", onClick: () => setOpen(true) }}
          />
        </div>
      ) : (
        <ul className="space-y-2">
          {[...incident.findings].reverse().map((finding) => (
            <li
              key={finding.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium">{finding.title}</p>
                  <p className="mt-0.5 font-mono text-[9px] text-[var(--subtle)]">
                    {finding.author} · {formatShortDateTime(finding.createdAt)} ·{" "}
                    {finding.id}
                  </p>
                </div>
                <SeverityBadge severity={finding.severity} withIcon={false} />
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-[11px] leading-relaxed text-[var(--muted)]">
                {finding.description}
              </p>
              {finding.evidenceIds.length > 0 && (
                <p className="mt-2 font-mono text-[9px] text-[var(--subtle)]">
                  evidence: {finding.evidenceIds.join(", ")}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Record finding"
        description="Findings are appended to the incident timeline and audit trail."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!title.trim() || !description.trim() || saving}
              onClick={() => void submit()}
            >
              Save finding
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <Label htmlFor="finding-title">Title</Label>
            <Input
              id="finding-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Beaconing confirmed to 203.0.113.77"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="finding-description">Description</Label>
            <Textarea
              id="finding-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was observed, why it matters, and what was ruled out…"
            />
          </div>
          <div>
            <Label htmlFor="finding-severity">Severity</Label>
            <Select
              id="finding-severity"
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
          <div>
            <Label>Supporting evidence</Label>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-[var(--border)] p-2">
              {evidenceEvents.length === 0 ? (
                <p className="px-1 py-2 text-[11px] text-[var(--subtle)]">
                  No linked events available for this incident.
                </p>
              ) : (
                evidenceEvents.slice(0, 25).map((event) => (
                  <label
                    key={event.id}
                    className="flex cursor-pointer items-start gap-2 rounded px-1 py-1 text-[10px] hover:bg-[var(--surface-2)]"
                  >
                    <Checkbox
                      checked={evidenceIds.includes(event.id)}
                      onChange={(e) =>
                        setEvidenceIds((current) =>
                          e.target.checked
                            ? [...current, event.id]
                            : current.filter((id) => id !== event.id)
                        )
                      }
                      className="mt-0.5"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-[var(--foreground)]">
                        {event.description}
                      </span>
                      <span className="font-mono text-[9px] text-[var(--subtle)]">
                        {event.id} · {formatShortDateTime(event.timestamp)}
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
