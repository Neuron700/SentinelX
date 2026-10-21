import type { SentinelXDatabase } from "@/lib/storage/db";
import { createRepositories, type Repositories } from "@/data/repositories";
import { buildSeedEvents } from "./events";
import { buildSeedAlerts, ALERT_INCIDENT_MAP } from "./alerts";
import { buildSeedIncidents } from "./incidents";
import { buildSeedIndicators } from "./indicators";
import { buildSeedScenarios } from "./scenarios";
import { SEED_RULES } from "./rules";
import { SEED_PLAYBOOKS } from "./playbooks";
import { HOSTS } from "./world";
import { DEFAULT_SETTINGS } from "@/domain/models/settings";
import type { Asset } from "@/domain/models/asset";

const SEED_KEY = "seed-version";
const SEED_VERSION = 2;

let inFlight: Promise<boolean> | null = null;

function assetsFromWorld(): Asset[] {
  const now = new Date().toISOString();
  return HOSTS.map((host) => ({
    id: host.id,
    name: host.name,
    type: host.type,
    environment: host.environment,
    os: host.os,
    ipAddress: host.ip,
    riskScore: host.risk,
    riskFactors: host.factors,
    lastSeen: now,
    relatedAlertIds: [],
    tags: host.tags,
  }));
}

export async function seedDatabase(
  db: SentinelXDatabase,
  anchor: Date = new Date()
): Promise<void> {
  const repos = createRepositories(db);
  const anchorDate = anchor;

  const { events, clusters } = buildSeedEvents(anchorDate);
  const { alerts, eventAlertLinks } = buildSeedAlerts(events, clusters);
  const { incidents, alertIncidentMap } = buildSeedIncidents(events, alerts);

  const incidentKeyToId = new Map<string, string>();
  for (const incident of incidents) {
    incidentKeyToId.set(
      incident.id === "INC-2026-014"
        ? "inc-credential"
        : incident.id === "INC-2026-013"
          ? "inc-endpoint"
          : incident.id === "INC-2026-011"
            ? "inc-exfil"
            : "inc-jump",
      incident.id
    );
  }

  for (const alert of alerts) {
    const incidentKey =
      ALERT_INCIDENT_MAP[alert.id] ?? alertIncidentMap.get(alert.id) ?? null;
    alert.incidentId = incidentKey
      ? (incidentKeyToId.get(incidentKey) ?? null)
      : null;

    const assetIds = new Set(alert.relatedAssetIds);
    for (const asset of assetsFromWorld()) {
      if (alert.relatedEntityIds.includes(asset.name)) assetIds.add(asset.id);
    }
    alert.relatedAssetIds = [...assetIds];
  }

  const eventsWithLinks = events.map((event) => ({
    ...event,
    relatedAlertIds: eventAlertLinks.get(event.id) ?? [],
  }));

  const assetAlertMap = new Map<string, string[]>();
  for (const alert of alerts) {
    for (const assetId of alert.relatedAssetIds) {
      const list = assetAlertMap.get(assetId) ?? [];
      list.push(alert.id);
      assetAlertMap.set(assetId, list);
    }
  }

  const assets = assetsFromWorld().map((asset) => ({
    ...asset,
    relatedAlertIds: assetAlertMap.get(asset.id) ?? [],
  }));

  const indicators = buildSeedIndicators(eventsWithLinks, clusters);
  const scenarios = buildSeedScenarios(anchorDate);

  await db.transaction(
    "rw",
    [
      db.events,
      db.alerts,
      db.incidents,
      db.assets,
      db.detectionRules,
      db.scenarios,
      db.indicators,
      db.playbooks,
      db.settings,
      db.meta,
      db.auditLog,
      db.scenarioResults,
    ],
    async () => {
      await Promise.all([
        db.events.clear(),
        db.alerts.clear(),
        db.incidents.clear(),
        db.assets.clear(),
        db.detectionRules.clear(),
        db.scenarios.clear(),
        db.indicators.clear(),
        db.playbooks.clear(),
        db.settings.clear(),
        db.auditLog.clear(),
        db.scenarioResults.clear(),
      ]);
      await repos.events.bulkCreate(eventsWithLinks);
      await repos.alerts.bulkCreate(alerts);
      await repos.incidents.bulkCreate(incidents);
      await repos.assets.bulkCreate(assets);
      await repos.rules.bulkCreate(SEED_RULES);
      await repos.scenarios.bulkCreate(scenarios);
      await repos.indicators.bulkCreate(indicators);
      await repos.playbooks.bulkCreate(SEED_PLAYBOOKS);
      await repos.settings.setMany(DEFAULT_SETTINGS);
      await db.meta.put({ key: SEED_KEY, value: SEED_VERSION });
      await repos.audit.log({
        action: "demo.seeded",
        entityType: "system",
        entityId: "seed",
        entityLabel: "Demo dataset",
        details: {
          events: eventsWithLinks.length,
          alerts: alerts.length,
          incidents: incidents.length,
          assets: assets.length,
        },
        userId: "system",
      });
    }
  );
}

export async function ensureSeeded(db: SentinelXDatabase): Promise<boolean> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const meta = await db.meta.get(SEED_KEY);
    const eventCount = await db.events.count();
    if (meta?.value === SEED_VERSION && eventCount > 0) {
      return false;
    }
    await seedDatabase(db);
    return true;
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

export async function resetDemoData(db: SentinelXDatabase): Promise<void> {
  await seedDatabase(db);
}

export async function isSeeded(db: SentinelXDatabase): Promise<boolean> {
  const meta = await db.meta.get(SEED_KEY);
  return meta?.value === SEED_VERSION;
}

export { SEED_VERSION };

export type { Repositories };
