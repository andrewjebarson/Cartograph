"use client";

import React, { useState, useMemo } from "react";
import type { ParseResult } from "../../lib/parser/types.ts";
import {
  computeRepoSummary,
  computeFileDetails,
  computeFolderDetails,
} from "../../lib/graph/details.ts";
import type { FoldedNodeData } from "../../lib/graph/folding.ts";

interface RightPaneProps {
  selectedId: string | null;
  parseResult: ParseResult;
  foldedNodes: FoldedNodeData[];
  edges: { source: string; target: string; count: number }[];
  hoveredId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
}

export function RightPane({
  selectedId,
  parseResult,
  foldedNodes,
  edges,
  hoveredId,
  onSelect,
  onHover,
}: RightPaneProps) {
  // Tab state survives selection changes
  const [activeTab, setActiveTab] = useState<"structure" | "explanation">("structure");

  // Determine what kind of selection we have
  const isFileSelected = selectedId
    ? parseResult.files.some((f) => f.path === selectedId)
    : false;
  const isFolderSelected = selectedId
    ? foldedNodes.some((n) => n.id === selectedId)
    : false;

  // Computations
  const repoSummary = useMemo(
    () => computeRepoSummary(parseResult),
    [parseResult],
  );

  const fileDetails = useMemo(() => {
    if (!isFileSelected || !selectedId) return null;
    return computeFileDetails(selectedId, parseResult);
  }, [isFileSelected, selectedId, parseResult]);

  const folderDetails = useMemo(() => {
    if (!isFolderSelected || !selectedId) return null;
    return computeFolderDetails(selectedId, foldedNodes, edges);
  }, [isFolderSelected, selectedId, foldedNodes, edges]);

  return (
    <aside className="w-84 shrink-0 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col h-full select-none overflow-hidden">
      {/* Pane Header with Tabs */}
      <div className="shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 px-3 pt-2">
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              {selectedId ? (isFileSelected ? "File Detail" : "Directory Detail") : "Repository Overview"}
            </span>
          </div>

          {selectedId && (
            <button
              onClick={() => onSelect(null)}
              className="text-[11px] font-mono text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800"
              title="Clear selection (return to repository summary)"
            >
              Clear ✕
            </button>
          )}
        </div>

        {/* Persistent Tabs */}
        <div className="flex items-center gap-1 text-xs font-mono -mb-px">
          <button
            onClick={() => setActiveTab("structure")}
            className={`px-3 py-1.5 border-b-2 font-medium transition-colors ${
              activeTab === "structure"
                ? "border-amber-500 text-amber-600 dark:text-amber-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            Structure
          </button>
          <button
            onClick={() => setActiveTab("explanation")}
            className={`px-3 py-1.5 border-b-2 font-medium transition-colors ${
              activeTab === "explanation"
                ? "border-amber-500 text-amber-600 dark:text-amber-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            Explanation
          </button>
        </div>
      </div>

      {/* Pane Content Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {activeTab === "explanation" ? (
          /* Explanation Tab (Empty state until Phase 6 / 7 AI integration) */
          <div className="py-8 px-2 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 mb-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              AI Code Explanation
            </h3>
            <p className="text-[11px] text-zinc-400 mt-1.5 max-w-xs leading-relaxed font-sans">
              Model-driven explanation will be generated here in Phase 6 &amp; 7
              using local Ollama or Gemini free tier.
            </p>
            <div className="mt-4 p-2 rounded bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-[10px] font-mono text-zinc-400 text-left w-full space-y-1">
              <div>• Cache reads will appear inside trace.</div>
              <div>• Cache hit will record zero model calls.</div>
              <div>• Tab selection is preserved across files.</div>
            </div>
          </div>
        ) : !selectedId ? (
          /* RESTING STATE: Repository Overview when nothing is selected */
          <div className="space-y-4">
            <div>
              <div className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">
                Target Repository
              </div>
              <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-mono mt-0.5">
                {repoSummary.name}
              </div>
              <div className="inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                {repoSummary.framework}
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-100 dark:border-zinc-800/80">
                <span className="text-[10px] text-zinc-400 block">Total Files</span>
                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  {repoSummary.fileCount}
                </span>
              </div>
              <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-100 dark:border-zinc-800/80">
                <span className="text-[10px] text-zinc-400 block">Dependencies</span>
                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  {repoSummary.edgeCount}
                </span>
              </div>
              <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-100 dark:border-zinc-800/80">
                <span className="text-[10px] text-zinc-400 block">API Routes</span>
                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  {repoSummary.routeCount}
                </span>
              </div>
              <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-100 dark:border-zinc-800/80">
                <span className="text-[10px] text-zinc-400 block">Unidentified</span>
                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  {repoSummary.unidentifiedCount}
                </span>
              </div>
            </div>

            {/* List 1: Most depended on (ordered by fan-in desc) */}
            <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                <span>Leaned on most (highest fan-in)</span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {repoSummary.mostDependedOn.length}
                </span>
              </div>
              <div className="space-y-1">
                {repoSummary.mostDependedOn.map((file) => {
                  const fileName = file.path.split("/").pop() || file.path;
                  const isHovered = hoveredId === file.path;

                  return (
                    <div
                      key={file.path}
                      onClick={() => onSelect(file.path)}
                      onMouseEnter={() => onHover(file.path)}
                      onMouseLeave={() => onHover(null)}
                      className={`flex items-center justify-between px-2 py-1 rounded text-xs font-mono cursor-pointer transition-colors ${
                        isHovered
                          ? "bg-amber-500/20 text-amber-900 dark:text-amber-200 ring-1 ring-amber-500"
                          : "bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <span className="truncate pr-2 font-medium" title={file.path}>
                        {fileName}
                      </span>
                      <span className="shrink-0 text-[10px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
                        {file.fanIn} in
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* List 2: Where reading starts (entrypoints, fan-in === 0) */}
            <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                <span>Where reading starts (0 fan-in)</span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {repoSummary.entrypoints.length}
                </span>
              </div>
              <div className="space-y-1">
                {repoSummary.entrypoints.map((file) => {
                  const fileName = file.path.split("/").pop() || file.path;
                  const isHovered = hoveredId === file.path;

                  return (
                    <div
                      key={file.path}
                      onClick={() => onSelect(file.path)}
                      onMouseEnter={() => onHover(file.path)}
                      onMouseLeave={() => onHover(null)}
                      className={`flex items-center justify-between px-2 py-1 rounded text-xs font-mono cursor-pointer transition-colors ${
                        isHovered
                          ? "bg-amber-500/20 text-amber-900 dark:text-amber-200 ring-1 ring-amber-500"
                          : "bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <span className="truncate pr-2 font-medium" title={file.path}>
                        {fileName}
                      </span>
                      <span className="shrink-0 text-[10px] px-1 py-0.2 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-500 font-medium">
                        {file.fanOut} out
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : isFileSelected && fileDetails ? (
          /* FILE SELECTED: Structure details */
          <div className="space-y-4">
            <div>
              <span className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">
                File Path
              </span>
              <p className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100 break-all mt-0.5">
                {fileDetails.file.path}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                  {fileDetails.category}
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  {fileDetails.file.extension}
                </span>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-100 dark:border-zinc-800/80">
                <span className="text-[10px] text-zinc-400 block">Length</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                  {fileDetails.file.lineCount} lines
                </span>
              </div>
              <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-100 dark:border-zinc-800/80">
                <span className="text-[10px] text-zinc-400 block">Size</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                  {fileDetails.file.byteSize} bytes
                </span>
              </div>
              <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-100 dark:border-zinc-800/80">
                <span className="text-[10px] text-zinc-400 block">Depends on (out)</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                  {fileDetails.dependencies.length}
                </span>
              </div>
              <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-100 dark:border-zinc-800/80">
                <span className="text-[10px] text-zinc-400 block">Depended on by (in)</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                  {fileDetails.dependents.length}
                </span>
              </div>
            </div>

            {/* Section 1: Depends on (Exact row count matching number) */}
            <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                <span>Depends on</span>
                <span className="text-[10px] font-mono text-zinc-400">
                  {fileDetails.dependencies.length}
                </span>
              </div>

              {fileDetails.dependencies.length === 0 ? (
                <div className="text-[11px] font-mono text-zinc-400 py-1 italic">
                  No internal or external dependencies
                </div>
              ) : (
                <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                  {fileDetails.dependencies.map((dep, idx) => {
                    const isHovered = hoveredId === dep.path;
                    return (
                      <div
                        key={`${dep.path}-${idx}`}
                        onClick={() => {
                          if (!dep.isExternal) onSelect(dep.path);
                        }}
                        onMouseEnter={() => {
                          if (!dep.isExternal) onHover(dep.path);
                        }}
                        onMouseLeave={() => onHover(null)}
                        className={`flex items-center justify-between px-2 py-1 rounded text-xs font-mono transition-colors ${
                          dep.isExternal
                            ? "bg-zinc-50/50 dark:bg-zinc-900/30 text-zinc-500 cursor-default"
                            : isHovered
                              ? "bg-amber-500/20 text-amber-900 dark:text-amber-200 ring-1 ring-amber-500 cursor-pointer"
                              : "bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                        }`}
                      >
                        <span className="truncate pr-2" title={dep.path}>
                          {dep.path.split("/").pop()}
                        </span>
                        {dep.isExternal ? (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-400">
                            ext
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-400">→</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 2: Depended on by (Exact row count matching number) */}
            <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                <span>Depended on by</span>
                <span className="text-[10px] font-mono text-zinc-400">
                  {fileDetails.dependents.length}
                </span>
              </div>

              {fileDetails.dependents.length === 0 ? (
                <div className="text-[11px] font-mono text-zinc-400 py-1 italic">
                  Nothing depends on this file (entrypoint)
                </div>
              ) : (
                <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                  {fileDetails.dependents.map((dep, idx) => {
                    const isHovered = hoveredId === dep.path;
                    return (
                      <div
                        key={`${dep.path}-${idx}`}
                        onClick={() => onSelect(dep.path)}
                        onMouseEnter={() => onHover(dep.path)}
                        onMouseLeave={() => onHover(null)}
                        className={`flex items-center justify-between px-2 py-1 rounded text-xs font-mono cursor-pointer transition-colors ${
                          isHovered
                            ? "bg-amber-500/20 text-amber-900 dark:text-amber-200 ring-1 ring-amber-500"
                            : "bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        <span className="truncate pr-2" title={dep.path}>
                          {dep.path.split("/").pop()}
                        </span>
                        <span className="text-[10px] text-amber-500 font-bold">←</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : isFolderSelected && folderDetails ? (
          /* FOLDER SELECTED: Structure details */
          <div className="space-y-4">
            <div>
              <span className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">
                Directory
              </span>
              <p className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100 break-all mt-0.5">
                {folderDetails.folder.label}
              </p>
              <p className="font-mono text-[10px] text-zinc-400 break-all mt-0.5">
                {folderDetails.folder.directory}
              </p>
            </div>

            {/* Folder Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-100 dark:border-zinc-800/80">
                <span className="text-[10px] text-zinc-400 block">Total Files</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                  {folderDetails.files.length}
                </span>
              </div>
              <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-100 dark:border-zinc-800/80">
                <span className="text-[10px] text-zinc-400 block">Status</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {folderDetails.folder.isExpanded ? "Expanded" : "Folded"}
                </span>
              </div>
              <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-100 dark:border-zinc-800/80">
                <span className="text-[10px] text-zinc-400 block">Fan-in (depended on)</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                  {folderDetails.folder.fanIn}
                </span>
              </div>
              <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-100 dark:border-zinc-800/80">
                <span className="text-[10px] text-zinc-400 block">Fan-out (depends on)</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                  {folderDetails.folder.fanOut}
                </span>
              </div>
            </div>

            {/* Category Breakdown inside this folder */}
            <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                File Breakdown
              </div>
              <div className="space-y-1">
                {folderDetails.categoryBreakdown.map((cat) => (
                  <div
                    key={cat.category}
                    className="flex items-center justify-between text-xs font-mono px-2 py-1 rounded bg-zinc-50 dark:bg-zinc-900/50"
                  >
                    <span className="text-zinc-600 dark:text-zinc-400">{cat.category}</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">{cat.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Files List inside this folder */}
            <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                <span>Files in Folder</span>
                <span className="text-[10px] font-mono text-zinc-400">
                  {folderDetails.files.length}
                </span>
              </div>
              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                {folderDetails.files.map((file) => {
                  const fileName = file.path.split("/").pop() || file.path;
                  const isHovered = hoveredId === file.path;

                  return (
                    <div
                      key={file.path}
                      onClick={() => onSelect(file.path)}
                      onMouseEnter={() => onHover(file.path)}
                      onMouseLeave={() => onHover(null)}
                      className={`flex items-center justify-between px-2 py-1 rounded text-xs font-mono cursor-pointer transition-colors ${
                        isHovered
                          ? "bg-amber-500/20 text-amber-900 dark:text-amber-200 ring-1 ring-amber-500"
                          : "bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <span className="truncate pr-2 font-medium" title={file.path}>
                        {fileName}
                      </span>
                      <span className="shrink-0 text-[10px] text-zinc-400">
                        {file.lineCount}L
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
