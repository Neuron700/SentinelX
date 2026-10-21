import Link from "next/link";
import { Compass, ShieldQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
      <span className="mx-auto flex size-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--accent)]">
        <ShieldQuestion className="size-5" />
      </span>
      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--subtle)]">
        404 · route not found
      </p>
      <h1 className="mt-1.5 text-sm font-semibold">
        This console does not exist
      </h1>
      <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
        The requested view is not part of the local SentinelX demo. Return to the
        command center to continue triage.
      </p>
      <Link
        href="/"
        className="mt-5 inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-[11px] hover:border-[var(--border-hover)]"
      >
        <Compass className="size-3.5" /> Back to overview
      </Link>
    </div>
  );
}
