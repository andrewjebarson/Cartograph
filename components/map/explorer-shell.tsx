"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ParseResult } from "@/lib/parser/types";
import { computeFoldedGraph } from "@/lib/graph/folding";
import { LeftRail } from "./left-rail";
import { RightPane } from "./right-pane";
import { MapCanvas } from "./map-canvas";
import { CoverageBanner } from "./coverage-banner";

interface ExplorerShellProps {
  analysisId: string;
  repoOwner: string;
  repoName: string;
  commitSha: string | null;
  framework: string | null;
  parseResult: ParseResult;
}

export function ExplorerShell({
  analysisId,
  repoOwner,
  repoName,
  commitSha,
  framework,
  parseResult,
}: ExplorerShellProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isReRunning, setIsReRunning] = useState(false);

  const foldedGraph = useMemo(
    () => computeFoldedGraph(parseResult.files, parseResult.edges),
    [parseResult.files, parseResult.edges],
  );

  const handleReRun = async () => {
    if (isReRunning) return;
    setIsReRunning(true);
    try {
      const res = await fetch("/api/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: `${repoOwner}/${repoName}`, force: true }),
      });
      const data = await res.json();
      if (data.analysisId) {
        router.push(`/analysis/${data.analysisId}`);
      }
    } catch (err) {
      console.error("Re-run failed:", err);
      setIsReRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-white dark:bg-zinc-950">
      {/* Top Navbar */}
      <header className="h-12 shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-xs font-mono text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1"
          >
            ← Repositories
          </Link>
          <span className="text-zinc-300 dark:text-zinc-700">|</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
              {repoOwner}/{repoName}
            </span>
            {framework && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                {framework}
              </span>
            )}
            {commitSha && (
              <span
                className="text-[10px] font-mono text-zinc-400"
                title={`Analysis: ${analysisId}`}
              >
                @{commitSha}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-zinc-500">
          <span>{parseResult.files.length} files</span>
          <span>•</span>
          <span>{parseResult.edges.length} edges</span>
          <span>•</span>
          <span
            className={
              parseResult.coverage.resolutionRate >= 95
                ? "text-emerald-600 dark:text-emerald-400 font-medium"
                : "text-amber-600 dark:text-amber-400 font-medium"
            }
          >
            {parseResult.coverage.resolutionRate.toFixed(1)}% resolution
          </span>
          <span>•</span>
          <button
            onClick={handleReRun}
            disabled={isReRunning}
            className="h-6 px-2 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] font-mono text-zinc-600 dark:text-zinc-300 transition-colors"
            title="Re-run pipeline analysis on this repository"
          >
            {isReRunning ? "Starting..." : "Re-run"}
          </button>
        </div>
      </header>

      {/* Main 3-Column Shell */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden relative">
        {/* Coverage Diagnostic Banner if < 95% resolution */}
        <CoverageBanner
          resolutionRate={parseResult.coverage.resolutionRate}
          unresolvedCount={parseResult.coverage.unresolvedImports}
        />

        {/* Left Rail: File Categories */}
        <LeftRail
          files={parseResult.files}
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
        />

        {/* Middle Column: Interactive Map Canvas */}
        <main className="flex-1 h-full min-w-0 relative">
          <MapCanvas
            parseResult={parseResult}
            selectedId={selectedId}
            hoveredId={hoveredId}
            activeCategory={activeCategory}
            onSelect={setSelectedId}
            onHover={setHoveredId}
          />
        </main>

        {/* Right Pane: Details, Blast Radius & Insights */}
        <RightPane
          selectedId={selectedId}
          parseResult={parseResult}
          foldedNodes={foldedGraph.nodes}
          edges={foldedGraph.edges}
          hoveredId={hoveredId}
          onSelect={setSelectedId}
          onHover={setHoveredId}
        />
      </div>
    </div>
  );
}
