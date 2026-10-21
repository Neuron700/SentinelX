import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { SentinelXDatabase } from "@/lib/storage/db";
import { seedDatabase } from "@/data/seed";
import { createRepositories } from "@/data/repositories";

let db: SentinelXDatabase;
let testIndex = 0;

beforeEach(() => {
  testIndex += 1;
  db = new SentinelXDatabase(`SentinelXSeedTest${testIndex}`);
});

afterEach(async () => {
  await db.delete();
});

describe("seed dataset", () => {
  it("seeds events, alerts, incidents, assets, rules, playbooks, indicators and scenarios", async () => {
    await seedDatabase(db, new Date("2026-10-21T12:00:00.000Z"));
    const repos = createRepositories(db);

    expect(await repos.events.count()).toBeGreaterThan(500);
    expect(await repos.alerts.count()).toBe(18);
    expect(await repos.incidents.count()).toBe(4);
    expect(await repos.assets.count()).toBeGreaterThanOrEqual(20);
    expect(await repos.rules.count()).toBe(10);
    expect(await repos.playbooks.count()).toBe(4);
    expect(await repos.indicators.count()).toBe(12);
    expect(await repos.scenarios.count()).toBe(5);
  });

  it("keeps every alert -> event reference resolvable", async () => {
    await seedDatabase(db, new Date("2026-10-21T12:00:00.000Z"));
    const repos = createRepositories(db);
    const events = await repos.events.getAll();
    const eventIds = new Set(events.map((e) => e.id));
    const alerts = await repos.alerts.getAll();

    for (const alert of alerts) {
      expect(alert.relatedEventIds.length).toBeGreaterThan(0);
      for (const id of alert.relatedEventIds) {
        expect(eventIds.has(id), `${alert.id} -> ${id}`).toBe(true);
      }
    }
  });

  it("keeps every event -> alert reference resolvable", async () => {
    await seedDatabase(db, new Date("2026-10-21T12:00:00.000Z"));
    const repos = createRepositories(db);
    const alertIds = new Set((await repos.alerts.getAll()).map((a) => a.id));
    const events = await repos.events.getAll();

    for (const event of events) {
      for (const id of event.relatedAlertIds) {
        expect(alertIds.has(id), `${event.id} -> ${id}`).toBe(true);
      }
    }
  });

  it("keeps incident references resolvable", async () => {
    await seedDatabase(db, new Date("2026-10-21T12:00:00.000Z"));
    const repos = createRepositories(db);
    const incidents = await repos.incidents.getAll();
    const alertIds = new Set((await repos.alerts.getAll()).map((a) => a.id));
    const eventIds = new Set((await repos.events.getAll()).map((e) => e.id));
    const assetIds = new Set((await repos.assets.getAll()).map((a) => a.id));

    for (const incident of incidents) {
      for (const id of incident.alertIds) {
        expect(alertIds.has(id), `${incident.id} alert ${id}`).toBe(true);
      }
      for (const id of incident.eventIds) {
        expect(eventIds.has(id), `${incident.id} event ${id}`).toBe(true);
      }
      for (const id of incident.assetIds) {
        expect(assetIds.has(id), `${incident.id} asset ${id}`).toBe(true);
      }
      expect(incident.timeline.length).toBeGreaterThan(3);
      const sorted = [...incident.timeline].sort((a, b) =>
        a.timestamp.localeCompare(b.timestamp)
      );
      expect(incident.timeline.map((t) => t.id)).toEqual(
        sorted.map((t) => t.id)
      );
    }
  });

  it("links alerts and incidents in both directions", async () => {
    await seedDatabase(db, new Date("2026-10-21T12:00:00.000Z"));
    const repos = createRepositories(db);
    const incidents = await repos.incidents.getAll();
    const alerts = await repos.alerts.getAll();
    const alertById = new Map(alerts.map((a) => [a.id, a]));

    for (const incident of incidents) {
      for (const alertId of incident.alertIds) {
        expect(alertById.get(alertId)?.incidentId).toBe(incident.id);
      }
    }
  });

  it("keeps indicator references resolvable", async () => {
    await seedDatabase(db, new Date("2026-10-21T12:00:00.000Z"));
    const repos = createRepositories(db);
    const eventIds = new Set((await repos.events.getAll()).map((e) => e.id));
    const alertIds = new Set((await repos.alerts.getAll()).map((a) => a.id));
    const assetIds = new Set((await repos.assets.getAll()).map((a) => a.id));
    const indicators = await repos.indicators.getAll();

    for (const indicator of indicators) {
      for (const id of indicator.relatedEventIds)
        expect(eventIds.has(id), `${indicator.id} event ${id}`).toBe(true);
      for (const id of indicator.relatedAlertIds)
        expect(alertIds.has(id), `${indicator.id} alert ${id}`).toBe(true);
      for (const id of indicator.relatedAssetIds)
        expect(assetIds.has(id), `${indicator.id} asset ${id}`).toBe(true);
    }
  });

  it("never seeds telemetry in the future", async () => {
    const anchor = new Date("2026-10-21T12:00:00.000Z");
    await seedDatabase(db, anchor);
    const events = await createRepositories(db).events.getAll();
    const anchorIso = anchor.toISOString();

    for (const event of events) {
      expect(
        event.timestamp <= anchorIso,
        `${event.id} at ${event.timestamp} is after ${anchorIso}`
      ).toBe(true);
    }
  });

  it("is deterministic for a fixed anchor", async () => {
    const anchor = new Date("2026-10-21T12:00:00.000Z");
    await seedDatabase(db, anchor);
    const first = await createRepositories(db).events.getAll();

    const second = new SentinelXDatabase(`SentinelXSeedTest${testIndex}2`);
    try {
      await seedDatabase(second, anchor);
      const secondEvents = await createRepositories(second).events.getAll();
      expect(secondEvents.length).toBe(first.length);
      expect(secondEvents.map((e) => [e.id, e.timestamp, e.eventType, e.severity])).toEqual(
        first.map((e) => [e.id, e.timestamp, e.eventType, e.severity])
      );
    } finally {
      await second.delete();
    }
  });
});
