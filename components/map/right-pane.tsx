"use client";

import React from "react";
import type { ParsedFile } from "../../lib/parser/types.ts";

interface RightPaneProps {
  selectedId: string | null;
  files: ParsedFile[];
}

export function RightPane({ selectedId, files }: RightPaneProps) {
  const selectedFile = selectedId ? files.find((f) => f.path === selectedId) : null;

  return (
    <aside className="w-80 shrink-0 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col h-full select-none">
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Details
        </h2>
        <span className="text-[10px] font-mono text-zinc-400">
          Phase 4 Column
        </span>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {selectedFile ? (
          <div className="space-y-4">
            <div>
              <span className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">
                Selected File
              </span>
              <p className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100 break-all mt-1">
                {selectedFile.path}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-900">
                <span className="text-[10px] text-zinc-400 block">Lines</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{selectedFile.lineCount}</span>
              </div>
              <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-900">
                <span className="text-[10px] text-zinc-400 block">Size</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{selectedFile.byteSize} B</span>
              </div>
              <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-900">
                <span className="text-[10px] text-zinc-400 block">Fan-in</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{selectedFile.fanIn}</span>
              </div>
              <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-900">
                <span className="text-[10px] text-zinc-400 block">Fan-out</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{selectedFile.fanOut}</span>
              </div>
            </div>
          </div>
        ) : selectedId ? (
          <div>
            <span className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">
              Selected Directory
            </span>
            <p className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100 break-all mt-1">
              {selectedId}
            </p>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400 py-12">
            <svg
              className="w-8 h-8 mb-2 text-zinc-300 dark:text-zinc-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-xs font-mono">Select a node or file row to inspect details</p>
          </div>
        )}
      </div>
    </aside>
  );
}
