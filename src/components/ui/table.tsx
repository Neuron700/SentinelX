"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { useSettingsStore } from "@/store/settings-store";

export function TableShell({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const density = useSettingsStore((s) => s.tableDensity);
  return (
    <div
      data-density={density}
      className={cn(
        "overflow-auto rounded-lg border border-[var(--border)]",
        className
      )}
    >
      <table className="w-full border-collapse text-left text-sm">
        {children}
      </table>
    </div>
  );
}

export function Th({
  className,
  children,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "sticky top-0 z-10 whitespace-nowrap border-b border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]",
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function Td({
  className,
  children,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        "border-b border-[var(--border)] px-3 py-2 align-middle text-[var(--foreground)]",
        className
      )}
      {...props}
    >
      {children}
    </td>
  );
}
