"use client";

import { useState } from "react";
import Link from "next/link";
import { Database, FlaskConical, RotateCcw } from "lucide-react";
import { ResetDemoDialog } from "./reset-demo-dialog";

export function DemoBanner() {
  const [resetOpen, setResetOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--accent)_5%,var(--background))] px-3 py-1.5 text-[11px] lg:px-4">
      <span className="inline-flex items-center gap-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
        <Database className="size-3" />
        Synthetic demo data
      </span>
      <span className="text-[var(--muted)]">
        All events, alerts, assets, and indicators are fictional. No live systems,
        connectors, or offensive tooling are used.
      </span>
      <div className="ml-auto flex items-center gap-3">
        <Link
          href="/scenarios"
          className="inline-flex items-center gap-1 text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          <FlaskConical className="size-3" />
          Run a scenario
        </Link>
        <button
          type="button"
          onClick={() => setResetOpen(true)}
          className="inline-flex items-center gap-1 text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          <RotateCcw className="size-3" />
          Reset demo
        </button>
      </div>
      <ResetDemoDialog open={resetOpen} onClose={() => setResetOpen(false)} />
    </div>
  );
}
