"use client";

import React, { useState, useMemo } from "react";
import type { ParseResult } from "../../lib/parser/types.ts";
import {
  computeRepoSummary,
  computeFileDetails,
  computeFolderDetails,
} from "../../lib/graph/details.ts";
import type { FoldedNodeData } from "../../lib/graph/folding.ts";
import type { ExtractedRoute } from "../../lib/adapters/types.ts";
import {
  computeTransitiveWalk,
  computeInsights,
} from "../../lib/graph/insights.ts";
import { ExplanationPanel, type ExplanationData } from "./explanation-panel.tsx";
import { AskPanel } from "./ask-panel.tsx";

interface RightPaneProps {
  analysisId?: string;
  selectedId: string | null;
  parseResult: ParseResult;
  foldedNodes: FoldedNodeData[];
  edges: { source: string; target: string; count: number }[];
  hoveredId: string | null;
  routes?: ExtractedRoute[];
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
}

export function RightPane({
  analysisId,
  selectedId,
  parseResult,
  foldedNodes,
  edges,
  hoveredId,
  routes = [],
  onSelect,
  onHover,
}: RightPaneProps) {
  // Phase 12: Ask mode replaces the whole pane
  const [isAskMode, setIsAskMode] = useState(false);

  // Tab state survives selection changes
  const [activeTab, setActiveTab] = useState<"structure" | "explanation">("structure");

  // Phase 10: Explanation cache state across selections
  const [explanations, setExplanations] = useState<Record<string, ExplanationData>>({});
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [explanationError, setExplanationError] = useState<string | null>(null);

  const handleExplain = async (
    targetPath: string,
    targetType: "file" | "folder",
    forceRefresh = false,
  ) => {
    setIsLoadingExplanation(true);
    setExplanationError(null);
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId: analysisId || "default",
          targetPath,
          targetType,
          forceRefresh,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errData.error || `Failed to generate explanation (${res.status})`);
      }

      const data: ExplanationData = await res.json();
      setExplanations((prev) => ({ ...prev, [targetPath]: data }));
    } catch (err) {
      setExplanationError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingExplanation(false);
    }
  };

  // Phase 6: Transitive walk mode for selected file ('direct' | 'blast-radius' | 'dependency-chain')
  const [walkMode, setWalkMode] = useState<"direct" | "blast-radius" | "dependency-chain">("direct");

  // Phase 6: Insights panel starts collapsed
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);

  // Determine what kind of selection we have
  const isFileSelected = selectedId
    ? parseResult.files.some((f) => f.path === selectedId)
    : false;
  const isFolderSelected = selectedId
    ? foldedNodes.some((n) => n.id === selectedId)
    : false;

  // Computations
  const repoSummary = useMemo(
    () => computeRepoSummary(parseResult, parseResult.rootPath, routes.length),
    [parseResult, routes.length],
  );

  const insights = useMemo(
    () => computeInsights(parseResult.files, parseResult.edges),
    [parseResult],
  );

  const unimportedInsights = useMemo(
    () => insights.filter((i) => i.type === "unimported"),
    [insights],
  );
  const centralInsights = useMemo(
    () => insights.filter((i) => i.type === "central"),
    [insights],
  );
  const cycleInsights = useMemo(
    () => insights.filter((i) => i.type === "cycle"),
    [insights],
  );
  const oversizedInsights = useMemo(
    () => insights.filter((i) => i.type === "oversized"),
    [insights],
  );

  const fileDetails = useMemo(() => {
    if (!isFileSelected || !selectedId) return null;
    return computeFileDetails(selectedId, parseResult);
  }, [isFileSelected, selectedId, parseResult]);

  // Transitive walks for the selected file
  const blastRadius = useMemo(() => {
    if (!isFileSelected || !selectedId) return null;
    return computeTransitiveWalk(selectedId, parseResult.edges, parseResult.files, "blast-radius", 2);
  }, [isFileSelected, selectedId, parseResult]);

  const dependencyChain = useMemo(() => {
    if (!isFileSelected || !selectedId) return null;
    return computeTransitiveWalk(selectedId, parseResult.edges, parseResult.files, "dependency-chain", 2);
  }, [isFileSelected, selectedId, parseResult]);

  const folderDetails = useMemo(() => {
    if (!isFolderSelected || !selectedId) return null;
    return computeFolderDetails(selectedId, foldedNodes, edges);
  }, [isFolderSelected, selectedId, foldedNodes, edges]);

  // Phase 12: Ask mode replaces the whole pane
  if (isAskMode) {
    return (
      <AskPanel
        analysisId={analysisId}
        selectedId={selectedId}
        onSelect={onSelect}
        onClose={() => setIsAskMode(false)}
      />
    );
  }

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

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsAskMode(true)}
              className="text-[11px] font-mono font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors flex items-center gap-1"
              title="Ask the repository a question (replaces pane)"
            >
              <span>💬</span>
              <span>Ask</span>
            </button>
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
          <ExplanationPanel
            selectedId={selectedId}
            files={parseResult.files}
            currentExplanation={selectedId ? explanations[selectedId] || null : null}
            isLoading={isLoadingExplanation}
            error={explanationError}
            onExplain={handleExplain}
            onSelectFile={(path) => onSelect(path)}
          />
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

            {/* Phase 6: Codebase Insights Panel (Starts collapsed, explains facts without grading) */}
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={() => setIsInsightsOpen(!isInsightsOpen)}
                className="w-full flex items-center justify-between text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 py-1 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Codebase Insights</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-medium">
                    {insights.length}
                  </span>
                </div>
                <span className="text-xs font-mono text-zinc-400">
                  {isInsightsOpen ? "▾" : "▸"}
                </span>
              </button>

              {isInsightsOpen && (
                <div className="mt-2 space-y-3">
                  {/* 1. Files nothing imports */}
                  {unimportedInsights.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                        <span>Files nothing imports</span>
                        <span>{unimportedInsights.length}</span>
                      </div>
                      <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                        {unimportedInsights.map((insight) => (
                          <div
                            key={insight.id}
                            onClick={() => onSelect(insight.file)}
                            onMouseEnter={() => onHover(insight.file)}
                            onMouseLeave={() => onHover(null)}
                            className="p-1.5 rounded bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-mono cursor-pointer transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate pr-1">
                                {insight.title}
                              </span>
                              <span className="text-[10px] text-zinc-400 shrink-0">
                                {insight.metric}
                              </span>
                            </div>
                            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                              {insight.description}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. High centrality */}
                  {centralInsights.length > 0 && (
                    <div className="space-y-1 pt-1.5 border-t border-zinc-100 dark:border-zinc-800/80">
                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                        <span>High centrality</span>
                        <span>{centralInsights.length}</span>
                      </div>
                      <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                        {centralInsights.map((insight) => (
                          <div
                            key={insight.id}
                            onClick={() => onSelect(insight.file)}
                            onMouseEnter={() => onHover(insight.file)}
                            onMouseLeave={() => onHover(null)}
                            className="p-1.5 rounded bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-mono cursor-pointer transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate pr-1">
                                {insight.title}
                              </span>
                              <span className="text-[10px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold shrink-0">
                                {insight.metric}
                              </span>
                            </div>
                            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                              {insight.description}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3. Circular dependency cycles */}
                  {cycleInsights.length > 0 && (
                    <div className="space-y-1 pt-1.5 border-t border-zinc-100 dark:border-zinc-800/80">
                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                        <span>Import cycles</span>
                        <span>{cycleInsights.length}</span>
                      </div>
                      <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                        {cycleInsights.map((insight) => (
                          <div
                            key={insight.id}
                            onClick={() => onSelect(insight.file)}
                            onMouseEnter={() => onHover(insight.file)}
                            onMouseLeave={() => onHover(null)}
                            className="p-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-xs font-mono cursor-pointer transition-colors hover:bg-amber-500/15"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-amber-700 dark:text-amber-300 truncate pr-1 text-[11px]">
                                {insight.title}
                              </span>
                              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold shrink-0">
                                {insight.metric}
                              </span>
                            </div>
                            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                              {insight.description}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 4. Oversized files */}
                  {oversizedInsights.length > 0 && (
                    <div className="space-y-1 pt-1.5 border-t border-zinc-100 dark:border-zinc-800/80">
                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                        <span>Oversized files</span>
                        <span>{oversizedInsights.length}</span>
                      </div>
                      <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                        {oversizedInsights.map((insight) => (
                          <div
                            key={insight.id}
                            onClick={() => onSelect(insight.file)}
                            onMouseEnter={() => onHover(insight.file)}
                            onMouseLeave={() => onHover(null)}
                            className="p-1.5 rounded bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-mono cursor-pointer transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate pr-1">
                                {insight.title}
                              </span>
                              <span className="text-[10px] text-zinc-400 shrink-0">
                                {insight.metric}
                              </span>
                            </div>
                            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                              {insight.description}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
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
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {fileDetails.file.role && (
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    {fileDetails.file.role}
                  </span>
                )}
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

            {/* Declared Routes / Endpoints in this file */}
            {routes.filter((r) => r.filePath === fileDetails.file.path).length > 0 && (
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between text-[10px] uppercase font-semibold text-zinc-400 tracking-wider mb-1.5">
                  <span>Declared Endpoints</span>
                  <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                    {routes.filter((r) => r.filePath === fileDetails.file.path).length}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {routes
                    .filter((r) => r.filePath === fileDetails.file.path)
                    .map((r) => (
                      <div
                        key={r.id}
                        className="p-2 rounded bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-xs font-mono"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            {r.method}
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            line {r.line}
                          </span>
                        </div>
                        <div className="mt-1 font-semibold text-zinc-800 dark:text-zinc-200 break-all">
                          {r.path}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Phase 6: Blast Radius & Dependency Chain Actions */}
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider mb-1.5">
                Transitive Graph Walks
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() =>
                    setWalkMode(walkMode === "blast-radius" ? "direct" : "blast-radius")
                  }
                  className={`px-2 py-1.5 text-xs font-mono font-medium rounded border transition-colors flex items-center justify-between ${
                    walkMode === "blast-radius"
                      ? "bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400 font-bold"
                      : "bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                  title="Everything that breaks if this file changes (upstream 2 hops)"
                >
                  <span>Blast radius</span>
                  <span className="text-[10px] font-normal text-zinc-400">
                    {walkMode === "blast-radius" ? "active" : "2 hops"}
                  </span>
                </button>
                <button
                  onClick={() =>
                    setWalkMode(
                      walkMode === "dependency-chain" ? "direct" : "dependency-chain",
                    )
                  }
                  className={`px-2 py-1.5 text-xs font-mono font-medium rounded border transition-colors flex items-center justify-between ${
                    walkMode === "dependency-chain"
                      ? "bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400 font-bold"
                      : "bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                  title="Everything this file needs (downstream 2 hops)"
                >
                  <span>Dependency chain</span>
                  <span className="text-[10px] font-normal text-zinc-400">
                    {walkMode === "dependency-chain" ? "active" : "2 hops"}
                  </span>
                </button>
              </div>
            </div>

            {walkMode === "blast-radius" ? (
              /* Blast Radius View: Upstream transitive walk (2 hops) */
              <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      Blast Radius
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
                      {blastRadius?.items.length || 0}
                    </span>
                  </div>
                  <button
                    onClick={() => setWalkMode("direct")}
                    className="text-[10px] font-mono text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  >
                    ← Direct view
                  </button>
                </div>
                <p className="text-[10px] text-zinc-400 font-sans leading-tight">
                  Everything that breaks if this file changes ({blastRadius?.directCount} direct, {blastRadius?.transitiveCount} transitive)
                </p>

                {blastRadius?.items.length === 0 ? (
                  <div className="text-[11px] font-mono text-zinc-400 py-2 italic">
                    Nothing depends on this file (0 blast radius)
                  </div>
                ) : (
                  <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                    {blastRadius?.items.map((item) => {
                      const isHovered = hoveredId === item.path;
                      const fileName = item.path.split("/").pop() || item.path;
                      return (
                        <div
                          key={item.path}
                          onClick={() => onSelect(item.path)}
                          onMouseEnter={() => onHover(item.path)}
                          onMouseLeave={() => onHover(null)}
                          className={`p-1.5 rounded text-xs font-mono cursor-pointer transition-colors ${
                            isHovered
                              ? "bg-amber-500/20 text-amber-900 dark:text-amber-200 ring-1 ring-amber-500"
                              : "bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="truncate pr-1 font-medium" title={item.path}>
                              {fileName}
                            </span>
                            <span
                              className={`shrink-0 text-[9px] px-1 py-0.2 rounded font-bold ${
                                item.depth === 1
                                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                  : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
                              }`}
                            >
                              hop {item.depth}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-0.5">
                            <span className="truncate">{item.category}</span>
                            <span>{item.lineCount}L</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : walkMode === "dependency-chain" ? (
              /* Dependency Chain View: Downstream transitive walk (2 hops) */
              <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      Dependency Chain
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
                      {dependencyChain?.items.length || 0}
                    </span>
                  </div>
                  <button
                    onClick={() => setWalkMode("direct")}
                    className="text-[10px] font-mono text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  >
                    ← Direct view
                  </button>
                </div>
                <p className="text-[10px] text-zinc-400 font-sans leading-tight">
                  Everything this file needs ({dependencyChain?.directCount} direct, {dependencyChain?.transitiveCount} transitive)
                </p>

                {dependencyChain?.items.length === 0 ? (
                  <div className="text-[11px] font-mono text-zinc-400 py-2 italic">
                    No dependencies required by this file
                  </div>
                ) : (
                  <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                    {dependencyChain?.items.map((item) => {
                      const isHovered = hoveredId === item.path;
                      const fileName = item.path.split("/").pop() || item.path;
                      return (
                        <div
                          key={item.path}
                          onClick={() => onSelect(item.path)}
                          onMouseEnter={() => onHover(item.path)}
                          onMouseLeave={() => onHover(null)}
                          className={`p-1.5 rounded text-xs font-mono cursor-pointer transition-colors ${
                            isHovered
                              ? "bg-amber-500/20 text-amber-900 dark:text-amber-200 ring-1 ring-amber-500"
                              : "bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="truncate pr-1 font-medium" title={item.path}>
                              {fileName}
                            </span>
                            <span
                              className={`shrink-0 text-[9px] px-1 py-0.2 rounded font-bold ${
                                item.depth === 1
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                  : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
                              }`}
                            >
                              hop {item.depth}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-0.5">
                            <span className="truncate">{item.category}</span>
                            <span>{item.lineCount}L</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Direct View (Default) */
              <>
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
              </>
            )}
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
