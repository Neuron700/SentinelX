"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock3,
  Download,
  FileSearch,
  FolderX,
  History,
  Network,
  Server,
  ShieldCheck,
  UserRoundPlus,
} from "lucide-react";
import type { IncidentStatus } from "@/domain/models/common";
import { INCIDENT_TRANSITIONS } from "@/domain/models/incident";
import { PageHeader } from "@/components/ui/kpi-card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Label, Select, Textarea } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SeverityBadge, StatusBadge } from "@/components/ui/severity-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { IncidentTimeline } from "./incident-timeline";
import { IncidentFindings } from "./incident-findings";
import { IncidentPlaybook } from "./incident-playbook";
import { useIncidentActions } from "./use-incident-actions";
import {
  useLiveAlerts,
  useLiveAssets,
  useLiveEvents,
  useLiveIncidents,
  useLivePlaybooks,
} from "@/hooks/use-live-data";
import { useSettingsStore } from "@/store/settings-store";
import {
  formatDuration,
  formatShortDateTime,
  formatTimestamp,
  relativeTime,
} from "@/lib/time/time";
import { downloadJson, timestampedFilename } from "@/lib/export/download";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";

const STATUS_ACTION_LABELS: Record<IncidentStatus, string> = {
  open: "Reopen",
  investigating: "Start investigation",
  contained: "Mark contained",
  resolved: "Resolve",
  closed: "Close",
};

const CLOSE_REASONS = [
  "Resolved and verified",
  "Duplicate of another incident",
  "False positive",
  "Accepted risk",
  "Other",
];

