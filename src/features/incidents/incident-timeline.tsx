"use client";

import * as React from "react";
import Link from "next/link";
import { BellRing, FileText, Send, StickyNote, UserRound } from "lucide-react";
import type { Incident } from "@/domain/models/incident";
import type { Alert } from "@/domain/models/alert";
import type { SecurityEvent } from "@/domain/models/event";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { formatShortDateTime, relativeTime } from "@/lib/time/time";
import { cn } from "@/lib/utils/cn";
import { useIncidentActions } from "./use-incident-actions";

type Filter = "all" | "events" | "alerts" | "analyst";

interface TimelineRow {
  id: string;
  timestamp: string;
  kind: "event" | "alert" | "analyst";
  title: string;
  description: string;
  actor?: string;
  href?: string;
  severity?: Alert["severity"];
}

export function IncidentTimeline({
  incident,
  alerts,
  events,
}: {
  incident: Incident;
  alerts: Alert[];
  events: SecurityEvent[];
}) {
  const [filter, setFilter] = React.useState<Filter>("all");
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const { addNote } = useIncidentActions();

  const rows = React.useMemo<TimelineRow[]>(() => {
    const result: TimelineRow[] = incident.timeline.map((entry) => ({
      id: entry.id,
      timestamp: entry.timestamp,
      kind: "analyst",
      title: entry.title,
      description: entry.description,
      actor: entry.actor,
    }));

    for (const alertId of incident.alertIds) {
      const alert = alerts.find((item) => item.id === alertId);
      if (!alert) continue;
      result.push({
        id: `alert-row-${alert.id}`,
        timestamp: alert.firstSeen,
        kind: "alert",
        title: `Alert raised: ${alert.title}`,
        description: `${alert.id} · rule ${alert.ruleId} · ${alert.status}`,
        href: `/alerts?alert=${alert.id}`,
        severity: alert.severity,
      });
    }

    for (const eventId of incident.eventIds) {
      const event = events.find((item) => item.id === eventId);
      if (!event) continue;
      result.push({
        id: `event-row-${event.id}`,
        timestamp: event.timestamp,
        kind: "event",
        title: event.description,
        description: `${event.eventType.replaceAll("_", " ")} · ${event.id}`,
        href: `/events?event=${event.id}`,
        severity: event.severity,
      });
    }

    return result
      .filter((row) => filter === "all" || row.kind === filter)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [incident, alerts, events, filter]);

  const submitNote = async () => {
    if (!note.trim()) return;
    setSaving(true);
    const updated = await addNote(incident, note);
    setSaving(false);
    if (updated) setNote("");
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
        <label
          htmlFor="timeline-note"
          className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--subtle)]"
        >
          Add timeline note
        </label>
        <div className="flex gap-2">
          <Textarea
            id="timeline-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Document an observation, decision, or handoff…"
            className="min-h-[56px] text-xs"
          />
          <Button
            size="icon"
            className="h-[56px]"
            disabled={!note.trim() || saving}
            onClick={() => void submitNote()}
            aria-label="Add note to timeline"
          >
            <Send />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {(
          [
            ["all", "All activity"],
            ["events", "Telemetry"],
            ["alerts", "Alerts"],
            ["analyst", "Analyst actions"],
          ] as [Filter, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={cn(
              "rounded px-2 py-1 text-[10px] transition-colors",
              filter === value
                ? "bg-[var(--surface-2)] text-[var(--foreground)]"
                : "text-[var(--subtle)] hover:text-[var(--foreground)]"
            )}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto font-mono text-[9px] text-[var(--subtle)]">
          {rows.length} entries
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <EmptyState
            icon={<StickyNote className="size-4" />}
            title="Nothing on the timeline yet"
            description="Add a note or link evidence events to build the investigation record."
          />
        </div>
      ) : (
        <ol className="relative space-y-0 border-l border-[var(--border)] pl-4">
          {rows.map((row) => (
            <li key={row.id} className="relative pb-4 last:pb-0">
              <span className="absolute -left-[22px] top-1 flex size-3 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)]">
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    row.kind === "alert"
                      ? "bg-[var(--sev-high)]"
                      : row.kind === "event"
                        ? "bg-[var(--accent)]"
                        : "bg-[var(--secondary-accent)]"
                  )}
                />
              </span>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[9px] text-[var(--subtle)]">
                    {formatShortDateTime(row.timestamp)}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--subtle)]">
                    {row.kind === "analyst" ? (
                      <span className="inline-flex items-center gap-1">
                        <UserRound className="size-2.5" /> analyst
                      </span>
                    ) : row.kind === "alert" ? (
                      <span className="inline-flex items-center gap-1">
                        <BellRing className="size-2.5" /> alert
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <FileText className="size-2.5" /> telemetry
                      </span>
                    )}
                  </span>
                  <span className="ml-auto text-[9px] text-[var(--subtle)]">
                    {relativeTime(row.timestamp)}
                  </span>
                </div>
                <p className="mt-1 text-[11px] font-medium text-[var(--foreground)]">
                  {row.href ? (
                    <Link href={row.href} className="hover:text-[var(--accent)]">
                      {row.title}
                    </Link>
                  ) : (
                    row.title
                  )}
                </p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--muted)]">
                  {row.description}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  {row.severity && (
                    <SeverityBadge severity={row.severity} withIcon={false} />
                  )}
                  {row.actor && (
                    <span className="font-mono text-[9px] text-[var(--subtle)]">
                      by {row.actor}
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
