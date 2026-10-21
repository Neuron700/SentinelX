"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Tooltip } from "@/components/ui/tooltip";

export function KpiCard({
  label,
  value,
  hint,
  icon,
  href,
  delta,
  tone = "default",
  suffix,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
  href?: string;
  delta?: { value: string; direction: "up" | "down"; good?: boolean };
  tone?: "default" | "critical" | "accent";
  suffix?: string;
}) {
  const inner = (
    <div
      className={cn(
        "group relative flex h-full flex-col justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors",
        href && "hover:border-[var(--border-hover)]"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
          {label}
          {hint && (
            <Tooltip content={hint}>
              <span
                aria-label={`About ${label}`}
                className="inline-flex size-3.5 cursor-help items-center justify-center rounded-full border border-[var(--border)] text-[9px] font-bold text-[var(--subtle)]"
              >
                ?
              </span>
            </Tooltip>
          )}
        </div>
        {icon && (
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] [&_svg]:size-3.5",
              tone === "critical" && "text-[var(--sev-critical)]",
              tone === "accent" && "text-[var(--accent)]"
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-2">
        <p
          className={cn(
            "font-mono text-2xl font-semibold tabular-nums tracking-tight text-[var(--foreground)]",
            tone === "critical" && "text-[var(--sev-critical)]"
          )}
        >
          {value}
          {suffix && (
            <span className="ml-1 text-xs font-normal text-[var(--muted)]">
              {suffix}
            </span>
          )}
        </p>
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[11px] font-medium",
              delta.good
                ? "text-[var(--success)]"
                : "text-[var(--sev-high)]"
            )}
          >
            {delta.direction === "up" ? (
              <ArrowUpRight className="size-3" />
            ) : (
              <ArrowDownRight className="size-3" />
            )}
            {delta.value}
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full rounded-lg">
        {inner}
      </Link>
    );
  }
  return inner;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 pb-4 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--accent)]">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-[var(--foreground)]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--muted)]">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
