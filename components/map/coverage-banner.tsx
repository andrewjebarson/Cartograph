"use client";

import React, { useState } from "react";

interface CoverageBannerProps {
  resolutionRate: number;
  unresolvedCount: number;
}

export function CoverageBanner({
  resolutionRate,
  unresolvedCount,
}: CoverageBannerProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Per spec: Only displayed if resolutionRate < 95%
  if (resolutionRate >= 95) return null;

  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 max-w-xl w-[90%] select-none">
      {isCollapsed ? (
        /* Collapsed state: collapses to single line that still names the figure */
        <div
          onClick={() => setIsCollapsed(false)}
          className="flex items-center justify-between px-3 py-1.5 rounded-md bg-amber-500/15 border border-amber-500/40 backdrop-blur-md shadow-md text-xs font-mono text-amber-700 dark:text-amber-300 cursor-pointer hover:bg-amber-500/20 transition-colors"
          title="Click to expand coverage diagnostic details"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-semibold">
              Partial graph: {resolutionRate.toFixed(1)}% resolved ({unresolvedCount} unresolved)
            </span>
          </div>
          <span className="text-[10px] text-amber-600 dark:text-amber-400">
            Expand details ▾
          </span>
        </div>
      ) : (
        /* Expanded state */
        <div className="p-3 rounded-lg bg-amber-50/95 dark:bg-zinc-900/95 border border-amber-500/40 backdrop-blur-md shadow-lg text-xs font-mono text-zinc-800 dark:text-zinc-200">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
              <span className="font-bold text-amber-700 dark:text-amber-400">
                Partial Dependency Graph ({resolutionRate.toFixed(1)}% resolved)
              </span>
            </div>
            <button
              onClick={() => setIsCollapsed(true)}
              className="text-[10px] font-mono text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800"
            >
              Collapse ▴
            </button>
          </div>

          <p className="mt-1.5 text-[11px] font-sans text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {unresolvedCount} import specifiers could not be statically resolved to files in this repository (e.g., dynamic imports, path aliases, or external vendor packages). The map shows all verified edges.
          </p>

          <div className="mt-2 flex items-center gap-3 text-[10px] text-zinc-500 border-t border-amber-500/20 pt-1.5">
            <span>• Rule: Absent beats approximate</span>
            <span>• Unresolved edges omitted</span>
          </div>
        </div>
      )}
    </div>
  );
}
