import { describe, expect, it } from "vitest";
import { buildGraph, filterGraph, incidentSubgraph } from "@/features/graph/build-graph";
import type { SecurityEvent } from "@/domain/models/event";
import type { Asset } from "@/domain/models/asset";
import type { Alert } from "@/domain/models/alert";
import type { Incident } from "@/domain/models/incident";
import type { ThreatIndicator } from "@/domain/models/indicator";

const hosts: Asset[] = [
  {
    id: "asset-a",
    name: "host-a",
    type: "workstation",
    environment: "corp",
    os: "Windows",
    ipAddress: "10.0.0.5",
    riskScore: 85,
    riskFactors: [],
    lastSeen: "2026-10-21T10:00:00.000Z",
    relatedAlertIds: ["alert-1"],
    tags: [],
  },
  {
    id: "asset-b",
    name: "host-b",
    type: "server",
    environment: "corp",
    os: "Linux",
    ipAddress: "10.0.0.6",
    riskScore: 20,
    riskFactors: [],
    lastSeen: "2026-10-21T10:00:00.000Z",
    relatedAlertIds: [],
    tags: [],
  },
];

const events: SecurityEvent[] = [
  {
    id: "evt-1",
    timestamp: "2026-10-21T10:00:00.000Z",
    eventType: "network_connection",
    severity: "high",
    sourceHostId: "asset-a",
    destinationHostId: "asset-b",
    sourceIp: "10.0.0.5",
    destinationIp: "203.0.113.9",
    userId: "a.dewi",
    description: "Outbound connection",
    relatedAlertIds: ["alert-1"],
    scenarioId: null,
    details: { domain: "example.test" },
  },
];

const alerts: Alert[] = [
  {
    id: "alert-1",
    title: "Outbound beacon",
    severity: "high",
    status: "new",
    confidence: 80,
    ruleId: "rule-1",
    firstSeen: "2026-10-21T10:00:00.000Z",
    lastSeen: "2026-10-21T10:00:00.000Z",
    relatedEventIds: ["evt-1"],
    relatedAssetIds: ["asset-a"],
    relatedEntityIds: [],
    incidentId: "INC-2026-001",
    assignedTo: null,
    acknowledgedAt: null,
    resolvedAt: null,
    resolution: null,
    notes: [],
    scenarioId: null,
  },
];

const incidents: Incident[] = [
  {
    id: "INC-2026-001",
    title: "Beacon investigation",
    description: "",
    severity: "high",
    status: "investigating",
    createdAt: "2026-10-21T10:00:00.000Z",
    updatedAt: "2026-10-21T10:00:00.000Z",
    assignedTo: null,
    alertIds: ["alert-1"],
    eventIds: ["evt-1"],
    assetIds: ["asset-a"],
    timeline: [],
    findings: [],
    playbookId: null,
    playbookProgress: [],
    falsePositive: false,
    closedReason: null,
    resolutionSummary: null,
  },
];

const indicators: ThreatIndicator[] = [
  {
    id: "ind-1",
    type: "ip",
    value: "203.0.113.9",
    source: "internal watchlist",
    confidence: 70,
    riskRating: "high",
    firstSeen: "2026-10-01T00:00:00.000Z",
    lastSeen: "2026-10-21T10:00:00.000Z",
    description: "Known beacon destination",
    relatedEventIds: ["evt-1"],
    relatedAlertIds: ["alert-1"],
    relatedAssetIds: ["asset-a"],
    analystNotes: "",
    synthetic: true,
  },
];

const graph = buildGraph({
  events,
  alerts,
  incidents,
  assets: hosts,
  indicators,
});

describe("graph builder", () => {
  it("creates host, user, IP, domain, alert, incident, and indicator nodes", () => {
    const types = new Set(graph.nodes.map((node) => node.type));
    expect(types).toEqual(
      new Set(["host", "user", "ip", "domain", "alert", "incident", "indicator"])
    );
  });

  it("links incident to alert and host", () => {
    const incidentEdges = graph.edges.filter(
      (edge) => edge.source === "INC-2026-001"
    );
    expect(incidentEdges).toHaveLength(2);
    expect(incidentEdges.every((edge) => edge.type === "contains")).toBe(true);
  });

  it("links indicator to matching external IP", () => {
    const edge = graph.edges.find(
      (item) => item.source === "ind-1" && item.target === "ip:203.0.113.9"
    );
    expect(edge).toBeDefined();
    expect(edge?.type).toBe("observed");
  });

  it("filters by node type while keeping only valid edges", () => {
    const filtered = filterGraph(graph, {
      nodeTypes: ["host", "ip"],
      minSeverity: null,
      search: "",
      incidentId: null,
    });
    expect(filtered.nodes.every((node) => ["host", "ip"].includes(node.type))).toBe(true);
    for (const edge of filtered.edges) {
      expect(filtered.nodes.some((node) => node.id === edge.source)).toBe(true);
      expect(filtered.nodes.some((node) => node.id === edge.target)).toBe(true);
    }
  });

  it("keeps search matches plus neighbors", () => {
    const filtered = filterGraph(graph, {
      nodeTypes: ["host", "user", "ip", "domain", "alert", "incident", "indicator"],
      minSeverity: null,
      search: "203.0.113.9",
      incidentId: null,
    });
    expect(filtered.nodes.some((node) => node.id === "ip:203.0.113.9")).toBe(true);
    expect(filtered.nodes.some((node) => node.id === "ind-1")).toBe(true);
  });

  it("extracts a two-hop incident subgraph", () => {
    const sub = incidentSubgraph(graph, "INC-2026-001");
    expect(sub.nodes.some((node) => node.id === "alert-1")).toBe(true);
    expect(sub.nodes.some((node) => node.id === "asset-a")).toBe(true);
    expect(sub.nodes.some((node) => node.id === "asset-b")).toBe(true);
  });
});
