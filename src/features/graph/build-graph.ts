import type { SecurityEvent } from "@/domain/models/event";
import type { Alert } from "@/domain/models/alert";
import type { Incident } from "@/domain/models/incident";
import type { Asset } from "@/domain/models/asset";
import type { ThreatIndicator } from "@/domain/models/indicator";
import type {
  GraphData,
  GraphEdge,
  GraphEdgeType,
  GraphFilters,
  GraphNode,
  GraphNodeType,
} from "@/domain/models/graph";
import { SEVERITY_RANK, type Severity } from "@/domain/models/common";

export interface GraphInput {
  events: SecurityEvent[];
  alerts: Alert[];
  incidents: Incident[];
  assets: Asset[];
  indicators: ThreatIndicator[];
}

interface EdgeAccumulator {
  source: string;
  target: string;
  type: GraphEdgeType;
  weight: number;
  lastSeen: string;
  label: string;
}

function isInternalIp(ip: string): boolean {
  return /^10\./.test(ip) || /^192\.168\./.test(ip) || /^172\.(1[6-9]|2\d|3[01])\./.test(ip);
}

function maxSeverity(
  current: Severity | undefined,
  next: Severity
): Severity {
  if (!current) return next;
  return SEVERITY_RANK[next] > SEVERITY_RANK[current] ? next : current;
}

