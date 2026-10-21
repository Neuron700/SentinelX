"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BellRing,
  CornerDownLeft,
  FileText,
  FolderSearch,
  Radar,
  Server,
  ShieldHalf,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { NAV_ITEMS } from "./nav-items";
import { useUIStore } from "@/store/ui-store";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  useLiveAlerts,
  useLiveAssets,
  useLiveEvents,
  useLiveIncidents,
  useLiveIndicators,
} from "@/hooks/use-live-data";
import { cn } from "@/lib/utils/cn";

interface PaletteResult {
  id: string;
  group: string;
  label: string;
  hint: string;
  href: string;
  icon: React.ReactNode;
  severity?: "info" | "low" | "medium" | "high" | "critical";
}

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen } = useUIStore();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const debounced = useDebouncedValue(query, 150);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const events = useLiveEvents();
  const alerts = useLiveAlerts();
  const incidents = useLiveIncidents();
  const assets = useLiveAssets();
  const indicators = useLiveIndicators();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setPaletteOpen]);

  useEffect(() => {
    if (paletteOpen) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [paletteOpen]);

  const results = useMemo<PaletteResult[]>(() => {
    const q = debounced.trim().toLowerCase();
    const navResults: PaletteResult[] = NAV_ITEMS.filter(
      (item) =>
        !q ||
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
    ).map((item) => ({
      id: `nav:${item.href}`,
      group: "Navigate",
      label: item.label,
      hint: item.description,
      href: item.href,
      icon: <item.icon className="size-3.5" />,
    }));

    if (!q) return navResults;

    const eventResults: PaletteResult[] = events
      .filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          e.id.toLowerCase().includes(q) ||
          e.eventType.includes(q)
      )
      .slice(0, 5)
      .map((e) => ({
        id: `event:${e.id}`,
        group: "Events",
        label: e.description,
        hint: `${e.id} · ${e.timestamp.slice(0, 16).replace("T", " ")}`,
        href: `/events?event=${e.id}`,
        icon: <FileText className="size-3.5" />,
        severity: e.severity,
      }));

    const alertResults: PaletteResult[] = alerts
      .filter(
        (a) =>
          a.title.toLowerCase().includes(q) || a.id.toLowerCase().includes(q)
      )
      .slice(0, 5)
      .map((a) => ({
        id: `alert:${a.id}`,
        group: "Alerts",
        label: a.title,
        hint: `${a.id} · ${a.ruleId}`,
        href: `/alerts?alert=${a.id}`,
        icon: <BellRing className="size-3.5" />,
        severity: a.severity,
      }));

    const incidentResults: PaletteResult[] = incidents
      .filter(
        (i) =>
          i.title.toLowerCase().includes(q) || i.id.toLowerCase().includes(q)
      )
      .slice(0, 5)
      .map((i) => ({
        id: `incident:${i.id}`,
        group: "Incidents",
        label: i.title,
        hint: `${i.id} · ${i.status}`,
        href: `/incidents/${i.id}`,
        icon: <FolderSearch className="size-3.5" />,
        severity: i.severity,
      }));

    const assetResults: PaletteResult[] = assets
      .filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.ipAddress ?? "").includes(q) ||
          a.tags.some((t) => t.includes(q))
      )
      .slice(0, 4)
      .map((a) => ({
        id: `asset:${a.id}`,
        group: "Assets",
        label: a.name,
        hint: `${a.type.replaceAll("_", " ")} · ${a.environment}`,
        href: `/assets?asset=${a.id}`,
        icon: <Server className="size-3.5" />,
      }));

    const indicatorResults: PaletteResult[] = indicators
      .filter(
        (i) =>
          i.value.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q)
      )
      .slice(0, 4)
      .map((i) => ({
        id: `indicator:${i.id}`,
        group: "Indicators",
        label: i.value,
        hint: `${i.type.replaceAll("_", " ")} · ${i.riskRating}`,
        href: `/intelligence?indicator=${i.id}`,
        icon: <Radar className="size-3.5" />,
      }));

    return [
      ...navResults,
      ...alertResults,
      ...incidentResults,
      ...eventResults,
      ...assetResults,
      ...indicatorResults,
    ];
  }, [debounced, events, alerts, incidents, assets, indicators]);

  const clampedActive = Math.min(active, Math.max(results.length - 1, 0));

  const select = (result: PaletteResult) => {
    setPaletteOpen(false);
    router.push(result.href);
  };

  const grouped = results.reduce<Record<string, PaletteResult[]>>((acc, r) => {
    (acc[r.group] ??= []).push(r);
    return acc;
  }, {});

  let flatIndex = -1;

  return (
    <Dialog
      open={paletteOpen}
      onClose={() => setPaletteOpen(false)}
      title="Global search"
      description="Search pages, events, alerts, incidents, assets, and indicators."
      width="max-w-2xl"
    >
      <div className="-mt-1">
        <Input
          ref={inputRef}
          value={query}
          placeholder="Type to search the local dataset…"
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((v) => Math.min(v + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((v) => Math.max(0, v - 1));
            } else if (e.key === "Enter" && results[clampedActive]) {
              e.preventDefault();
              select(results[clampedActive]);
            }
          }}
          aria-label="Search query"
        />
        <div className="mt-3 max-h-[50vh] overflow-y-auto">
          {results.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <ShieldHalf className="size-6 text-[var(--subtle)]" />
              <p className="text-xs text-[var(--muted)]">
                No local records match “{debounced}”.
              </p>
              <p className="text-[11px] text-[var(--subtle)]">
                Try an event ID, IP address, hostname, or alert title.
              </p>
            </div>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="mb-2">
                <p className="px-1 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--subtle)]">
                  {group}
                </p>
                <ul>
                  {items.map((item) => {
                    flatIndex += 1;
                    const index = flatIndex;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onMouseEnter={() => setActive(index)}
                          onClick={() => select(item)}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors",
                            index === clampedActive
                              ? "bg-[var(--surface-2)]"
                              : "hover:bg-[var(--surface-2)]"
                          )}
                        >
                          <span className="text-[var(--accent)]">{item.icon}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs text-[var(--foreground)]">
                              {item.label}
                            </span>
                            <span className="block truncate font-mono text-[10px] text-[var(--subtle)]">
                              {item.hint}
                            </span>
                          </span>
                          {item.severity && (
                            <SeverityBadge severity={item.severity} withIcon={false} />
                          )}
                          {index === clampedActive ? (
                            <CornerDownLeft className="size-3 text-[var(--subtle)]" />
                          ) : (
                            <ArrowRight className="size-3 text-transparent" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>
    </Dialog>
  );
}
