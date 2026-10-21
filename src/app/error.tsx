"use client";

import { AlertOctagon, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
      <span className="mx-auto flex size-10 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--danger)_40%,transparent)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] text-[var(--danger)]">
        <AlertOctagon className="size-5" />
      </span>
      <h1 className="mt-4 text-sm font-semibold">A local view failed to render</h1>
      <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
        SentinelX encountered an unexpected client error. Your locally stored demo
        data has not been changed by this screen.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-[10px] text-[var(--subtle)]">
          digest: {error.digest}
        </p>
      )}
      <div className="mt-5 flex justify-center gap-2">
        <Button variant="secondary" size="sm" onClick={reset}>
          <RotateCcw /> Try again
        </Button>
        <Button variant="ghost" size="sm" onClick={() => window.location.assign("/")}>
          Back to overview
        </Button>
      </div>
    </div>
  );
}
