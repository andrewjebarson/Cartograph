"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";

export interface FoldedNodeData extends Record<string, unknown> {
  id: string;
  label: string;
  directory: string;
  fileCount: number;
  fanIn: number;
  fanOut: number;
  category: string;
  isDimmed?: boolean;
  isSelected?: boolean;
  isHovered?: boolean;
  onToggleExpand: (id: string) => void;
  onSelect: (id: string) => void;
  onHover?: (id: string | null) => void;
}

export type FoldedCustomNode = Node<FoldedNodeData, "foldedNode">;

export const FoldedNode = memo(function FoldedNode({
  id,
  data,
}: NodeProps<FoldedCustomNode>) {
  const nodeData = data;
  const isDimmed = Boolean(nodeData.isDimmed);
  const isSelected = Boolean(nodeData.isSelected);
  const isHovered = Boolean(nodeData.isHovered);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        nodeData.onSelect(id);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        nodeData.onToggleExpand(id);
      }}
      onMouseEnter={() => nodeData.onHover?.(id)}
      onMouseLeave={() => nodeData.onHover?.(null)}
      className={`group relative rounded-md border text-xs shadow-sm transition-all duration-150 cursor-grab active:cursor-grabbing select-none ${
        isDimmed ? "opacity-25" : "opacity-100"
      } ${
        isSelected || isHovered
          ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500"
          : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-500"
      }`}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "8px 10px",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-zinc-400 dark:!bg-zinc-600 !border-0"
      />

      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <svg
            className="w-3.5 h-3.5 shrink-0 text-amber-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
          <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100 truncate">
            {nodeData.label}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            nodeData.onToggleExpand(id);
          }}
          title="Open folder"
          className="shrink-0 text-[10px] px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-200 dark:border-zinc-700"
        >
          {nodeData.fileCount}
        </button>
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 dark:text-zinc-400 pt-1 border-t border-zinc-100 dark:border-zinc-800">
        <span title="External files that import this folder">
          in: <strong className="text-zinc-700 dark:text-zinc-300">{nodeData.fanIn}</strong>
        </span>
        <span title="External files this folder imports">
          out: <strong className="text-zinc-700 dark:text-zinc-300">{nodeData.fanOut}</strong>
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-zinc-400 dark:!bg-zinc-600 !border-0"
      />
    </div>
  );
});
