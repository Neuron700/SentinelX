"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BellRing,
  Check,
  CircleCheck,
  CircleX,
  ExternalLink,
  FileText,
  Fingerprint,
  FolderPlus,
  Send,
  Server,
  ShieldAlert,
  UserRoundPlus,
} from "lucide-react";
import type { Alert } from "@/domain/models/alert";
import { ALERT_ACTION_LABELS, ALERT_TRANSITIONS } from "@/domain/models/alert";
import { Drawer, Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea, Select } from "@/components/ui/input";
import { SeverityBadge, StatusBadge } from "@/components/ui/severity-badge";
import { useAlertActions } from "./use-alert-actions";
import {
  useLiveAssets,
  useLiveEvents,
  useLiveIncidents,
  useLiveRules,
} from "@/hooks/use-live-data";
import { formatShortDateTime, formatTimestamp, relativeTime } from "@/lib/time/time";

const RESOLUTION_OPTIONS = [
  "True positive — contained",
  "True positive — remediated",
  "Benign / expected activity",
  "False positive — tuning required",
];

export function AlertDetailDrawer({
  alert,
  onClose,
}: {
  alert: Alert | null;
  onClose: () => void;
}) {
  const events = useLiveEvents();
  const assets = useLiveAssets();
  const rules = useLiveRules();
  const incidents = useLiveIncidents();
  const { transition, assignToMe, addNote, promoteToIncident } = useAlertActions();

  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);
  const [resolutionOpen, setResolutionOpen] = React.useState<
    "resolved" | "dismissed" | null
  >(null);
  const [resolution, setResolution] = React.useState(RESOLUTION_OPTIONS[0]);

  React.useEffect(() => {
    setNote("");
    setResolutionOpen(null);
  }, [alert?.id]);

  if (!alert) return null;

  const rule = rules.find((r) => r.id === alert.ruleId);
  const incident = incidents.find((i) => i.id === alert.incidentId);
  const evidence = events
    .filter((event) => alert.relatedEventIds.includes(event.id))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const relatedAssets = assets.filter((asset) =>
    alert.relatedAssetIds.includes(asset.id)
  );

  const run = async (key: string, action: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await action();
    } finally {
      setBusy(null);
    }
  };

  const nextStatuses = ALERT_TRANSITIONS[alert.status];

  return (
    <>
      <Drawer
        open={Boolean(alert)}
        onClose={onClose}
        title={
          <span className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-[var(--sev-high)]" />
            <span>{alert.title}</span>
          </span>
        }
        subtitle={
          <span className="font-mono">
            {alert.id} · first seen {formatTimestamp(alert.firstSeen)} ·{" "}
            {relativeTime(alert.firstSeen)}
          </span>
        }
        width="max-w-2xl"
      >
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={alert.severity} />
            <StatusBadge kind="alert" status={alert.status} />
            <span className="rounded border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[10px] text-[var(--muted)]">
              confidence {alert.confidence}%
            </span>
            {incident && (
              <Link
                href={`/incidents/${incident.id}`}
                className="rounded border border-[color-mix(in_srgb,var(--accent)_35%,transparent)] px-2 py-0.5 font-mono text-[10px] text-[var(--accent)] hover:underline"
              >
                {incident.id}
              </Link>
            )}
          </div>

          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--subtle)]">
                  Detection rule
                </p>
                <p className="mt-0.5 text-xs">
                  {rule ? (
                    <Link
                      href={`/rules?rule=${rule.id}`}
                      className="hover:text-[var(--accent)]"
                    >
                      {rule.name}
                    </Link>
                  ) : (
                    alert.ruleId
                  )}
                </p>
                <p className="mt-0.5 font-mono text-[9px] text-[var(--subtle)]">
                  {alert.ruleId} · last seen{" "}
                  {formatShortDateTime(alert.lastSeen)}
                </p>
              </div>
              <div className="flex gap-1.5">
                {nextStatuses.map((next) => {
                  const label = ALERT_ACTION_LABELS[`${alert.status}->${next}`];
                  const isTerminal = next === "resolved" || next === "dismissed";
                  return (
                    <Button
                      key={next}
                      size="sm"
                      variant={
                        next === "in_review"
                          ? "primary"
                          : next === "escalated"
                            ? "secondary"
                            : "ghost"
                      }
                      disabled={busy !== null}
                      onClick={() => {
                        if (isTerminal) {
                          setResolution(
                            next === "dismissed"
                              ? RESOLUTION_OPTIONS[3]
                              : RESOLUTION_OPTIONS[0]
                          );
                          setResolutionOpen(next);
                        } else {
                          void run(next, () => transition(alert, next));
                        }
                      }}
                    >
                      {next === "in_review" && <Check />}
                      {next === "escalated" && <ArrowUpRight />}
                      {next === "resolved" && <CircleCheck />}
                      {next === "dismissed" && <CircleX />}
                      {label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </section>

          <div className="flex flex-wrap gap-2">
            {!alert.assignedTo && (
              <Button
                variant="secondary"
                size="sm"
                disabled={busy !== null}
                onClick={() => void run("assign", () => assignToMe(alert))}
              >
                <UserRoundPlus /> Assign to me
              </Button>
            )}
            {!alert.incidentId ? (
              <Button
                variant="secondary"
                size="sm"
                disabled={busy !== null}
                onClick={() =>
                  void run("incident", async () => {
                    const created = await promoteToIncident(alert);
                    if (created) {
                      window.setTimeout(() => {
                        /* live query updates the drawer */
                      }, 0);
                    }
                  })
                }
              >
                <FolderPlus /> Create incident
              </Button>
            ) : (
              <Button asChild variant="secondary" size="sm">
                <Link href={`/incidents/${alert.incidentId}`}>
                  <ExternalLink /> Open incident {alert.incidentId}
                </Link>
              </Button>
            )}
            <Button asChild variant="ghost" size="sm">
              <Link href={`/events?severity=${alert.severity}`}>
                <FileText /> Open in event explorer
              </Link>
            </Button>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
            <Field label="Assigned to">
              <span className="font-mono text-[10px]">
                {alert.assignedTo ?? "unassigned"}
              </span>
            </Field>
            <Field label="Acknowledged">
              <span className="font-mono text-[10px]">
                {alert.acknowledgedAt
                  ? formatShortDateTime(alert.acknowledgedAt)
                  : "—"}
              </span>
            </Field>
            <Field label="Resolved">
              <span className="font-mono text-[10px]">
                {alert.resolvedAt ? formatShortDateTime(alert.resolvedAt) : "—"}
              </span>
            </Field>
            <Field label="Resolution">
              <span className="text-[11px]">
                {alert.resolution ?? "—"}
              </span>
            </Field>
          </dl>

          <section>
            <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--subtle)]">
              <Fingerprint className="size-3" /> Related assets
            </h3>
            {relatedAssets.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[var(--border)] px-3 py-3 text-center text-[11px] text-[var(--subtle)]">
                No assets linked to this alert.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {relatedAssets.map((asset) => (
                  <Link
                    key={asset.id}
                    href={`/assets?asset=${asset.id}`}
                    className="inline-flex items-center gap-1 rounded border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 font-mono text-[10px] text-[var(--muted)] hover:border-[var(--border-hover)] hover:text-[var(--foreground)]"
                  >
                    <Server className="size-3" />
                    {asset.name}
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--subtle)]">
              <span>Evidence events ({evidence.length})</span>
              <Link
                href={`/events?severity=${alert.severity}`}
                className="font-normal text-[var(--accent)] normal-case tracking-normal hover:underline"
              >
                open all events
              </Link>
            </h3>
            {evidence.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[var(--border)] px-3 py-3 text-center text-[11px] text-[var(--subtle)]">
                No evidence events linked.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)]">
                {evidence.slice(0, 6).map((event) => (
                  <li key={event.id}>
                    <Link
                      href={`/events?event=${event.id}`}
                      className="flex items-center gap-2 px-2.5 py-2 transition-colors hover:bg-[var(--surface-2)]"
                    >
                      <SeverityBadge
                        severity={event.severity}
                        withIcon={false}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px]">
                          {event.description}
                        </span>
                        <span className="font-mono text-[9px] text-[var(--subtle)]">
                          {event.id} · {formatShortDateTime(event.timestamp)}
                        </span>
                      </span>
                      <ExternalLink className="size-3 text-[var(--subtle)]" />
                    </Link>
                  </li>
                ))}
                {evidence.length > 6 && (
                  <li className="px-2.5 py-2 text-center text-[10px] text-[var(--subtle)]">
                    +{evidence.length - 6} more linked events
                  </li>
                )}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--subtle)]">
              <BellRing className="size-3" /> Analyst notes
            </h3>
            {alert.notes.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[var(--border)] px-3 py-3 text-center text-[11px] text-[var(--subtle)]">
                No notes yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {[...alert.notes].reverse().map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] text-[var(--accent)]">
                        {entry.author}
                      </span>
                      <span className="font-mono text-[9px] text-[var(--subtle)]">
                        {formatShortDateTime(entry.timestamp)}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-[var(--muted)]">
                      {entry.content}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-2 flex gap-2">
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add an investigation note…"
                className="min-h-[60px] text-xs"
                aria-label="New alert note"
              />
              <Button
                size="icon"
                className="h-[60px]"
                disabled={!note.trim() || busy !== null}
                onClick={() =>
                  void run("note", async () => {
                    const updated = await addNote(alert, note);
                    if (updated) setNote("");
                  })
                }
                aria-label="Add note"
              >
                <Send />
              </Button>
            </div>
          </section>

          <p className="text-[10px] leading-relaxed text-[var(--subtle)]">
            State transitions follow the alert workflow: new → in review →
            escalated → resolved or dismissed. Terminal alerts cannot be
            reopened; create an incident for post-resolution tracking.
          </p>
        </div>
      </Drawer>

      <Dialog
        open={resolutionOpen !== null}
        onClose={() => setResolutionOpen(null)}
        title={
          resolutionOpen === "dismissed"
            ? "Dismiss alert"
            : "Resolve alert"
        }
        description={
          resolutionOpen === "dismissed"
            ? "Record why this alert is being dismissed. This action is audited."
            : "Record the resolution outcome. This action is audited."
        }
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setResolutionOpen(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant={resolutionOpen === "dismissed" ? "danger" : "primary"}
              disabled={busy !== null}
              onClick={() =>
                void run("resolution", async () => {
                  if (!resolutionOpen) return;
                  const result = await transition(alert, resolutionOpen, {
                    resolution,
                  });
                  if (result) setResolutionOpen(null);
                })
              }
            >
              {resolutionOpen === "dismissed" ? "Dismiss" : "Resolve"} alert
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label
              htmlFor="resolution-option"
              className="mb-1.5 block text-xs font-medium text-[var(--muted)]"
            >
              Resolution
            </label>
            <Select
              id="resolution-option"
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
            >
              {RESOLUTION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
          <p className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-2.5 text-[11px] text-[var(--muted)]">
            {alert.id} — {alert.title}
          </p>
        </div>
      </Dialog>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--subtle)]">
        {label}
      </dt>
      <dd className="mt-0.5 text-[var(--muted)]">{children}</dd>
    </div>
  );
}
