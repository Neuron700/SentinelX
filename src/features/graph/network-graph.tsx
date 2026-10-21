"use client";

import * as React from "react";
import * as d3 from "d3";
import { Minus, Plus, RotateCcw } from "lucide-react";
import type { GraphData, GraphNode, GraphNodeType } from "@/domain/models/graph";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export const NODE_COLORS: Record<GraphNodeType, string> = {
  host: "#22d3ee",
  user: "#a78bfa",
  ip: "#fbbf24",
  domain: "#34d399",
  alert: "#f87171",
  incident: "#60a5fa",
  indicator: "#f472b6",
};

export const SEVERITY_NODE_COLORS: Record<string, string> = {
  critical: "#ff4d6d",
  high: "#ff9f43",
  medium: "#f4d35e",
  low: "#4ade80",
  info: "#60a5fa",
};

const TYPE_RADIUS: Record<GraphNodeType, number> = {
  host: 11,
  user: 8,
  ip: 7,
  domain: 8,
  alert: 10,
  incident: 13,
  indicator: 9,
};

interface SimNode extends GraphNode, d3.SimulationNodeDatum {
  radius: number;
  labelOpacity: number;
}
type SimLink = d3.SimulationLinkDatum<SimNode> & {
  id: string;
  type: string;
  weight: number;
  label: string;
};

function nodeColor(node: SimNode): string {
  if (
    (node.type === "alert" || node.type === "incident" || node.type === "indicator") &&
    node.severity
  ) {
    return SEVERITY_NODE_COLORS[node.severity] ?? NODE_COLORS[node.type];
  }
  return NODE_COLORS[node.type];
}