export function buildGraph(input: GraphInput): GraphData {
  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, EdgeAccumulator>();

  const addNode = (node: GraphNode): GraphNode => {
    const existing = nodes.get(node.id);
    if (existing) {
      existing.severity =
        node.severity != null
          ? maxSeverity(existing.severity, node.severity)
          : existing.severity;
      existing.metadata = { ...existing.metadata, ...node.metadata };
      return existing;
    }
    nodes.set(node.id, node);
    return node;
  };

  const addEdge = (
    source: string,
    target: string,
    type: GraphEdgeType,
    label: string,
    timestamp: string,
    amount = 1
  ) => {
    if (!nodes.has(source) || !nodes.has(target) || source === target) return;
    const key = `${type}|${source}|${target}`;
    const existing = edges.get(key);
    if (existing) {
      existing.weight += amount;
      if (timestamp > existing.lastSeen) existing.lastSeen = timestamp;
      return;
    }
    edges.set(key, {
      source,
      target,
      type,
      weight: amount,
      lastSeen: timestamp,
      label,
    });
  };

  const assetById = new Map(input.assets.map((asset) => [asset.id, asset]));
  const alertedAssetIds = new Set(
    input.alerts.flatMap((alert) => alert.relatedAssetIds)
  );

  for (const event of input.events) {
    const sourceHostId = event.sourceHostId;
    const destinationHostId = event.destinationHostId;

    if (sourceHostId && assetById.has(sourceHostId)) {
      addNode(hostNode(assetById.get(sourceHostId)!, alertedAssetIds));
    }
    if (destinationHostId && assetById.has(destinationHostId)) {
      addNode(hostNode(assetById.get(destinationHostId)!, alertedAssetIds));
    }

    if (event.userId) {
      addNode({
        id: event.userId,
        type: "user",
        label: event.userId,
        sublabel: "identity",
        metadata: {},
      });
      if (sourceHostId) {
        addEdge(
          event.userId,
          sourceHostId,
          "authentication",
          "authenticates to",
          event.timestamp
        );
      }
    }

    if (sourceHostId && destinationHostId) {
      const edgeType: GraphEdgeType =
        event.eventType === "dns_query"
          ? "dns"
          : event.eventType === "process_creation"
            ? "process"
            : event.eventType === "authentication_success" ||
                event.eventType === "authentication_failure"
              ? "authentication"
              : "connection";
      addEdge(
        sourceHostId,
        destinationHostId,
        edgeType,
        edgeLabel(edgeType),
        event.timestamp
      );
    }

    const externalIps = [event.sourceIp, event.destinationIp].filter(
      (ip): ip is string => Boolean(ip) && !isInternalIp(ip!)
    );
    for (const ip of externalIps) {
      addNode({
        id: `ip:${ip}`,
        type: "ip",
        label: ip,
        sublabel: "external IP",
        metadata: { external: true },
      });
      const host = sourceHostId ?? destinationHostId;
      if (host) {
        addEdge(host, `ip:${ip}`, "connection", "connects to", event.timestamp);
      }
    }

    const domain = event.details?.domain;
    if (typeof domain === "string" && domain.length > 0) {
      addNode({
        id: `domain:${domain}`,
        type: "domain",
        label: domain,
        sublabel: "domain",
        metadata: {},
      });
      if (sourceHostId) {
        addEdge(
          sourceHostId,
          `domain:${domain}`,
          "dns",
          "resolves",
          event.timestamp
        );
      }
    }
  }

  for (const alert of input.alerts) {
    addNode({
      id: alert.id,
      type: "alert",
      label: alert.title,
      sublabel: alert.ruleId,
      severity: alert.severity,
      metadata: {
        status: alert.status,
        confidence: alert.confidence,
        firstSeen: alert.firstSeen,
        incidentId: alert.incidentId,
      },
    });

    for (const assetId of alert.relatedAssetIds) {
      const asset = assetById.get(assetId);
      if (!asset) continue;
      addNode(hostNode(asset, alertedAssetIds));
      addEdge(
        alert.id,
        asset.id,
        "triggered",
        "triggered on",
        alert.firstSeen
      );
    }

    for (const eventId of alert.relatedEventIds.slice(0, 12)) {
      const event = input.events.find((item) => item.id === eventId);
      const hostId = event?.sourceHostId ?? event?.destinationHostId;
      if (hostId && nodes.has(hostId)) {
        addEdge(alert.id, hostId, "observed", "observed on", alert.firstSeen);
      }
      const ip = [event?.sourceIp, event?.destinationIp].find(
        (value): value is string => Boolean(value) && !isInternalIp(value!)
      );
      if (ip && nodes.has(`ip:${ip}`)) {
        addEdge(alert.id, `ip:${ip}`, "observed", "observed", alert.firstSeen);
      }
      const domain = event?.details?.domain;
      if (typeof domain === "string" && nodes.has(`domain:${domain}`)) {
        addEdge(
          alert.id,
          `domain:${domain}`,
          "observed",
          "observed",
          alert.firstSeen
        );
      }
    }
  }

  for (const incident of input.incidents) {
    addNode({
      id: incident.id,
      type: "incident",
      label: incident.title,
      sublabel: incident.id,
      severity: incident.severity,
      metadata: {
        status: incident.status,
        createdAt: incident.createdAt,
      },
    });
    for (const alertId of incident.alertIds) {
      if (nodes.has(alertId)) {
        addEdge(
          incident.id,
          alertId,
          "contains",
          "contains",
          incident.createdAt
        );
      }
    }
    for (const assetId of incident.assetIds) {
      const asset = assetById.get(assetId);
      if (!asset) continue;
      addNode(hostNode(asset, alertedAssetIds));
      addEdge(
        incident.id,
        assetId,
        "contains",
        "affects",
        incident.createdAt
      );
    }
  }

  for (const indicator of input.indicators) {
    const targetId =
      indicator.type === "ip"
        ? `ip:${indicator.value}`
        : indicator.type === "domain"
          ? `domain:${indicator.value}`
          : indicator.type === "username"
            ? indicator.value
            : indicator.type === "hostname"
              ? input.assets.find((asset) => asset.name === indicator.value)?.id
              : undefined;
    if (!targetId || !nodes.has(targetId)) continue;
    const target = nodes.get(targetId)!;
    target.severity = maxSeverity(target.severity, mapIndicatorRisk(indicator.riskRating));
    target.metadata.indicatorId = indicator.id;
    target.metadata.threat = indicator.description;
    addNode({
      id: indicator.id,
      type: "indicator",
      label: indicator.value,
      sublabel: `${indicator.type.replaceAll("_", " ")} · ${indicator.source}`,
      severity: mapIndicatorRisk(indicator.riskRating),
      metadata: { riskRating: indicator.riskRating },
    });
    addEdge(
      indicator.id,
      targetId,
      "observed",
      "observed as",
      indicator.lastSeen
    );
  }

  const graphEdges: GraphEdge[] = [...edges.values()].map((edge) => ({
    id: `edge-${edge.type}-${edge.source}-${edge.target}`,
    source: edge.source,
    target: edge.target,
    type: edge.type,
    weight: edge.weight,
    label: `${edge.label} · ${edge.weight}`,
    metadata: { lastSeen: edge.lastSeen },
  }));

  return { nodes: [...nodes.values()], edges: graphEdges };
}

