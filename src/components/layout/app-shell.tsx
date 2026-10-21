"use client";

import { useEffect, useRef } from "react";
import { Toaster } from "sonner";
import { AlertTriangle, Loader2, RotateCcw, ShieldHalf } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { DemoBanner } from "./demo-banner";
import { CommandPalette } from "./command-palette";
import { useDataset } from "@/hooks/use-dataset";
import { useSettingsStore, applyTheme } from "@/store/settings-store";
import { useTimeRangeStore } from "@/store/time-range-store";
import { Button } from "@/components/ui/button";
import { useMounted } from "@/hooks/use-mounted";

export function AppShell({ children }: { children: React.ReactNode }) {
  const dataset = useDataset();
  const theme = useSettingsStore((s) => s.theme);
  const defaultTimeRange = useSettingsStore((s) => s.defaultTimeRange);
  const mounted = useMounted();
  const appliedDefaultRange = useRef(false);

  useEffect(() => {
    applyTheme(theme);
  }, [theme, mounted]);

  useEffect(() => {
    if (!mounted || appliedDefaultRange.current) return;
    appliedDefaultRange.current = true;
    useTimeRangeStore.getState().setPreset(defaultTimeRange);
  }, [mounted, defaultTimeRange]);

  useEffect(() => {
    if (theme !== "system" || typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => applyTheme("system");
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [theme]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <DemoBanner />
        <main className="mx-auto w-full max-w-[1680px] flex-1 px-3 py-4 lg:px-5 lg:py-5">
          {dataset.error ? (
            <div className="mx-auto mt-16 max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
              <AlertTriangle className="mx-auto size-7 text-[var(--sev-high)]" />
              <h2 className="mt-3 text-sm font-semibold">
                Local dataset unavailable
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]">
                {dataset.error}
              </p>
              <p className="mt-2 text-[11px] text-[var(--subtle)]">
                SentinelX stores everything in IndexedDB. Check that your browser
                allows storage for this origin, then retry.
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                <RotateCcw /> Retry
              </Button>
            </div>
          ) : dataset.seeding ? (
            <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
              <span className="relative flex size-12 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--accent)_40%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent)]">
                <ShieldHalf className="size-5" />
                <span className="absolute inset-0 animate-ping rounded-full border border-[var(--accent)] opacity-20" />
              </span>
              <div>
                <p className="text-sm font-medium">Preparing the synthetic dataset</p>
                <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-[var(--muted)]">
                  <Loader2 className="size-3 animate-spin" />
                  Seeding events, alerts, incidents, and indicators into IndexedDB…
                </p>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
        <footer className="no-print border-t border-[var(--border)] px-4 py-2.5 text-[10px] text-[var(--subtle)]">
          SentinelX v1.0.0 · local demonstration · synthetic data only · not a
          production SIEM
        </footer>
      </div>
      <CommandPalette />
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
            fontSize: "12px",
          },
        }}
      />
    </div>
  );
}
