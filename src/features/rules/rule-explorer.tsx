"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  Beaker,
  ChevronRight,
  FilterX,
  Search,
  ShieldCheck,
  ShieldOff,
  Sparkles,
} from "lucide-react";
import type { DetectionRule } from "@/domain/models/rule";
import type { Severity } from "@/domain/models/common";
import { SEVERITIES, SEVERITY_RANK } from "@/domain/models/common";
import { PageHeader } from "@/components/ui/kpi-card";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/progress";
import { Drawer } from "@/components/ui/dialog";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { TableShell, Th, Td } from "@/components/ui/table";
import {
  describeCondition,
  testRuleAgainstEvents,
  type RuleTestResult,
} from "./test-rule";
import { useLiveAlerts, useLiveEvents, useLiveRules } from "@/hooks/use-live-data";
import { useTimeRangeStore } from "@/store/time-range-store";
import { getRepositories } from "@/data/repositories";
import { recordAudit } from "@/lib/audit";
import { toast } from "sonner";
import { relativeTime } from "@/lib/time/time";
import { cn } from "@/lib/utils/cn";

const TYPE_LABELS: Record<string, string> = {
  threshold: "Threshold",
  pattern: "Pattern",
  anomaly: "Behavioral anomaly",
  correlation: "Correlation",
};

