"use client";

import React, { useState, useMemo } from "react";
import type { ExtractedRoute } from "../../lib/adapters/types.ts";

interface RouteTableProps {
  routes: ExtractedRoute[];
  isOpen: boolean;
  onClose: () => void;
  onSelectRoute: (filePath: string) => void;
}

const METHOD_STYLES: Record<string, string> = {
  GET: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  PAGE: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  POST: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  PUT: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  PATCH: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  DELETE: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
};

export function RouteTable({
  routes,
  isOpen,
  onClose,
  onSelectRoute,
}: RouteTableProps) {
  const [methodFilter, setMethodFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const availableMethods = useMemo(() => {
    const s = new Set<string>();
    for (const r of routes) s.add(r.method);
    return Array.from(s);
  }, [routes]);

  const filteredRoutes = useMemo(() => {
    return routes.filter((r) => {
      if (methodFilter !== "ALL" && r.method !== methodFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesPath = r.path.toLowerCase().includes(q);
        const matchesFile = r.filePath.toLowerCase().includes(q);
        if (!matchesPath && !matchesFile) return false;
      }
      return true;
    });
  }, [routes, methodFilter, searchQuery]);

  if (!isOpen) return null;

  const handleCopy = (path: string, id: string) => {
    navigator.clipboard?.writeText(path);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="absolute inset-x-4 top-14 bottom-6 z-30 flex flex-col rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 shadow-2xl backdrop-blur-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 shrink-0 bg-zinc-50 dark:bg-zinc-900/60">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>Extracted Route Table</span>
            <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              {routes.length} endpoints
            </span>
          </h2>
          <span className="text-xs font-mono text-zinc-400">|</span>
          <p className="text-xs text-zinc-500 font-mono">
            Exact routes recovered from syntax
          </p>
        </div>

        <button
          onClick={onClose}
          className="h-7 w-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          title="Close Route Table"
        >
          ✕
        </button>
      </div>

      {/* Toolbar: Search & Method Filters */}
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 px-4 py-2.5 bg-white dark:bg-zinc-950 shrink-0 text-xs font-mono">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setMethodFilter("ALL")}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              methodFilter === "ALL"
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            }`}
          >
            ALL ({routes.length})
          </button>
          {availableMethods.map((m) => {
            const count = routes.filter((r) => r.method === m).length;
            const isSelected = methodFilter === m;
            return (
              <button
                key={m}
                onClick={() => setMethodFilter(m)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  isSelected
                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                }`}
              >
                {m} ({count})
              </button>
            );
          })}
        </div>

        <div className="w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by path or controller..."
            className="w-full h-7 px-2.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs font-mono placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Table Body */}
      <div className="flex-1 overflow-y-auto">
        {filteredRoutes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-400 font-mono text-xs">
            <span>No routes match current filters.</span>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/95 dark:bg-zinc-900/95 font-mono text-[11px] text-zinc-500 backdrop-blur-sm z-10">
              <tr>
                <th className="px-4 py-2 font-medium w-24">Method</th>
                <th className="px-4 py-2 font-medium">Route Path Pattern</th>
                <th className="px-4 py-2 font-medium">Controller / Source</th>
                <th className="px-4 py-2 text-right font-medium w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono">
              {filteredRoutes.map((route) => {
                const style =
                  METHOD_STYLES[route.method] ||
                  "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20";

                return (
                  <tr
                    key={route.id}
                    className="hover:bg-amber-500/5 transition-colors group cursor-pointer"
                    onClick={() => onSelectRoute(route.filePath)}
                  >
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${style}`}
                      >
                        {route.method}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {route.path}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(route.path, route.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-[10px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-opacity"
                          title="Copy path"
                        >
                          {copiedId === route.id ? "✓ Copied" : "copy"}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400">
                      <div className="flex items-center gap-1.5">
                        <span className="text-zinc-900 dark:text-zinc-200">
                          {route.filePath.split("/").pop()}
                        </span>
                        <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                          :{route.line}
                        </span>
                        <span className="text-[10px] text-zinc-400 truncate max-w-xs">
                          ({route.filePath})
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRoute(route.filePath);
                        }}
                        className="text-[11px] px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 hover:border-amber-500 transition-colors"
                      >
                        Locate →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
