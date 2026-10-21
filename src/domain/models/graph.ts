import type { Severity } from "./common";

export type GraphNodeType =
  | "host"
  | "user"
  | "ip"
  | "domain"
  | "alert"
  | "incident"
  | "indicator";

export type GraphEdgeType =
  | "connection"
  | "authentication"
  | "process"
  | "dns"
  | "triggered"
  | "contains"
  | "observed"
  | "related";

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  sublabel?: string;
  severity?: Severity;
  riskScore?: number;
  metadata: Record<string, unknown>;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: GraphEdgeType;
  weight: number;
  label: string;
  metadata: Record<string, unknown>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphFilters {
  nodeTypes: GraphNodeType[];
  minSeverity: Severity | null;
  search: string;
  incidentId: string | null;
}