export function RuleExplorer() {
  const rules = useLiveRules();
  const alerts = useLiveAlerts();
  const events = useLiveEvents();
  const range = useTimeRangeStore((s) => s.range);
  const searchParams = useSearchParams();

  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [severityFilter, setSeverityFilter] = React.useState<"all" | Severity>("all");
  const [originFilter, setOriginFilter] = React.useState("all");
  const [selectedId, setSelectedId] = React.useState<string | null>(
    searchParams.get("rule")
  );
  const [testResult, setTestResult] = React.useState<RuleTestResult | null>(null);
  const [testing, setTesting] = React.useState(false);

  React.useEffect(() => {
    const rule = searchParams.get("rule");
    if (rule) setSelectedId(rule);
  }, [searchParams]);

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...rules]
      .filter((rule) => {
        if (typeFilter !== "all" && rule.detectionType !== typeFilter) return false;
        if (severityFilter !== "all" && rule.severity !== severityFilter) return false;
        if (originFilter === "enabled" && !rule.enabled) return false;
        if (originFilter === "disabled" && rule.enabled) return false;
        if (!query) return true;
        return (
          rule.name.toLowerCase().includes(query) ||
          rule.id.toLowerCase().includes(query) ||
          rule.description.toLowerCase().includes(query)
        );
      })
      .sort(
        (a, b) =>
          Number(b.enabled) - Number(a.enabled) ||
          SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] ||
          a.name.localeCompare(b.name)
      );
  }, [rules, search, typeFilter, severityFilter, originFilter]);

  const selectedRule = rules.find((rule) => rule.id === selectedId) ?? null;
  const ruleAlerts = alerts.filter((alert) => alert.ruleId === selectedId);

  const alertsByRule = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const alert of alerts) {
      map.set(alert.ruleId, (map.get(alert.ruleId) ?? 0) + 1);
    }
    return map;
  }, [alerts]);

  const lastFiredByRule = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const alert of alerts) {
      const current = map.get(alert.ruleId);
      if (!current || alert.firstSeen > current) {
        map.set(alert.ruleId, alert.firstSeen);
      }
    }
    return map;
  }, [alerts]);

  const toggleRule = async (rule: DetectionRule, enabled: boolean) => {
    try {
      const { rules: repo } = getRepositories();
      await repo.update(rule.id, { enabled });
      await recordAudit({
        action: enabled ? "rule.enabled" : "rule.disabled",
        entityType: "rule",
        entityId: rule.id,
        entityLabel: rule.name,
        details: { enabled },
      });
      toast.success(`${rule.name} ${enabled ? "enabled" : "disabled"}`);
    } catch (error) {
      toast.error("Could not update rule", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const runTest = () => {
    if (!selectedRule) return;
    setTesting(true);
    setTestResult(
      testRuleAgainstEvents(
        selectedRule,
        events.filter(
          (event) =>
            event.timestamp >= range.from && event.timestamp <= range.to
        )
      )
    );
    setTesting(false);
  };

  const enabledCount = rules.filter((rule) => rule.enabled).length;

  return (
    <div>
      <PageHeader
        eyebrow="Detection engineering"
        title="Detection rules"
        description="Inspect the synthetic rule logic that drives alerts and scenario detections. Rules can be enabled or disabled locally and are audited."
      />
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile icon={<ShieldCheck />} label="Enabled rules" value={enabledCount} />
          <StatTile
            icon={<ShieldOff />}
            label="Disabled rules"
            value={rules.length - enabledCount}
          />
          <StatTile
            icon={<Activity />}
            label="Alerts attributed"
            value={alerts.length}
          />
          <StatTile
            icon={<Sparkles />}
            label="Custom rules"
            value={rules.filter((rule) => rule.origin === "custom").length}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--subtle)]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search rule name, ID, or description…"
              className="pl-8"
              aria-label="Search rules"
            />
          </div>
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-auto min-w-[150px] text-xs"
            aria-label="Filter by rule type"
          >
            <option value="all">All detection types</option>
            <option value="threshold">Threshold</option>
            <option value="pattern">Pattern</option>
            <option value="anomaly">Behavioral anomaly</option>
            <option value="correlation">Correlation</option>
          </Select>
          <Select
            value={severityFilter}
            onChange={(e) =>
              setSeverityFilter(e.target.value as "all" | Severity)
            }
            className="w-auto min-w-[130px] text-xs"
            aria-label="Filter by severity"
          >
            <option value="all">Any severity</option>
            {[...SEVERITIES].reverse().map((severity) => (
              <option key={severity} value={severity}>
                {severity}
              </option>
            ))}
          </Select>
          <Select
            value={originFilter}
            onChange={(e) => setOriginFilter(e.target.value)}
            className="w-auto min-w-[130px] text-xs"
            aria-label="Filter by state"
          >
            <option value="all">All states</option>
            <option value="enabled">Enabled only</option>
            <option value="disabled">Disabled only</option>
          </Select>
          {(search || typeFilter !== "all" || severityFilter !== "all" || originFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setTypeFilter("all");
                setSeverityFilter("all");
                setOriginFilter("all");
              }}
            >
              <FilterX /> Clear
            </Button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            <EmptyState
              icon={<Beaker className="size-4" />}
              title="No rules match"
              description="Adjust the detection type, severity, or state filters."
            />
          </div>
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th className="w-[70px]">State</Th>
                <Th>Rule</Th>
                <Th className="w-[100px]">Severity</Th>
                <Th className="w-[130px]">Type</Th>
                <Th>Conditions</Th>
                <Th className="w-[90px]">Alerts</Th>
                <Th className="w-[130px]">Last fired</Th>
                <Th className="w-[40px]" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((rule) => (
                <tr
                  key={rule.id}
                  className="cursor-pointer transition-colors hover:bg-[var(--surface-2)]"
                  onClick={() => {
                    setSelectedId(rule.id);
                    setTestResult(null);
                  }}
                >
                  <Td>
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={(checked) => void toggleRule(rule, checked)}
                      label={`Toggle ${rule.name}`}
                    />
                  </Td>
                  <Td className="max-w-[360px]">
                    <span className="block truncate text-[11px] font-medium">
                      {rule.name}
                    </span>
                    <span className="block truncate text-[10px] text-[var(--subtle)]">
                      {rule.description}
                    </span>
                    <span className="font-mono text-[9px] text-[var(--subtle)]">
                      {rule.id} · {rule.origin}
                    </span>
                  </Td>
                  <Td>
                    <SeverityBadge severity={rule.severity} withIcon={false} />
                  </Td>
                  <Td className="text-[10px] text-[var(--muted)]">
                    {TYPE_LABELS[rule.detectionType] ?? rule.detectionType}
                  </Td>
                  <Td className="max-w-[280px]">
                    <span className="line-clamp-2 text-[10px] leading-relaxed text-[var(--muted)]">
                      {rule.conditions
                        .map((condition) =>
                          describeCondition(
                            condition.field,
                            condition.operator,
                            condition.value
                          )
                        )
                        .join("; ")}
                    </span>
                  </Td>
                  <Td className="font-mono text-[10px]">
                    {alertsByRule.get(rule.id) ?? 0}
                  </Td>
                  <Td className="font-mono text-[10px] text-[var(--subtle)]">
                    {lastFiredByRule.has(rule.id)
                      ? relativeTime(lastFiredByRule.get(rule.id)!)
                      : rule.lastFiredAt
                        ? relativeTime(rule.lastFiredAt)
                        : "never"}
                  </Td>
                  <Td>
                    <ChevronRight className="size-3.5 text-[var(--subtle)]" />
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </div>

      <Drawer
        open={selectedRule !== null}
        onClose={() => {
          setSelectedId(null);
          setTestResult(null);
        }}
        title={selectedRule?.name ?? ""}
        subtitle={
          selectedRule ? (
            <span className="font-mono">
              {selectedRule.id} · {selectedRule.origin} · {selectedRule.logSources.join(", ")}
            </span>
          ) : undefined
        }
        width="max-w-xl"
      >
        {selectedRule && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={selectedRule.severity} />
              <span className="rounded border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--muted)]">
                {TYPE_LABELS[selectedRule.detectionType]}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[10px] text-[var(--subtle)]">
                  {selectedRule.enabled ? "enabled" : "disabled"}
                </span>
                <Switch
                  checked={selectedRule.enabled}
                  onCheckedChange={(checked) =>
                    void toggleRule(selectedRule, checked)
                  }
                  label={`Toggle ${selectedRule.name}`}
                />
              </div>
            </div>

            <p className="text-xs leading-relaxed text-[var(--muted)]">
              {selectedRule.description}
            </p>

            <section>
              <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--subtle)]">
                Conditions
              </h3>
              <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
                {selectedRule.conditions.map((condition, index) => (
                  <li key={index} className="px-3 py-2">
                    <p className="font-mono text-[10px] text-[var(--foreground)]">
                      {describeCondition(
                        condition.field,
                        condition.operator,
                        condition.value
                      )}
                    </p>
                    <p className="mt-0.5 font-mono text-[9px] text-[var(--subtle)]">
                      {condition.field} · {condition.operator}
                      {condition.threshold !== undefined &&
                        ` · threshold ${condition.threshold} in ${condition.timeWindowSeconds ?? 0}s`}
                      {condition.groupBy ? ` · group by ${condition.groupBy}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--subtle)]">
                Test bench
              </h3>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <p className="text-[11px] leading-relaxed text-[var(--muted)]">
                  Evaluate this rule against the current local dataset inside the
                  selected time range. No alerts are created.
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-2"
                  disabled={testing}
                  onClick={runTest}
                >
                  <Beaker /> Evaluate against dataset
                </Button>
                {testResult && (
                  <dl className="mt-3 space-y-1.5 border-t border-[var(--border)] pt-2">
                    <div className="flex justify-between gap-3">
                      <dt className="text-[10px] text-[var(--subtle)]">
                        Matching events
                      </dt>
                      <dd className="font-mono text-[10px]">
                        {testResult.matchedEvents}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-[10px] text-[var(--subtle)]">
                        Groups triggered
                      </dt>
                      <dd className="font-mono text-[10px]">
                        {testResult.groupsTriggered}
                      </dd>
                    </div>
                    <p className="pt-1 text-[10px] leading-relaxed text-[var(--muted)]">
                      {testResult.explanation}
                    </p>
                  </dl>
                )}
              </div>
            </section>

            <section>
              <h3 className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--subtle)]">
                <span>Alerts from this rule ({ruleAlerts.length})</span>
                <Link
                  href={`/alerts?rule=${selectedRule.id}`}
                  className="font-normal normal-case tracking-normal text-[var(--accent)] hover:underline"
                >
                  open alert queue
                </Link>
              </h3>
              {ruleAlerts.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[var(--border)] px-3 py-3 text-center text-[11px] text-[var(--subtle)]">
                  This rule has not produced alerts yet.
                </p>
              ) : (
                <ul className="space-y-1">
                  {ruleAlerts.slice(0, 5).map((alert) => (
                    <li key={alert.id}>
                      <Link
                        href={`/alerts?alert=${alert.id}`}
                        className={cn(
                          "flex items-center gap-2 rounded border border-[var(--border)] px-2.5 py-1.5 text-[10px] hover:bg-[var(--surface-2)]"
                        )}
                      >
                        <SeverityBadge severity={alert.severity} withIcon={false} />
                        <span className="min-w-0 flex-1 truncate">
                          {alert.title}
                        </span>
                        <span className="font-mono text-[9px] text-[var(--subtle)]">
                          {alert.status}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <p className="text-[10px] leading-relaxed text-[var(--subtle)]">
              Rules execute against synthetic telemetry in this demo. Disabling a
              rule suppresses future simulated detections; historical alerts are
              retained.
            </p>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
      <span className="flex size-8 items-center justify-center rounded border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] [&_svg]:size-4">
        {icon}
      </span>
      <span>
        <span className="block font-mono text-lg leading-none">{value}</span>
        <span className="mt-1 block text-[9px] uppercase tracking-[0.1em] text-[var(--subtle)]">
          {label}
        </span>
      </span>
    </div>
  );
}
