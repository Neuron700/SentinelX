"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Database,
  FlaskConical,
  Menu,
  Moon,
  RotateCcw,
  ScrollText,
  Search,
  Settings,
  Sun,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dropdown, DropdownItem, DropdownLabel } from "@/components/ui/dropdown";
import { NotificationPanel } from "./notification-panel";
import { TimeRangePicker } from "./time-range-picker";
import { ResetDemoDialog } from "./reset-demo-dialog";
import { useUIStore } from "@/store/ui-store";
import { useSettingsStore, applyTheme } from "@/store/settings-store";
import { useSimulationStore } from "@/store/simulation-store";
import { NAV_ITEMS } from "./nav-items";
import { useMounted } from "@/hooks/use-mounted";

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const mounted = useMounted();
  const { setMobileNavOpen, togglePalette } = useUIStore();
  const { theme, setTheme, analystName } = useSettingsStore();
  const simulationRunning = useSimulationStore((s) => s.running);
  const [resetOpen, setResetOpen] = useState(false);

  const current =
    NAV_ITEMS.find((item) =>
      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
    ) ?? NAV_ITEMS[0];

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      mounted &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const toggleTheme = () => {
    const next = isDark ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_88%,transparent)] px-3 backdrop-blur lg:px-4">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setMobileNavOpen(true)}
        aria-label="Open navigation"
      >
        <Menu />
      </Button>

      <div className="hidden min-w-0 items-center gap-2 lg:flex">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--subtle)]">
          SentinelX /
        </span>
        <span className="truncate text-xs font-medium text-[var(--foreground)]">
          {current.label}
        </span>
      </div>

      <button
        type="button"
        onClick={togglePalette}
        className="group ml-1 flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 text-left text-xs text-[var(--subtle)] transition-colors hover:border-[var(--border-hover)] md:max-w-md"
        aria-label="Open global search"
      >
        <Search className="size-3.5" />
        <span className="truncate">Search events, alerts, incidents…</span>
        <kbd className="ml-auto hidden shrink-0 rounded border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted)] sm:block">
          Ctrl K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <span className="hidden items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)] xl:flex">
          <Database className="size-3" />
          synthetic dataset
        </span>

        <div className="hidden sm:block">
          <TimeRangePicker compact />
        </div>

        <Link
          href="/scenarios"
          className="hidden h-8 items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[11px] text-[var(--muted)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--foreground)] lg:flex"
          title={
            simulationRunning
              ? "A simulation is running — open the scenario simulator"
              : "Open the scenario simulator"
          }
        >
          <FlaskConical className="size-3.5" />
          Scenarios
          {simulationRunning && (
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--accent)] opacity-70" />
              <span className="relative inline-flex size-1.5 rounded-full bg-[var(--accent)]" />
            </span>
          )}
        </Link>

        <NotificationPanel />

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
          title={isDark ? "Switch to light theme" : "Switch to dark theme"}
        >
          {mounted && isDark ? <Sun /> : <Moon />}
        </Button>

        <Dropdown
          trigger={
            <Button
              variant="secondary"
              size="icon"
              className="rounded-full font-mono text-[11px]"
              aria-label="Workspace menu"
            >
              <UserRound />
            </Button>
          }
        >
          <DropdownLabel>Local workspace</DropdownLabel>
          <div className="px-2.5 pb-2">
            <p className="text-xs font-medium text-[var(--foreground)]">
              {analystName}
            </p>
            <p className="font-mono text-[10px] text-[var(--subtle)]">
              demo workspace · no sign-in
            </p>
          </div>
          <div className="my-1 h-px bg-[var(--border)]" />
          <DropdownItem onSelect={() => router.push("/audit")}>
            <ScrollText /> Audit trail
          </DropdownItem>
          <DropdownItem onSelect={() => router.push("/settings")}>
            <Settings /> Settings
          </DropdownItem>
          <DropdownItem onSelect={() => setResetOpen(true)}>
            <RotateCcw /> Reset demo data
          </DropdownItem>
        </Dropdown>
      </div>

      <ResetDemoDialog open={resetOpen} onClose={() => setResetOpen(false)} />
    </header>
  );
}
