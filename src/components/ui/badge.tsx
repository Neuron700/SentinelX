import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function Badge({
  className,
  tone = "neutral",
  children,
}: {
  className?: string;
  tone?: "neutral" | "accent" | "success" | "warning" | "danger" | "violet";
  children: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    neutral:
      "border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]",
    accent:
      "border-[color-mix(in_srgb,var(--accent)_40%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)]",
    success:
      "border-[color-mix(in_srgb,var(--success)_40%,transparent)] bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]",
    warning:
      "border-[color-mix(in_srgb,var(--warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] text-[var(--warning)]",
    danger:
      "border-[color-mix(in_srgb,var(--danger)_40%,transparent)] bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]",
    violet:
      "border-[color-mix(in_srgb,var(--secondary-accent)_40%,transparent)] bg-[color-mix(in_srgb,var(--secondary-accent)_12%,transparent)] text-[var(--secondary-accent)]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
