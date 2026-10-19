"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { ParseResult } from "../../lib/parser/types.ts";
import { computeFoldedGraph } from "../../lib/graph/folding.ts";
import { layoutGraph } from "../../lib/graph/layout.ts";
import { FoldedNode } from "./folded-node.tsx";
import { ExpandedPanelNode } from "./expanded-panel-node.tsx";

const nodeTypes: NodeTypes = {
  foldedNode: FoldedNode,
  expandedPanel: ExpandedPanelNode,
};

interface MapCanvasProps {
  parseResult: ParseResult;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

function InnerMapCanvas({ parseResult, selectedId, onSelect }: MapCanvasProps) {
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());
  const { fitView, getZoom } = useReactFlow();
  const prevExpandedCount = useRef(0);

  // Toggle folder open/closed
  const handleToggleExpand = useCallback((nodeId: string) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Compute graph data
  const { positionedNodes, positionedEdges, fileToNodeMap } = useMemo(() => {
    const folded = computeFoldedGraph(
      parseResult.files,
      parseResult.edges,
      expandedNodeIds,
    );
    const layout = layoutGraph(folded.nodes, folded.edges, "TB");
    return {
      positionedNodes: layout.nodes,
      positionedEdges: layout.edges,
      fileToNodeMap: folded.fileToNodeMap,
    };
  }, [parseResult, expandedNodeIds]);

  // Compute active & dimmed sets based on selection
  const { activeNodeIds, activeEdgeIds } = useMemo(() => {
    if (!selectedId) {
      return { activeNodeIds: new Set<string>(), activeEdgeIds: new Set<string>() };
    }

    const activeNodes = new Set<string>();
    const activeEdges = new Set<string>();

    // Case 1: selectedId is a file path
    const fileFolder = fileToNodeMap.get(selectedId);
    if (fileFolder) {
      activeNodes.add(fileFolder);
      for (const e of positionedEdges) {
        if (e.sourceFile === selectedId || e.targetFile === selectedId) {
          activeEdges.add(e.id);
          activeNodes.add(e.source);
          activeNodes.add(e.target);
        }
      }
      return { activeNodeIds: activeNodes, activeEdgeIds: activeEdges };
    }

    // Case 2: selectedId is a folder node ID
    activeNodes.add(selectedId);
    for (const e of positionedEdges) {
      if (e.source === selectedId || e.target === selectedId) {
        activeEdges.add(e.id);
        activeNodes.add(e.source);
        activeNodes.add(e.target);
      }
    }

    return { activeNodeIds: activeNodes, activeEdgeIds: activeEdges };
  }, [selectedId, positionedEdges, fileToNodeMap]);

  // Refit on expand (Never zoom in, only zoom out)
  useEffect(() => {
    if (expandedNodeIds.size > prevExpandedCount.current) {
      // Small timeout to allow DOM to layout expanded node
      const timer = setTimeout(() => {
        try {
          const currentZoom = getZoom();
          fitView({
            duration: 300,
            maxZoom: Math.max(0.1, currentZoom), // Never zoom in past current zoom
            padding: 0.2,
          });
        } catch {
          // ignore layout race
        }
      }, 50);
      return () => clearTimeout(timer);
    }
    prevExpandedCount.current = expandedNodeIds.size;
  }, [expandedNodeIds, fitView, getZoom]);

  // Convert to React Flow Nodes
  const nodes: Node[] = useMemo(() => {
    const hasSelection = Boolean(selectedId);

    return positionedNodes.map((n) => {
      const isDimmed = hasSelection && !activeNodeIds.has(n.id);
      const isSelected = selectedId === n.id;

      if (n.isExpanded) {
        return {
          id: n.id,
          type: "expandedPanel",
          position: { x: n.x, y: n.y },
          data: {
            id: n.id,
            label: n.label,
            directory: n.directory,
            files: n.files,
            fileCount: n.fileCount,
            fanIn: n.fanIn,
            fanOut: n.fanOut,
            isDimmed,
            selectedFile: selectedId,
            onToggleExpand: handleToggleExpand,
            onSelectFile: (filePath: string) => onSelect(filePath),
            onSelectFolder: (id: string) => onSelect(id),
          },
        };
      }

      return {
        id: n.id,
        type: "foldedNode",
        position: { x: n.x, y: n.y },
        style: { width: n.width, height: n.height },
        data: {
          id: n.id,
          label: n.label,
          directory: n.directory,
          fileCount: n.fileCount,
          fanIn: n.fanIn,
          fanOut: n.fanOut,
          category: n.category,
          isDimmed,
          isSelected,
          onToggleExpand: handleToggleExpand,
          onSelect: (id: string) => onSelect(id),
        },
      };
    });
  }, [positionedNodes, selectedId, activeNodeIds, handleToggleExpand, onSelect]);

  // Convert to React Flow Edges
  const edges: Edge[] = useMemo(() => {
    const hasSelection = Boolean(selectedId);

    return positionedEdges.map((e) => {
      const isSrcExpanded = expandedNodeIds.has(e.source);
      const isTgtExpanded = expandedNodeIds.has(e.target);
      const isEdgeActive = activeEdgeIds.has(e.id);
      const isDimmed = hasSelection && !isEdgeActive;

      return {
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: isSrcExpanded ? e.sourceFile : undefined,
        targetHandle: isTgtExpanded ? e.targetFile : undefined,
        animated: isEdgeActive,
        style: {
          stroke: isEdgeActive
            ? "#f59e0b"
            : "#a1a1aa",
          strokeWidth: isEdgeActive ? 2 : 1,
          opacity: isDimmed ? 0.15 : 0.8,
          transition: "opacity 150ms ease, stroke 150ms ease",
        },
      };
    });
  }, [positionedEdges, expandedNodeIds, selectedId, activeEdgeIds]);

  return (
    <div
      className="relative w-full h-full bg-zinc-50 dark:bg-zinc-950 overflow-hidden"
      onClick={() => onSelect(null)}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2.5}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        onPaneClick={() => onSelect(null)}
      >
        <Background gap={18} size={1} className="!opacity-40" />
        <Controls
          className="!bg-white dark:!bg-zinc-900 !border-zinc-300 dark:!border-zinc-700 !fill-zinc-700 dark:!fill-zinc-300"
          showInteractive={false}
        />
        <MiniMap
          nodeStrokeWidth={3}
          nodeColor={(node) => {
            return node.type === "expandedPanel" ? "#f59e0b" : "#71717a";
          }}
          maskColor="rgba(0, 0, 0, 0.4)"
          className="!border !border-zinc-300 dark:!border-zinc-800 !bg-white/80 dark:!bg-zinc-900/80 !rounded-md"
        />
      </ReactFlow>
    </div>
  );
}

export function MapCanvas(props: MapCanvasProps) {
  return (
    <ReactFlowProvider>
      <InnerMapCanvas {...props} />
    </ReactFlowProvider>
  );
}