export function NetworkGraph({
  data,
  selectedId,
  search,
  onSelect,
}: {
  data: GraphData;
  selectedId: string | null;
  search: string;
  onSelect: (node: GraphNode | null) => void;
}) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const zoomRef = React.useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(
    null
  );
  const positions = React.useRef(new Map<string, { x: number; y: number }>());
  const nodeGroupsRef = React.useRef<d3.Selection<
    SVGGElement,
    SimNode,
    SVGGElement,
    unknown
  > | null>(null);
  const linkLinesRef = React.useRef<d3.Selection<
    SVGLineElement,
    SimLink,
    SVGGElement,
    unknown
  > | null>(null);
  const [tooltip, setTooltip] = React.useState<{
    node: GraphNode;
    x: number;
    y: number;
    color: string;
  } | null>(null);

  const freezePositions = React.useCallback(() => {
    nodeGroupsRef.current?.each((node) => {
      if (node.x != null && node.y != null) {
        positions.current.set(node.id, { x: node.x, y: node.y });
      }
    });
  }, []);

  React.useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    freezePositions();

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const width = 960;
    const height = 560;
    const root = svg.append("g");

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 3])
      .on("zoom", (event) => {
        root.attr("transform", event.transform);
      });
    zoomRef.current = zoom;
    svg.call(zoom).on("dblclick.zoom", null);

    const nodes: SimNode[] = data.nodes.map((node, index) => {
      const previous = positions.current.get(node.id);
      const angle = index * 2.399963;
      const spread = 90 + (index % 7) * 18;
      return {
        ...node,
        radius: TYPE_RADIUS[node.type] ?? 8,
        labelOpacity: 0,
        x: previous?.x ?? width / 2 + Math.cos(angle) * spread,
        y: previous?.y ?? height / 2 + Math.sin(angle) * spread,
      };
    });
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const links: SimLink[] = data.edges
      .filter((edge) => nodeById.has(edge.source) && nodeById.has(edge.target))
      .map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type,
        weight: edge.weight,
        label: edge.label,
      }));

    const degree = new Map<string, number>();
    for (const edge of links) {
      degree.set(edge.source as string, (degree.get(edge.source as string) ?? 0) + 1);
      degree.set(edge.target as string, (degree.get(edge.target as string) ?? 0) + 1);
    }
    for (const node of nodes) {
      const nodeDegree = degree.get(node.id) ?? 0;
      const primary = node.type === "host" || node.type === "incident";
      const secondary =
        node.type === "user" || node.type === "domain" || node.type === "ip";
      node.labelOpacity =
        primary || (secondary && nodeDegree >= 3) ? 0.9 : 0;
    }

    const linkLayer = root.append("g").attr("class", "links");
    const nodeLayer = root.append("g").attr("class", "nodes");

    const link = linkLayer
      .selectAll<SVGLineElement, SimLink>("line")
      .data(links, (item) => item.id)
      .join("line")
      .attr("stroke", (item) =>
        item.type === "contains"
          ? "#60a5fa"
          : item.type === "triggered"
            ? "#f87171"
            : item.type === "observed"
              ? "#f472b6"
              : item.type === "dns"
                ? "#34d399"
                : "var(--border-hover)"
      )
      .attr("stroke-opacity", (item) =>
        item.type === "contains" || item.type === "triggered" || item.type === "observed"
          ? 0.42
          : 0.16
      )
      .attr("stroke-width", (item) => Math.min(3, 1 + Math.sqrt(item.weight) * 0.35))
      .attr("stroke-dasharray", (item) =>
        item.type === "observed" ? "3 3" : item.type === "triggered" ? "5 3" : null
      );
    linkLinesRef.current = link;

    const node = nodeLayer
      .selectAll<SVGGElement, SimNode>("g.node")
      .data(nodes, (item) => item.id)
      .join("g")
      .attr("class", "node")
      .style("cursor", "pointer")
      .on("click", (event, item) => {
        event.stopPropagation();
        onSelect(item);
      })
      .on("mouseenter", function (event, item) {
        const related = new Set<string>([item.id]);
        for (const edge of links) {
          const sourceId = typeof edge.source === "string" ? edge.source : (edge.source as SimNode).id;
          const targetId = typeof edge.target === "string" ? edge.target : (edge.target as SimNode).id;
          if (sourceId === item.id) related.add(targetId);
          if (targetId === item.id) related.add(sourceId);
        }
        nodeLayer
          .selectAll<SVGGElement, SimNode>("g.node")
          .attr("opacity", (candidate) => (related.has(candidate.id) ? 1 : 0.18));
        d3.select(this).select("text").attr("opacity", 1);
        link.attr("stroke-opacity", (edge) => {
          const sourceId = typeof edge.source === "string" ? edge.source : (edge.source as SimNode).id;
          const targetId = typeof edge.target === "string" ? edge.target : (edge.target as SimNode).id;
          return sourceId === item.id || targetId === item.id ? 1 : 0.08;
        });
        const pointer = d3.pointer(event, containerRef.current);
        setTooltip({
          node: item,
          x: pointer[0],
          y: pointer[1],
          color: nodeColor(item),
        });
      })
      .on("mousemove", (event) => {
        const pointer = d3.pointer(event, containerRef.current);
        setTooltip((current) =>
          current ? { ...current, x: pointer[0], y: pointer[1] } : current
        );
      })
      .on("mouseleave", function () {
        nodeLayer.selectAll<SVGGElement, SimNode>("g.node").attr("opacity", 1);
        nodeLayer
          .selectAll<SVGGElement, SimNode>("g.node")
          .select("text")
          .attr("opacity", (candidate) => candidate.labelOpacity);
        link.attr("stroke-opacity", (edge) =>
          edge.type === "contains" || edge.type === "triggered" || edge.type === "observed"
            ? 0.42
            : 0.16
        );
        setTooltip(null);
      });

    nodeGroupsRef.current = node;

    node
      .append("circle")
      .attr("r", (item) => item.radius)
      .attr("fill", (item) =>
        item.type === "host" ? "color-mix(in srgb, #22d3ee 14%, #0b1220)" : nodeColor(item)
      )
      .attr("stroke", (item) => nodeColor(item))
      .attr("stroke-width", 1.4)
      .attr("stroke-opacity", 0.85);

    node
      .filter((item) => item.type === "incident" || item.type === "alert")
      .append("circle")
      .attr("r", (item) => item.radius + 4)
      .attr("fill", "none")
      .attr("stroke", (item) => nodeColor(item))
      .attr("stroke-opacity", 0.22)
      .attr("stroke-width", 1);

    node
      .filter(
        (item) =>
          item.type === "host" ||
          item.type === "incident" ||
          item.type === "alert" ||
          item.type === "indicator"
      )
      .append("text")
      .text((item) =>
        item.label.length > 24 ? `${item.label.slice(0, 23)}…` : item.label
      )
      .attr("x", (item) => item.radius + 4)
      .attr("y", 3)
      .attr("font-family", "var(--font-mono)")
      .attr("font-size", 9)
      .attr("fill", "var(--muted)")
      .attr("opacity", (item) => item.labelOpacity)
      .attr("paint-order", "stroke")
      .attr("stroke", "var(--background)")
      .attr("stroke-width", 3)
      .attr("stroke-linejoin", "round")
      .style("pointer-events", "none");

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink<SimNode, SimLink>(links)
          .id((item) => item.id)
          .distance((item) =>
            item.type === "contains"
              ? 80
              : item.type === "triggered"
                ? 72
                : item.type === "observed"
                  ? 88
                  : 110
          )
          .strength(0.32)
      )
      .force("charge", d3.forceManyBody().strength(-360))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3.forceCollide<SimNode>().radius((item) => item.radius + 24)
      )
      .force("x", d3.forceX(width / 2).strength(0.03))
      .force("y", d3.forceY(height / 2).strength(0.03))
      .on("tick", () => {
        link
          .attr("x1", (item) => (item.source as SimNode).x ?? 0)
          .attr("y1", (item) => (item.source as SimNode).y ?? 0)
          .attr("x2", (item) => (item.target as SimNode).x ?? 0)
          .attr("y2", (item) => (item.target as SimNode).y ?? 0);
        node.attr(
          "transform",
          (item) => `translate(${item.x ?? 0},${item.y ?? 0})`
        );
        for (const item of nodes) {
          if (item.x != null && item.y != null) {
            positions.current.set(item.id, { x: item.x, y: item.y });
          }
        }
      });

    const drag = d3
      .drag<SVGGElement, SimNode>()
      .on("start", (event, item) => {
        if (!event.active) simulation.alphaTarget(0.25).restart();
        item.fx = item.x;
        item.fy = item.y;
      })
      .on("drag", (event, item) => {
        item.fx = event.x;
        item.fy = event.y;
      })
      .on("end", (event, item) => {
        if (!event.active) simulation.alphaTarget(0);
        item.fx = null;
        item.fy = null;
      });
    node.call(drag);

    svg.on("click", () => onSelect(null));

    return () => {
      simulation.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  React.useEffect(() => {
    if (!nodeGroupsRef.current) return;
    nodeGroupsRef.current.each(function (node) {
      const group = d3.select(this);
      const selected = node.id === selectedId;
      group
        .select("circle")
        .attr("stroke-width", selected ? 3 : 1.4)
        .attr("stroke", selected ? "#ffffff" : nodeColor(node));
      group
        .select("text")
        .attr("opacity", selected ? 1 : node.labelOpacity)
        .attr("fill", selected ? "var(--foreground)" : "var(--muted)");
    });
  }, [selectedId, data]);

  React.useEffect(() => {
    if (!nodeGroupsRef.current) return;
    const term = search.trim().toLowerCase();
    if (!term) {
      nodeGroupsRef.current.attr("opacity", 1);
      nodeGroupsRef.current
        .select("text")
        .attr("opacity", (node) => node.labelOpacity);
      return;
    }
    nodeGroupsRef.current.attr("opacity", (node) => {
      const matches =
        node.label.toLowerCase().includes(term) ||
        node.id.toLowerCase().includes(term);
      return matches ? 1 : 0.15;
    });
    nodeGroupsRef.current
      .select("text")
      .attr("opacity", (node) =>
        node.label.toLowerCase().includes(term) ||
        node.id.toLowerCase().includes(term)
          ? 1
          : node.labelOpacity * 0.3
      );
  }, [search, data]);

  const zoomBy = (factor: number) => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(200)
      .call(zoomRef.current.scaleBy, factor);
  };

  const resetView = () => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(300)
      .call(zoomRef.current.transform, d3.zoomIdentity);
    freezePositions();
  };

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--background)]"
    >
      <svg
        ref={svgRef}
        viewBox="0 0 960 560"
        role="img"
        aria-label="Entity relationship network graph"
        className="block h-[420px] w-full sm:h-[520px]"
      />
      {data.nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
          <p className="text-xs font-medium">No nodes match the filters</p>
          <p className="text-[11px] text-[var(--subtle)]">
            Enable more entity types or widen the time range.
          </p>
        </div>
      )}
      <div className="absolute bottom-2 right-2 flex flex-col gap-1">
        <Button
          variant="secondary"
          size="icon-sm"
          onClick={() => zoomBy(1.3)}
          aria-label="Zoom in"
        >
          <Plus />
        </Button>
        <Button
          variant="secondary"
          size="icon-sm"
          onClick={() => zoomBy(0.77)}
          aria-label="Zoom out"
        >
          <Minus />
        </Button>
        <Button
          variant="secondary"
          size="icon-sm"
          onClick={resetView}
          aria-label="Reset view"
        >
          <RotateCcw />
        </Button>
      </div>
      <div className="absolute left-3 top-2 flex items-center gap-2 rounded border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_85%,transparent)] px-2 py-1 font-mono text-[9px] text-[var(--subtle)] backdrop-blur">
        <span>{data.nodes.length} nodes</span>
        <span className="text-[var(--border-hover)]">·</span>
        <span>{data.edges.length} edges</span>
      </div>
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 max-w-[260px] -translate-y-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 shadow-xl"
          style={{
            left: Math.min(tooltip.x + 12, 700),
            top: tooltip.y - 8,
          }}
        >
          <p className="flex items-center gap-1.5 text-[11px] font-medium">
            <span
              className="size-1.5 rounded-full"
              style={{ background: tooltip.color }}
            />
            {tooltip.node.label}
          </p>
          <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--subtle)]">
            {tooltip.node.type}
            {tooltip.node.sublabel ? ` · ${tooltip.node.sublabel}` : ""}
          </p>
          {tooltip.node.riskScore != null && (
            <p className="mt-1 font-mono text-[9px] text-[var(--muted)]">
              risk score {tooltip.node.riskScore}
            </p>
          )}
          {tooltip.node.type === "host" && (
            <p className="mt-1 text-[10px] text-[var(--accent)]">
              click to inspect asset
            </p>
          )}
        </div>
      )}
      <p
        className={cn(
          "absolute bottom-2 left-3 font-mono text-[9px] text-[var(--subtle)]",
          "hidden sm:block"
        )}
      >
        drag nodes · scroll to zoom · click to inspect
      </p>
    </div>
  );
}
