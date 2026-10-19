"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Analysis } from "@/lib/db";

interface AnalysesTableProps {
  initialAnalyses: Analysis[];
}

let cachedClientTime = 0;
if (typeof window !== "undefined") {
  cachedClientTime = Date.now();
}

const subscribeTime = (callback: () => void) => {
  const timer = setInterval(() => {
    cachedClientTime = Date.now();
    callback();
  }, 10000);
  return () => clearInterval(timer);
};
const getClientTime = () => cachedClientTime;
const getServerTime = () => 0;

export function AnalysesTable({ initialAnalyses }: AnalysesTableProps) {
  const router = useRouter();
  const [realtimeOverrides, setRealtimeOverrides] = useState<Record<string, Partial<Analysis>>>({});
  const currentTime = React.useSyncExternalStore(subscribeTime, getClientTime, getServerTime);
  const knownIdsRef = useRef(new Set(initialAnalyses.map((a) => a.id)));

  useEffect(() => {
    for (const a of initialAnalyses) {
      knownIdsRef.current.add(a.id);
    }
  }, [initialAnalyses]);

  // Acceptance Check 4: Open the dashboard in a second tab during a run. The stage updates there too, without a refresh.
  useEffect(() => {
    const es = new EventSource("/api/analyses/events");

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.analysisId) {
          setRealtimeOverrides((prev) => ({
            ...prev,
            [event.analysisId]: {
              status: event.status,
              stage: event.stage,
              stage_message: event.message,
              error_message: event.error,
              updated_at: event.timestamp || new Date().toISOString(),
            },
          }));

          // If a new analysis was created that wasn't in the initial list, refresh router data once
          if (!knownIdsRef.current.has(event.analysisId)) {
            knownIdsRef.current.add(event.analysisId);
            router.refresh();
          }
        }
      } catch {
        // ignore
      }
    };

    return () => {
      es.close();
    };
  }, [router]);

  const analyses = useMemo(() => {
    return initialAnalyses.map((a) => {
      const override = realtimeOverrides[a.id];
      return override ? { ...a, ...override } : a;
    });
  }, [initialAnalyses, realtimeOverrides]);

  const isStale = (a: Analysis): boolean => {
    if (!currentTime) return false;
    if (a.status !== "parsing" && a.status !== "queued") return false;
    const lastUpdate = new Date(a.updated_at || a.created_at).getTime();
    // Stale if no updates for past 3 minutes (180000ms)
    return currentTime - lastUpdate > 3 * 60 * 1000;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 font-mono text-[11px] text-zinc-500">
          <tr>
            <th className="px-4 py-2 font-medium">Repository</th>
            <th className="px-4 py-2 font-medium">Framework</th>
            <th className="px-4 py-2 font-medium">Status / Stage</th>
            <th className="px-4 py-2 text-right font-medium">Files</th>
            <th className="px-4 py-2 text-right font-medium">Edges</th>
            <th className="px-4 py-2 text-right font-medium">Coverage</th>
            <th className="px-4 py-2 font-medium">Commit</th>
            <th className="px-4 py-2 text-right font-medium">Analyzed</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {analyses.map((a) => {
            const stale = isStale(a);
            const dateStr = a.created_at ? a.created_at.slice(0, 10) : "—";

            return (
              <tr
                key={a.id}
                className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
              >
                <td className="px-4 py-3 font-mono font-medium text-zinc-900 dark:text-zinc-100">
                  <Link
                    href={`/analysis/${a.id}`}
                    className="hover:text-amber-500 hover:underline flex items-center gap-1.5"
                  >
                    <span>{a.repo_owner}/{a.repo_name}</span>
                    <span className="text-[10px] text-zinc-400">→</span>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded border border-zinc-200 dark:border-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">
                    {a.framework ?? "Detecting..."}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {stale ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                      title="Run did not finish and has had no updates for over 3 minutes"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span>stale (abandoned)</span>
                    </span>
                  ) : a.status === "complete" ? (
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      complete
                    </span>
                  ) : a.status === "failed" ? (
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                      title={a.error_message || "Analysis failed"}
                    >
                      failed {a.failed_stage ? `(${a.failed_stage})` : ""}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span>{a.stage ? `${a.stage}` : "parsing"}</span>
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono text-zinc-500">
                  {a.file_count > 0 ? a.file_count : "—"}
                </td>
                <td className="px-4 py-3 text-right font-mono text-zinc-500">
                  {a.edge_count > 0 ? a.edge_count : "—"}
                </td>
                <td className="px-4 py-3 text-right font-mono text-zinc-500">
                  {a.status === "complete" ? (
                    <span
                      className={
                        a.coverage_rate >= 95
                          ? "text-emerald-600 dark:text-emerald-400 font-medium"
                          : "text-amber-600 dark:text-amber-400 font-medium"
                      }
                    >
                      {a.coverage_rate.toFixed(0)}%
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-[11px] text-zinc-400">
                  {a.commit_sha ?? "—"}
                </td>
                <td className="px-4 py-3 text-right font-mono text-[11px] text-zinc-400">
                  {dateStr}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
