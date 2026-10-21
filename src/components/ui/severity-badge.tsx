import * as React from "react";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Info,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Severity, AlertStatus, IncidentStatus } from "@/domain/models/common";

const severityConfig: Record<
  Severity,
  { label: string; icon: React.ReactNode; className: string }
> = {
  critical: {
    label: "Critical",
    icon: <AlertOctagon />,
    className:
      "border-[color-mix(in_srgb,var(--sev-critical)_45%,transparent)] bg-[color-mix(in_srgb,var(--sev-critical)_14%,transparent)] text-[var(--sev-critical)]",
  },
  high: {
    label: "High",
    icon: <ShieldAlert />,
    className:
      "border-[color-mix(in_srgb,var(--sev-high)_45%,transparent)] bg-[color-mix(in_srgb,var(--sev-high)_14%,transparent)] text-[var(--sev-high)]",
  },
  medium: {
    label: "Medium",
    icon: <AlertTriangle />,
    className:
      "border-[color-mix(in_srgb,var(--sev-medium)_45%,transparent)] bg-[color-mix(in_srgb,var(--sev-medium)_14%,transparent)] text-[var(--sev-medium)]",
  },
  low: {
    label: "Low",
    icon: <ArrowDown />,
    className:
      "border-[color-mix(in_srgb,var(--sev-low)_45%,transparent)] bg-[color-mix(in_srgb,var(--sev-low)_14%,transparent)] text-[var(--sev-low)]",
  },
  info: {
    label: "Info",
    icon: <Info />,
    className:
      "border-[color-mix(in_srgb,var(--sev-info)_45%,transparent)] bg-[color-mix(in_srgb,var(--sev-info)_14%,transparent)] text-[var(--sev-info)]",
  },
};

export function SeverityBadge({
  severity,
  className,
  withIcon = true,
}: {
  severity: Severity;
  className?: string;
  withIcon?: boolean;
}) {
  const config = severityConfig[severity];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.04em] [&_svg]:size-3",
        config.className,
        className
      )}
      title={`Severity: ${config.label}`}
    >
      {withIcon && config.icon}
      {config.label}
    </span>
  );
}

const alertStatusConfig: Record<
  AlertStatus,
  { label: string; className: string }
> = {
  new: {
    label: "New",
    className:
      "border-[color-mix(in_srgb,var(--accent)_40%,transparent)] text-[var(--accent)]",
  },
  in_review: {
    label: "In Review",
    className:
      "border-[color-mix(in_srgb,var(--warning)_40%,transparent)] text-[var(--warning)]",
  },
  escalated: {
    label: "Escalated",
    className:
      "border-[color-mix(in_srgb,var(--sev-high)_40%,transparent)] text-[var(--sev-high)]",
  },
  resolved: {
    label: "Resolved",
    className:
      "border-[color-mix(in_srgb,var(--success)_40%,transparent)] text-[var(--success)]",
  },
  dismissed: {
    label: "Dismissed",
    className: "border-[var(--border)] text-[var(--subtle)]",
  },
};

const incidentStatusConfig: Record<
  IncidentStatus,
  { label: string; className: string }
> = {
  open: {
    label: "Open",
    className:
      "border-[color-mix(in_srgb,var(--accent)_40%,transparent)] text-[var(--accent)]",
  },
  investigating: {
    label: "Investigating",
    className:
      "border-[color-mix(in_srgb,var(--warning)_40%,transparent)] text-[var(--warning)]",
  },
  contained: {
    label: "Contained (sim)",
    className:
      "border-[color-mix(in_srgb,var(--secondary-accent)_40%,transparent)] text-[var(--secondary-accent)]",
  },
  resolved: {
    label: "Resolved",
    className:
      "border-[color-mix(in_srgb,var(--success)_40%,transparent)] text-[var(--success)]",
  },
  closed: {
    label: "Closed",
    className: "border-[var(--border)] text-[var(--subtle)]",
  },
};

export function StatusBadge({
  kind,
  status,
  className,
}: {
  kind: "alert" | "incident";
  status: AlertStatus | IncidentStatus;
  className?: string;
}) {
  const config =
    kind === "alert"
      ? alertStatusConfig[status as AlertStatus]
      : incidentStatusConfig[status as IncidentStatus];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}

export function RiskBadge({ score }: { score: number }) {
  const tone =
    score >= 80
      ? "text-[var(--sev-critical)] border-[color-mix(in_srgb,var(--sev-critical)_45%,transparent)]"
      : score >= 60
        ? "text-[var(--sev-high)] border-[color-mix(in_srgb,var(--sev-high)_45%,transparent)]"
        : score >= 40
          ? "text-[var(--sev-medium)] border-[color-mix(in_srgb,var(--sev-medium)_45%,transparent)]"
          : "text-[var(--sev-low)] border-[color-mix(in_srgb,var(--sev-low)_45%,transparent)]";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums",
        tone
      )}
    >
      {score}
      <ArrowUp className="size-3" aria-hidden />
    </span>
  );
}