export function IncidentWorkspace({ id }: { id: string }) {
  const incidents = useLiveIncidents();
  const alerts = useLiveAlerts();
  const events = useLiveEvents();
  const assets = useLiveAssets();
  const playbooks = useLivePlaybooks();
  const analyst = useSettingsStore((s) => s.analystName);
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTab = ["overview", "timeline", "findings", "playbook"].includes(
    requestedTab ?? ""
  )
    ? (requestedTab as string)
    : "overview";
  const { transition, assignToMe } = useIncidentActions();

  const [dialog, setDialog] = React.useState<"resolved" | "closed" | null>(null);
  const [summary, setSummary] = React.useState("");
  const [closeReason, setCloseReason] = React.useState(CLOSE_REASONS[0]);
  const [busy, setBusy] = React.useState(false);

  const incident = incidents.find((item) => item.id === id);

  if (!incident) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <EmptyState
          icon={<FolderX className="size-4" />}
          title="Incident not found"
          description={`No incident with ID ${id} exists in the local dataset. It may have been removed by a demo reset.`}
        />
        <div className="flex justify-center pb-6">
          <Button asChild variant="secondary" size="sm">
            <Link href="/incidents">
              <ArrowLeft /> Back to incidents
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const linkedAlerts = alerts.filter((alert) =>
    incident.alertIds.includes(alert.id)
  );
  const linkedAssets = assets.filter((asset) =>
    incident.assetIds.includes(asset.id)
  );
  const playbook = playbooks.find((item) => item.id === incident.playbookId);
  const isActive =
    incident.status !== "resolved" && incident.status !== "closed";
  const openMs =
    new Date(isActive ? new Date().toISOString() : incident.updatedAt).getTime() -
    new Date(incident.createdAt).getTime();
  const nextStatuses = INCIDENT_TRANSITIONS[incident.status];

  const runTransition = async (next: IncidentStatus) => {
    setBusy(true);
    await transition(incident, next);
    setBusy(false);
  };

  const confirmDialog = async () => {
    if (!dialog) return;
    setBusy(true);
    const updated = await transition(
      incident,
      dialog,
      dialog === "resolved"
        ? { resolutionSummary: summary }
        : { closedReason: `${closeReason}${summary ? ` — ${summary}` : ""}` }
    );
    setBusy(false);
    if (updated) {
      setDialog(null);
      setSummary("");
    }
  };

  const exportReport = () => {
    downloadJson(timestampedFilename(`sentinelx-${incident.id}`, "json"), {
      exportedAt: new Date().toISOString(),
      note: "Synthetic demo incident. Not production evidence.",
      incident,
      alerts: linkedAlerts,
      assets: linkedAssets,
      events: events.filter((event) => incident.eventIds.includes(event.id)),
      playbook: playbook ?? null,
    });
    toast.success("Incident exported", {
      description: "JSON bundle includes alerts, evidence, and playbook.",
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[10px] text-[var(--subtle)]">
        <Link
          href="/incidents"
          className="inline-flex items-center gap-1 hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="size-3" /> Incidents
        </Link>
        <span>/</span>
        <span className="font-mono">{incident.id}</span>
      </div>

      <PageHeader
        eyebrow={`Incident workspace · ${incident.id}`}
        title={incident.title}
        description={incident.description}
        actions={
          <>
            {incident.assignedTo !== analyst && (
              <Button
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => void assignToMe(incident)}
              >
                <UserRoundPlus /> Assign to me
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={exportReport}>
              <Download /> Export
            </Button>
            {nextStatuses
              .filter((next) => next !== "resolved" && next !== "closed")
              .map((next) => (
                <Button
                  key={next}
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void runTransition(next)}
                >
                  {STATUS_ACTION_LABELS[next]}
                </Button>
              ))}
            {nextStatuses.includes("resolved") && (
              <Button
                size="sm"
                variant="primary"
                disabled={busy}
                onClick={() => {
                  setSummary(incident.resolutionSummary ?? "");
                  setDialog("resolved");
                }}
              >
                <CheckCircle2 /> Resolve
              </Button>
            )}
            {nextStatuses.includes("closed") && (
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setSummary("");
                  setDialog("closed");
                }}
              >
                Close
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={incident.severity} />
        <StatusBadge kind="incident" status={incident.status} />
        <span className="font-mono text-[10px] text-[var(--subtle)]">
          opened {formatShortDateTime(incident.createdAt)} ·{" "}
          {isActive ? "open for" : "closed after"} {formatDuration(openMs)}
        </span>
        {incident.falsePositive && (
          <span className="rounded border border-[var(--border)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--subtle)]">
            false positive
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-1 font-mono text-[10px] text-[var(--subtle)]">
          <Clock3 className="size-3" /> updated{" "}
          {relativeTime(incident.updatedAt)}
        </span>
      </div>

      {!isActive && (incident.resolutionSummary || incident.closedReason) && (
        <div className="rounded-lg border border-[color-mix(in_srgb,var(--success)_35%,transparent)] bg-[color-mix(in_srgb,var(--success)_6%,transparent)] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--success)]">
            {incident.status === "closed" ? "Closure record" : "Resolution summary"}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">
            {incident.resolutionSummary || incident.closedReason}
          </p>
        </div>
      )}

      <div className="grid gap-3 xl:grid-cols-[1fr_300px]">
        <Tabs defaultValue={initialTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="timeline" count={incident.timeline.length}>
              Timeline
            </TabsTrigger>
            <TabsTrigger value="findings" count={incident.findings.length}>
              Findings
            </TabsTrigger>
            <TabsTrigger value="playbook" count={playbook?.steps.length}>
              Playbook
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Metric
                  icon={<AlertTriangle />}
                  label="Linked alerts"
                  value={linkedAlerts.length}
                />
                <Metric
                  icon={<FileSearch />}
                  label="Evidence events"
                  value={incident.eventIds.length}
                />
                <Metric
                  icon={<Server />}
                  label="Affected assets"
                  value={linkedAssets.length}
                />
                <Metric
                  icon={<BookOpen />}
                  label="Playbook steps"
                  value={playbook?.steps.length ?? 0}
                />
              </div>

              <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2.5">
                  <h2 className="text-xs font-semibold">Linked alerts</h2>
                  <Link
                    href="/alerts"
                    className="text-[10px] text-[var(--accent)] hover:underline"
                  >
                    alert queue
                  </Link>
                </div>
                {linkedAlerts.length === 0 ? (
                  <p className="px-3 py-4 text-[11px] text-[var(--subtle)]">
                    No alerts linked to this incident.
                  </p>
                ) : (
                  <ul className="divide-y divide-[var(--border)]">
                    {linkedAlerts.map((alert) => (
                      <li key={alert.id}>
                        <Link
                          href={`/alerts?alert=${alert.id}`}
                          className="flex items-center gap-2 px-3 py-2 transition-colors hover:bg-[var(--surface-2)]"
                        >
                          <SeverityBadge
                            severity={alert.severity}
                            withIcon={false}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[11px]">
                              {alert.title}
                            </span>
                            <span className="font-mono text-[9px] text-[var(--subtle)]">
                              {alert.id} · {alert.ruleId}
                            </span>
                          </span>
                          <StatusBadge kind="alert" status={alert.status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                <div className="border-b border-[var(--border)] px-3 py-2.5">
                  <h2 className="text-xs font-semibold">Affected assets</h2>
                </div>
                {linkedAssets.length === 0 ? (
                  <p className="px-3 py-4 text-[11px] text-[var(--subtle)]">
                    No assets linked to this incident.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 p-3">
                    {linkedAssets.map((asset) => (
                      <Link
                        key={asset.id}
                        href={`/assets?asset=${asset.id}`}
                        className="inline-flex items-center gap-1.5 rounded border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 font-mono text-[10px] text-[var(--muted)] hover:border-[var(--border-hover)] hover:text-[var(--foreground)]"
                      >
                        <Server className="size-3 text-[var(--subtle)]" />
                        {asset.name}
                        <span className="text-[8px] uppercase text-[var(--subtle)]">
                          {asset.type.replaceAll("_", " ")}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <ShieldCheck className="size-3.5 text-[var(--accent)]" />
                  <p className="text-[11px] text-[var(--muted)]">
                    Correlate incident entities across the environment.
                  </p>
                  <div className="ml-auto flex gap-2">
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/network?entity=${incident.id}`}>
                        <Network /> Open graph
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm">
                      <Link
                        href={`/events?severity=${incident.severity}`}
                      >
                        <History /> Related events
                      </Link>
                    </Button>
                  </div>
                </div>
              </section>
            </div>
          </TabsContent>

          <TabsContent value="timeline">
            <IncidentTimeline
              incident={incident}
              alerts={alerts}
              events={events}
            />
          </TabsContent>

          <TabsContent value="findings">
            <IncidentFindings incident={incident} events={events} />
          </TabsContent>

          <TabsContent value="playbook">
            <IncidentPlaybook incident={incident} />
          </TabsContent>
        </Tabs>

        <aside className="space-y-3">
          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            <h2 className="border-b border-[var(--border)] px-3 py-2.5 text-xs font-semibold">
              Case details
            </h2>
            <dl className="space-y-2 p-3">
              <MetaRow label="Incident ID" value={incident.id} mono />
              <MetaRow label="Severity" value={incident.severity} />
              <MetaRow label="Status" value={incident.status} />
              <MetaRow
                label="Assignee"
                value={incident.assignedTo ?? "unassigned"}
                mono
              />
              <MetaRow
                label="Created"
                value={formatTimestamp(incident.createdAt)}
                mono
              />
              <MetaRow
                label="Updated"
                value={formatTimestamp(incident.updatedAt)}
                mono
              />
              <MetaRow
                label="Playbook"
                value={playbook?.name ?? "none attached"}
              />
            </dl>
          </section>

          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
            <h2 className="text-xs font-semibold">Audit trail</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">
              Status changes, notes, findings, and playbook progress are recorded
              with the analyst name from local settings.
            </p>
            <Button asChild variant="secondary" size="sm" className="mt-2">
              <Link href="/audit">
                <History /> View workspace audit
              </Link>
            </Button>
          </section>

          <p className="rounded-lg border border-dashed border-[var(--border)] px-3 py-2.5 text-[10px] leading-relaxed text-[var(--subtle)]">
            Response actions are simulated. &quot;Contained&quot; changes case
            state only; no endpoint isolation or firewall changes occur.
          </p>
        </aside>
      </div>

      <Dialog
        open={dialog !== null}
        onClose={() => setDialog(null)}
        title={dialog === "resolved" ? "Resolve incident" : "Close incident"}
        description={
          dialog === "resolved"
            ? "Summarize what was contained or remediated. This is required for resolution."
            : "Record the closure reason for the audit trail."
        }
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={
                busy ||
                (dialog === "resolved" && !summary.trim())
              }
              onClick={() => void confirmDialog()}
            >
              {dialog === "resolved" ? "Resolve" : "Close"} incident
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {dialog === "closed" && (
            <div>
              <Label htmlFor="close-reason">Closure reason</Label>
              <Select
                id="close-reason"
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
              >
                {CLOSE_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div>
            <Label htmlFor="incident-summary">
              {dialog === "resolved" ? "Resolution summary" : "Notes (optional)"}
            </Label>
            <Textarea
              id="incident-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder={
                dialog === "resolved"
                  ? "e.g. Malicious host isolated in simulation, credentials reset, and monitoring heightened for 24h."
                  : "Additional closure notes…"
              }
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
      <span className="flex size-7 items-center justify-center rounded border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] [&_svg]:size-3.5">
        {icon}
      </span>
      <p className="mt-2 font-mono text-xl leading-none">{value}</p>
      <p className="mt-1 text-[9px] uppercase tracking-[0.1em] text-[var(--subtle)]">
        {label}
      </p>
    </div>
  );
}

function MetaRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--subtle)]">
        {label}
      </dt>
      <dd
        className={cn(
          "max-w-[62%] break-words text-right text-[10px] capitalize text-[var(--muted)]",
          mono && "font-mono capitalize-none normal-case"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
