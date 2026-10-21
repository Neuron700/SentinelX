"use client";

import * as React from "react";
import {
  Database,
  Download,
  Gauge,
  MonitorCog,
  Moon,
  RotateCcw,
  Save,
  Sun,
  UserRound,
} from "lucide-react";
import { PageHeader } from "@/components/ui/kpi-card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/progress";
import { ResetDemoDialog } from "@/components/layout/reset-demo-dialog";
import { useSettingsStore } from "@/store/settings-store";
import { applyTheme } from "@/store/settings-store";
import {
  useLiveAlerts,
  useLiveAudit,
  useLiveEvents,
  useLiveIncidents,
  useLiveScenarioResults,
} from "@/hooks/use-live-data";
import { getDB } from "@/lib/storage/db";
import { downloadJson, timestampedFilename } from "@/lib/export/download";
import { recordAudit } from "@/lib/audit";
import type { AppSettings, TableDensity, ThemeMode } from "@/domain/models/settings";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";

const THEMES: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
  { value: "dark", label: "Dark", icon: <Moon /> },
  { value: "light", label: "Light", icon: <Sun /> },
  { value: "system", label: "System", icon: <MonitorCog /> },
];

export function SettingsView() {
  const settings = useSettingsStore();
  const events = useLiveEvents();
  const alerts = useLiveAlerts();
  const incidents = useLiveIncidents();
  const audit = useLiveAudit();
  const results = useLiveScenarioResults();

  const [analystDraft, setAnalystDraft] = React.useState(settings.analystName);
  const [resetOpen, setResetOpen] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  React.useEffect(() => {
    setAnalystDraft(settings.analystName);
  }, [settings.analystName]);

  const updateTheme = (theme: ThemeMode) => {
    settings.setTheme(theme);
    applyTheme(theme);
  };

  const saveAnalyst = async () => {
    const name = analystDraft.trim();
    if (name.length < 2) {
      toast.error("Analyst name must be at least 2 characters");
      return;
    }
    settings.setAnalystName(name);
    await recordAudit({
      action: "settings.analyst_updated",
      entityType: "settings",
      entityId: "analystName",
      entityLabel: "Analyst identity",
      details: { analystName: name },
    });
    toast.success("Analyst identity updated");
  };

  const resetPreferences = () => {
    settings.resetToDefaults();
    applyTheme("dark");
    toast.success("Preferences reset to defaults");
  };

  const exportAll = async () => {
    setExporting(true);
    try {
      const db = getDB();
      const [
        eventRows,
        alertRows,
        incidentRows,
        assetRows,
        ruleRows,
        scenarioRows,
        indicatorRows,
        playbookRows,
        auditRows,
        resultRows,
      ] = await Promise.all([
        db.events.toArray(),
        db.alerts.toArray(),
        db.incidents.toArray(),
        db.assets.toArray(),
        db.detectionRules.toArray(),
        db.scenarios.toArray(),
        db.indicators.toArray(),
        db.playbooks.toArray(),
        db.auditLog.toArray(),
        db.scenarioResults.toArray(),
      ]);
      downloadJson(timestampedFilename("sentinelx-full-export", "json"), {
        exportedAt: new Date().toISOString(),
        classification: "Synthetic demo data",
        settings: {
          theme: settings.theme,
          tableDensity: settings.tableDensity,
          simulationSpeed: settings.simulationSpeed,
          notificationsEnabled: settings.notificationsEnabled,
          defaultTimeRange: settings.defaultTimeRange,
          analystName: settings.analystName,
        },
        events: eventRows,
        alerts: alertRows,
        incidents: incidentRows,
        assets: assetRows,
        detectionRules: ruleRows,
        scenarios: scenarioRows,
        indicators: indicatorRows,
        playbooks: playbookRows,
        auditLog: auditRows,
        scenarioResults: resultRows,
      });
      await recordAudit({
        action: "settings.data_exported",
        entityType: "settings",
        entityId: "export",
        entityLabel: "Full local export",
        details: {
          events: eventRows.length,
          alerts: alertRows.length,
          incidents: incidentRows.length,
        },
      });
      toast.success("Full local dataset exported");
    } catch (error) {
      toast.error("Export failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setExporting(false);
    }
  };

  const densityDescription: Record<TableDensity, string> = {
    compact: "Tighter rows for high-volume triage.",
    normal: "Balanced default density.",
    comfortable: "Extra breathing room for review.",
  };

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Local preferences, demo data management, and export controls. Settings persist in this browser only."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            <SectionHeader
              icon={<MonitorCog />}
              title="Appearance"
              description="Theme and table density apply immediately."
            />
            <div className="space-y-4 p-4">
              <div>
                <Label>Theme</Label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {THEMES.map((theme) => (
                    <button
                      key={theme.value}
                      type="button"
                      onClick={() => updateTheme(theme.value)}
                      aria-pressed={settings.theme === theme.value}
                      className={cn(
                        "flex items-center gap-2 rounded-md border px-3 py-2.5 text-[11px] transition-colors [&_svg]:size-3.5",
                        settings.theme === theme.value
                          ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--foreground)]"
                          : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:border-[var(--border-hover)]"
                      )}
                    >
                      {theme.icon}
                      {theme.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="density">Table density</Label>
                  <Select
                    id="density"
                    value={settings.tableDensity}
                    onChange={(e) =>
                      settings.setDensity(e.target.value as TableDensity)
                    }
                    className="mt-1.5"
                  >
                    <option value="compact">Compact</option>
                    <option value="normal">Normal</option>
                    <option value="comfortable">Comfortable</option>
                  </Select>
                  <p className="mt-1 text-[10px] text-[var(--subtle)]">
                    {densityDescription[settings.tableDensity]}
                  </p>
                </div>
                <div>
                  <Label htmlFor="default-range">Default time range</Label>
                  <Select
                    id="default-range"
                    value={settings.defaultTimeRange}
                    onChange={(e) =>
                      settings.setDefaultTimeRange(
                        e.target.value as AppSettings["defaultTimeRange"]
                      )
                    }
                    className="mt-1.5"
                  >
                    <option value="1h">Last 1 hour</option>
                    <option value="6h">Last 6 hours</option>
                    <option value="24h">Last 24 hours</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                  </Select>
                  <p className="mt-1 text-[10px] text-[var(--subtle)]">
                    Used when a new session opens the dashboard.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            <SectionHeader
              icon={<Gauge />}
              title="Simulation & notifications"
              description="Defaults for the synthetic scenario runner."
            />
            <div className="space-y-4 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="sim-speed">Default simulation speed</Label>
                  <Select
                    id="sim-speed"
                    value={String(settings.simulationSpeed)}
                    onChange={(e) =>
                      settings.setSimulationSpeed(Number(e.target.value))
                    }
                    className="mt-1.5"
                  >
                    {[1, 2, 4, 8].map((speed) => (
                      <option key={speed} value={speed}>
                        {speed}× real time
                      </option>
                    ))}
                  </Select>
                  <p className="mt-1 text-[10px] text-[var(--subtle)]">
                    Scenarios can still be started at a different speed.
                  </p>
                </div>
                <div className="flex items-start justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <div>
                    <p className="text-[11px] font-medium">
                      Completion notifications
                    </p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--subtle)]">
                      Toast notifications when simulations complete or fail.
                    </p>
                  </div>
                  <Switch
                    checked={settings.notificationsEnabled}
                    onCheckedChange={settings.setNotificationsEnabled}
                    label="Toggle completion notifications"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            <SectionHeader
              icon={<UserRound />}
              title="Analyst identity"
              description="Used to attribute assignments, notes, and audit entries."
            />
            <div className="p-4">
              <Label htmlFor="analyst">Display name</Label>
              <div className="mt-1.5 flex gap-2">
                <Input
                  id="analyst"
                  value={analystDraft}
                  onChange={(e) => setAnalystDraft(e.target.value)}
                  placeholder="demo-analyst"
                  maxLength={40}
                />
                <Button
                  onClick={() => void saveAnalyst()}
                  disabled={
                    analystDraft.trim().length < 2 ||
                    analystDraft.trim() === settings.analystName
                  }
                >
                  <Save /> Save
                </Button>
              </div>
              <p className="mt-1.5 text-[10px] text-[var(--subtle)]">
                Current identity:{" "}
                <span className="font-mono text-[var(--muted)]">
                  {settings.analystName}
                </span>
              </p>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            <SectionHeader
              icon={<Database />}
              title="Local data"
              description="Everything lives in IndexedDB in this browser."
            />
            <div className="space-y-2 p-4">
              <DataRow label="Events" value={events.length} />
              <DataRow label="Alerts" value={alerts.length} />
              <DataRow label="Incidents" value={incidents.length} />
              <DataRow label="Audit entries" value={audit.length} />
              <DataRow label="Scenario runs" value={results.length} />
              <div className="mt-3 flex flex-col gap-2 border-t border-[var(--border)] pt-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void exportAll()}
                  disabled={exporting}
                >
                  <Download /> Export all data
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setResetOpen(true)}
                >
                  <RotateCcw /> Reset demo data
                </Button>
                <Button variant="ghost" size="sm" onClick={resetPreferences}>
                  Reset preferences
                </Button>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--subtle)]">
              About SentinelX
            </h2>
            <dl className="mt-3 space-y-1.5 text-[11px]">
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--subtle)]">Version</dt>
                <dd className="font-mono">1.0.0</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--subtle)]">Storage</dt>
                <dd className="font-mono">IndexedDB (Dexie)</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--subtle)]">Detection</dt>
                <dd className="font-mono">local rule engine</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--subtle)]">Data</dt>
                <dd className="font-mono">100% synthetic</dd>
              </div>
            </dl>
            <p className="mt-3 border-t border-[var(--border)] pt-2.5 text-[10px] leading-relaxed text-[var(--subtle)]">
              SentinelX is a defensive cyber-defense demo. It performs no scanning,
              exploitation, or network activity of any kind.
            </p>
          </section>
        </div>
      </div>

      <ResetDemoDialog open={resetOpen} onClose={() => setResetOpen(false)} />
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-2.5 border-b border-[var(--border)] px-4 py-3">
      <span className="mt-0.5 text-[var(--accent)] [&_svg]:size-4">{icon}</span>
      <div>
        <h2 className="text-xs font-medium">{title}</h2>
        <p className="mt-0.5 text-[10px] text-[var(--subtle)]">{description}</p>
      </div>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[11px]">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="font-mono text-[10px]">{value}</span>
    </div>
  );
}
