"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { ParsedFile } from "../../lib/parser/types.ts";
import { deriveCategory } from "../../lib/graph/folding.ts";

export interface ExpandedPanelData extends Record<string, unknown> {
  id: string;
  label: string;
  directory: string;
  files: ParsedFile[];
  fileCount: number;
  fanIn: number;
  fanOut: number;
  isDimmed?: boolean;
  selectedFile?: string | null;
  hoveredFile?: string | null;
  activeCategory?: string | null;
  onToggleExpand: (id: string) => void;
  onSelectFile: (filePath: string) => void;
  onSelectFolder: (id: string) => void;
  onHoverFile?: (filePath: string | null) => void;
}

export type ExpandedCustomNode = Node<ExpandedPanelData, "expandedPanel">;

const MAX_VISIBLE_ROWS = 10;

export const ExpandedPanelNode = memo(function ExpandedPanelNode({
  id,
  data,
}: NodeProps<ExpandedCustomNode>) {
  const panelData = data;
  const isDimmed = Boolean(panelData.isDimmed);
  const visibleFiles = panelData.files.slice(0, MAX_VISIBLE_ROWS);
  const remainingCount = panelData.files.length - MAX_VISIBLE_ROWS;

  const matchCount = panelData.activeCategory
    ? panelData.files.filter((f) => {
        if (f.role) {
          const r = f.role.toLowerCase();
          const c = (panelData.activeCategory || "").toLowerCase();
          if (c.includes(r) || r.includes(c)) return true;
          if (c === "guards" && (r === "guard" || r === "directive" || r === "pipe")) return true;
          if (c === "components" && r === "component") return true;
          if (c === "services" && r === "service") return true;
          if (c === "modules" && r === "module") return true;
          if (c === "controllers" && r === "controller") return true;
          if (c === "repositories" && r === "repository") return true;
          if (c === "entities" && r === "entity") return true;
        }
        return deriveCategory(f.path) === panelData.activeCategory;
      }).length
    : 0;

  return (
    <div
      className={`relative w-72 rounded-lg border shadow-md bg-white dark:bg-zinc-900 transition-all duration-150 select-none overflow-hidden ${
        isDimmed ? "opacity-25" : "opacity-100"
      } border-zinc-300 dark:border-zinc-700`}
      onClick={(e) => {
        e.stopPropagation();
        panelData.onSelectFolder(id);
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-zinc-400 dark:!bg-zinc-600 !border-0"
      />

      {/* Panel Header */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          panelData.onToggleExpand(id);
        }}
        title="Click to collapse"
        className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 rounded-t-lg cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
      >
        <div className="flex items-center gap-2 min-w-0">
          <svg
            className="w-4 h-4 shrink-0 text-amber-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
              clipRule="evenodd"
            />
          </svg>
          <div className="min-w-0">
            <span className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate block">
              {panelData.label}
            </span>
            <span className="text-[10px] text-zinc-400 font-mono truncate block">
              {panelData.directory}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {panelData.activeCategory ? (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold border border-amber-500/30">
              {matchCount} of {panelData.files.length} match
            </span>
          ) : (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              {panelData.fileCount} files
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              panelData.onToggleExpand(id);
            }}
            title="Close panel"
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-0.5"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Fan In/Out Sub-bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-zinc-50/50 dark:bg-zinc-900/50 text-[10px] font-mono text-zinc-500 dark:text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
        <span>
          fan-in: <strong className="text-zinc-800 dark:text-zinc-200">{panelData.fanIn}</strong>
        </span>
        <span>
          fan-out: <strong className="text-zinc-800 dark:text-zinc-200">{panelData.fanOut}</strong>
        </span>
      </div>

      {/* File Rows */}
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 overflow-hidden">
        {visibleFiles.map((file) => {
          const fileName = file.path.split("/").pop() || file.path;
          const isFileSelected = panelData.selectedFile === file.path;
          const isFileHovered = panelData.hoveredFile === file.path;
          const isCategoryMatch =
            !panelData.activeCategory ||
            deriveCategory(file.path) === panelData.activeCategory;

          return (
            <div
              key={file.path}
              onClick={(e) => {
                e.stopPropagation();
                panelData.onSelectFile(file.path);
              }}
              onMouseEnter={() => panelData.onHoverFile?.(file.path)}
              onMouseLeave={() => panelData.onHoverFile?.(null)}
              className={`relative flex items-center justify-between px-3 py-1.5 text-xs font-mono cursor-pointer transition-colors ${
                !isCategoryMatch ? "opacity-30" : "opacity-100"
              } ${
                isFileSelected
                  ? "bg-amber-500/20 text-amber-900 dark:text-amber-200 font-medium ring-1 ring-amber-500"
                  : isFileHovered
                    ? "bg-amber-500/10 text-amber-800 dark:text-amber-300 ring-1 ring-amber-400"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              }`}
            >
              {/* Row Target Handle */}
              <Handle
                type="target"
                position={Position.Left}
                id={file.path}
                className="!w-1.5 !h-1.5 !-left-1 !bg-zinc-400 dark:!bg-zinc-500 !border-0"
              />

              <span className="truncate pr-2">{fileName}</span>
              <span className="shrink-0 text-[10px] text-zinc-400">
                {file.lineCount}L
              </span>

              {/* Row Source Handle */}
              <Handle
                type="source"
                position={Position.Right}
                id={file.path}
                className="!w-1.5 !h-1.5 !-right-1 !bg-zinc-400 dark:!bg-zinc-500 !border-0"
              />
            </div>
          );
        })}

        {remainingCount > 0 && (
          <div className="px-3 py-2 text-center text-[10px] font-mono text-zinc-400 bg-zinc-50/50 dark:bg-zinc-950/30">
            +{remainingCount} more files in directory
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-zinc-400 dark:!bg-zinc-600 !border-0"
      />
    </div>
  );
});
