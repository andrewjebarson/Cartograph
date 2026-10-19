import dagre from "dagre";
import type { FoldedNodeData } from "./folding.ts";

export interface PositionedNode extends FoldedNodeData {
  x: number;
  y: number;
}

export interface PositionedGraph {
  nodes: PositionedNode[];
  edges: {
    id: string;
    source: string;
    target: string;
    sourceFile: string;
    targetFile: string;
    count: number;
  }[];
}

/**
 * Computes deterministic layout for nodes and edges using dagre.
 */
export function layoutGraph(
  nodes: FoldedNodeData[],
  edges: {
    id: string;
    source: string;
    target: string;
    sourceFile: string;
    targetFile: string;
    count: number;
  }[],
  rankdir: "TB" | "LR" = "TB",
): PositionedGraph {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));

  g.setGraph({
    rankdir,
    nodesep: 60,
    ranksep: 90,
    marginx: 40,
    marginy: 40,
  });

  // Sort nodes deterministically
  const sortedNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  for (const node of sortedNodes) {
    g.setNode(node.id, {
      width: node.width,
      height: node.height,
    });
  }

  // Sort edges deterministically
  const sortedEdges = [...edges].sort((a, b) => a.id.localeCompare(b.id));
  for (const edge of sortedEdges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  const positionedNodes: PositionedNode[] = sortedNodes.map((node) => {
    const dagreNode = g.node(node.id);
    return {
      ...node,
      x: dagreNode.x - node.width / 2,
      y: dagreNode.y - node.height / 2,
    };
  });

  return {
    nodes: positionedNodes,
    edges: sortedEdges,
  };
}
