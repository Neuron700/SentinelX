"use client";

import Link from "next/link";
import { Copy, ExternalLink, Network, Server, ShieldAlert } from "lucide-react";
import type { SecurityEvent } from "@/domain/models/event";
import type { Alert } from "@/domain/models/alert";
import type { Asset } from "@/domain/models/asset";
import { Drawer } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { useLiveScenarios } from "@/hooks/use-live-data";
import { formatTimestamp } from "@/lib/time/time";
import { toast } from "sonner";

export function EventDetailDrawer({
  event,
  alerts,
  assets,
  onClose,
}: {
  event: SecurityEvent | null;
  alerts: Alert[];
  assets: Asset[];
  onClose: () => void;
}) {
  const scenarios = useLiveScenarios();
  if (!event) return null;

  const source = assets.find((a) => a.id === event.sourceHostId);
  const destination = assets.find((a) => a.id === event.destinationHostId);
  const scenario = scenarios.find((s) => s.id === event.scenarioId);

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(event.id);
      toast.success("Event ID copied");
    } catch {
      toast.error("Clipboard unavailable in this browser");
    }
  };

  return (
    <Drawer
      open={Boolean(event)}
      onClose={onClose}
      title={event.description}
      subtitle={
        <span className="font-mono">
          {event.id} · {formatTimestamp(event.timestamp)}
        </span>
      }
      width="max-w-2xl"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={event.severity} />
          <span className="rounded border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--muted)]">
            {event.eventType.replaceAll("_", " ")}
          </span>
          {scenario && (
            <Link
              href="/scenarios"
              className="rounded border border-[color-mix(in_srgb,var(--secondary-accent)_40%,transparent)] px-2 py-0.5 text-[10px] text-[var(--secondary-accent)] hover:underline"
            >
              scenario · {scenario.title}
            </Link>
          )}
          <Button variant="ghost" size="sm" className="ml-auto" onClick={copyId}>
            <Copy /> Copy ID
          </Button>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs">
          <Field label="Source host">
            {source ? (
              <Link
                href={`/assets?asset=${source.id}`}
                className="inline-flex items-center gap-1 text-[var(--foreground)] hover:text-[var(--accent)]"
              >
                <Server className="size-3 text-[var(--subtle)]" />
                {source.name}
              </Link>
            ) : (
              <Mono>{event.sourceHostId ?? "—"}</Mono>
            )}
          </Field>
          <Field label="Destination host">
            {destination ? (
              <Link
                href={`/assets?asset=${destination.id}`}
                className="inline-flex items-center gap-1 text-[var(--foreground)] hover:text-[var(--accent)]"
              >
                <Server className="size-3 text-[var(--subtle)]" />
                {destination.name}
              </Link>
            ) : (
              <Mono>{event.destinationHostId ?? "—"}</Mono>
            )}
          </Field>
          <Field label="Source IP">
            <Mono>{event.sourceIp ?? "—"}</Mono>
          </Field>
          <Field label="Destination IP">
            <Mono>{event.destinationIp ?? "—"}</Mono>
          </Field>
          <Field label="User">
            <Mono>{event.userId ?? "—"}</Mono>
          </Field>
          <Field label="Related alerts">
            {event.relatedAlertIds.length > 0 ? (
              <span className="text-[var(--sev-high)]">
                {event.relatedAlertIds.length} linked
              </span>
            ) : (
              <Mono>none</Mono>
            )}
          </Field>
        </dl>

        {event.details && Object.keys(event.details).length > 0 && (
          <section>
            <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--subtle)]">
              Detection fields
            </h3>
            <dl className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
              {Object.entries(event.details).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-start justify-between gap-4 px-3 py-1.5"
                >
                  <dt className="font-mono text-[10px] text-[var(--subtle)]">
                    {key}
                  </dt>
                  <dd className="max-w-[60%] truncate text-right font-mono text-[10px] text-[var(--muted)]">
                    {typeof value === "object"
                      ? JSON.stringify(value)
                      : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <section>
          <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--subtle)]">
            Linked alerts
          </h3>
          {alerts.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[var(--border)] px-3 py-4 text-center text-[11px] text-[var(--subtle)]">
              No alert references this event.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {alerts.map((alert) => (
                <li key={alert.id}>
                  <Link
                    href={`/alerts?alert=${alert.id}`}
                    className="flex items-center gap-2 rounded-md border border-[var(--border)] px-2.5 py-2 transition-colors hover:border-[var(--border-hover)] hover:bg-[var(--surface-2)]"
                  >
                    <ShieldAlert className="size-3.5 text-[var(--sev-high)]" />
                    <span className="min-w-0 flex-1 truncate text-[11px]">
                      {alert.title}
                    </span>
                    <SeverityBadge severity={alert.severity} withIcon={false} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--subtle)]">
            Raw record
          </h3>
          <pre className="max-h-72 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 font-mono text-[10px] leading-relaxed text-[var(--muted)]">
            {JSON.stringify(event, null, 2)}
          </pre>
        </section>

        <div className="flex flex-wrap gap-2">
          {event.sourceHostId && (
            <Button asChild variant="secondary" size="sm">
              <Link href={`/assets?asset=${event.sourceHostId}`}>
                <Server /> Open source asset
              </Link>
            </Button>
          )}
          <Button asChild variant="secondary" size="sm">
            <Link
              href={`/network${event.sourceHostId ? `?entity=${event.sourceHostId}` : ""}`}
            >
              <Network /> View in graph
            </Link>
          </Button>
        </div>

        <p className="flex items-center gap-1.5 text-[10px] text-[var(--subtle)]">
          <ExternalLink className="size-3" />
          Synthetic record stored locally in IndexedDB. It is not evidence from a
          real environment.
        </p>
      </div>
    </Drawer>
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
      <dd className="mt-0.5 text-[11px] text-[var(--muted)]">{children}</dd>
    </div>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-[10px]">{children}</span>;
}
