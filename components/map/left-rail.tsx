"use client";

import React, { useMemo } from "react";
import type { ParsedFile } from "../../lib/parser/types.ts";
import { deriveCategory } from "../../lib/graph/folding.ts";

interface CategoryStat {
  name: string;
  count: number;
  color: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Controllers & API": "#3b82f6", // blue
  "Services & Logic": "#10b981", // emerald
  "Repositories & Storage": "#8b5cf6", // violet
  "Models & DTOs": "#f59e0b", // amber
  "Security & Auth": "#ef4444", // red
  "Configuration": "#6b7280", // gray
  "UI Components": "#06b6d4", // cyan
  "Styles & Assets": "#ec4899", // pink
  "General Code": "#64748b", // slate
};

export function LeftRail({ files }: { files: ParsedFile[] }) {
  const categories: CategoryStat[] = useMemo(() => {
    const counts = new Map<string, number>();

    for (const f of files) {
      const cat = deriveCategory(f.path);
      counts.set(cat, (counts.get(cat) || 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([name, count]) => ({
        name,
        count,
        color: CATEGORY_COLORS[name] || "#71717a",
      }))
      .sort((a, b) => b.count - a.count);
  }, [files]);

  return (
    <aside className="w-56 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col h-full select-none">
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          File Categories
        </h2>
        <p className="text-[10px] text-zinc-400 mt-0.5">
          {files.length} indexed files
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {categories.map((cat) => (
          <div
            key={cat.name}
            className="flex items-center justify-between px-2.5 py-1.5 rounded text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: cat.color }}
              />
              <span className="truncate text-xs">{cat.name}</span>
            </div>
            <span className="font-mono text-[11px] text-zinc-400 font-medium ml-2">
              {cat.count}
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}