function hostNode(asset: Asset, alertedAssetIds: Set<string>): GraphNode {
  return {
    id: asset.id,
    type: "host",
    label: asset.name,
    sublabel: `${asset.type.replaceAll("_", " ")} · ${asset.environment}`,
    riskScore: asset.riskScore,
    severity:
      asset.riskScore >= 80
        ? "critical"
        : asset.riskScore >= 60
          ? "high"
          : asset.riskScore >= 40
            ? "medium"
            : undefined,
    metadata: {
      ipAddress: asset.ipAddress,
      tagged: alertedAssetIds.has(asset.id),
      tags: asset.tags,
    },
  };
}

function mapIndicatorRisk(
  risk: ThreatIndicator["riskRating"]
): Severity {
  return risk === "critical"
    ? "critical"
    : risk === "high"
      ? "high"
      : risk === "medium"
        ? "medium"
        : "low";
}

function edgeLabel(type: GraphEdgeType): string {
  const labels: Record<GraphEdgeType, string> = {
    connection: "connects to",
    authentication: "authenticates to",
    process: "spawns on",
    dns: "queries",
    triggered: "triggered on",
    contains: "contains",
    observed: "observed",
    related: "related to",
  };
  return labels[type];
}

export function filterGraph(graph: GraphData, filters: GraphFilters): GraphData {
  const search = filters.search.trim().toLowerCase();
  let nodeIds = new Set(
    graph.nodes
      .filter((node) => filters.nodeTypes.includes(node.type))
      .filter(
        (node) =>
          !filters.minSeverity ||
          (node.severity != null &&
            SEVERITY_RANK[node.severity] >= SEVERITY_RANK[filters.minSeverity])
      )
      .map((node) => node.id)
  );

  if (search) {
    const matched = graph.nodes
      .filter(
        (node) =>
          node.label.toLowerCase().includes(search) ||
          node.id.toLowerCase().includes(search)
      )
      .map((node) => node.id);
    const matchedSet = new Set(matched);
    const neighbors = new Set(matched);
    for (const edge of graph.edges) {
      if (matchedSet.has(edge.source)) neighbors.add(edge.target);
      if (matchedSet.has(edge.target)) neighbors.add(edge.source);
    }
    nodeIds = new Set([...nodeIds].filter((id) => neighbors.has(id)));
  }

  const nodes = graph.nodes.filter((node) => nodeIds.has(node.id));
  const edges = graph.edges.filter(
    (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
  );
  return { nodes, edges };
}

export function incidentSubgraph(graph: GraphData, incidentId: string): GraphData {
  const root = graph.nodes.find((node) => node.id === incidentId);
  if (!root) return { nodes: [], edges: [] };
  const keep = new Set<string>([root.id]);
  let frontier = new Set<string>([root.id]);

  for (let depth = 0; depth < 2; depth += 1) {
    const next = new Set<string>();
    for (const edge of graph.edges) {
      if (frontier.has(edge.source) && !keep.has(edge.target)) {
        keep.add(edge.target);
        next.add(edge.target);
      }
      if (frontier.has(edge.target) && !keep.has(edge.source)) {
        keep.add(edge.source);
        next.add(edge.source);
      }
    }
    frontier = next;
  }

  return {
    nodes: graph.nodes.filter((node) => keep.has(node.id)),
    edges: graph.edges.filter(
      (edge) => keep.has(edge.source) && keep.has(edge.target)
    ),
  };
}

export function graphNodeTypeLabel(type: GraphNodeType): string {
  const labels: Record<GraphNodeType, string> = {
    host: "Hosts",
    user: "Identities",
    ip: "IP addresses",
    domain: "Domains",
    alert: "Alerts",
    incident: "Incidents",
    indicator: "Indicators",
  };
  return labels[type];
}
