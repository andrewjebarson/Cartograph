"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { SAMPLE_GRAPH_DATA } from "../../../lib/sample-graph-data.ts";
import { computeFoldedGraph } from "../../../lib/graph/folding.ts";
import { LeftRail } from "../../../components/map/left-rail.tsx";
import { RightPane } from "../../../components/map/right-pane.tsx";
import { MapCanvas } from "../../../components/map/map-canvas.tsx";

export default function PreviewMapPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const foldedGraph = useMemo(
    () => computeFoldedGraph(SAMPLE_GRAPH_DATA.files, SAMPLE_GRAPH_DATA.edges),
    [],
  );

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
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              ecommerce-fullstack
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
              preview
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-zinc-500">
          <span>{SAMPLE_GRAPH_DATA.files.length} files</span>
          <span>•</span>
          <span>{SAMPLE_GRAPH_DATA.edges.length} edges</span>
          <span>•</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
            100% resolution
          </span>
        </div>
      </header>

      {/* Main 3-Column Shell */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden">
        {/* Left Rail: File Categories */}
        <LeftRail
          files={SAMPLE_GRAPH_DATA.files}
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
        />

        {/* Middle Column: Interactive Map Canvas */}
        <main className="flex-1 h-full min-w-0 relative">
          <MapCanvas
            parseResult={SAMPLE_GRAPH_DATA}
            selectedId={selectedId}
            hoveredId={hoveredId}
            activeCategory={activeCategory}
            onSelect={setSelectedId}
            onHover={setHoveredId}
          />
        </main>

        {/* Right Pane: Details */}
        <RightPane
          selectedId={selectedId}
          parseResult={SAMPLE_GRAPH_DATA}
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
