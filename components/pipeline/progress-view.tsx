"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ProgressViewProps {
  analysisId: string;
  repoOwner: string;
  repoName: string;
  initialStage?: string;
  initialMessage?: string;
  onComplete?: () => void;
}

const STAGES = [
  { id: "fetch", label: "Fetch Archive", desc: "Download public archive from GitHub" },
  { id: "select", label: "Select Files", desc: "Identify framework & candidate source files" },
  { id: "parse", label: "Parse ASTs", desc: "Extract syntax trees & resolve imports" },
  { id: "store", label: "Store Graph", desc: "Persist dependency nodes, edges & metrics" },
];

export function ProgressView({
  analysisId,
  repoOwner,
  repoName,
  initialStage = "fetch",
  initialMessage = "Connecting to repository...",
  onComplete,
}: ProgressViewProps) {
  const router = useRouter();
  const [currentStage, setCurrentStage] = useState(initialStage);
  const [currentMessage, setCurrentMessage] = useState(initialMessage);
  const [status, setStatus] = useState<"parsing" | "complete" | "failed">("parsing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const es = new EventSource(`/api/analyses/${analysisId}/events`);

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.stage) setCurrentStage(data.stage);
        if (data.message) setCurrentMessage(data.message);
        if (data.status) setStatus(data.status);
        if (data.error) setErrorMessage(data.error);

        if (data.status === "complete") {
          es.close();
          if (onComplete) {
            onComplete();
          } else {
            router.refresh();
          }
        } else if (data.status === "failed") {
          es.close();
        }
      } catch {
        // ignore parse error
      }
    };

    es.onerror = () => {
      // EventSource reconnects automatically
    };

    return () => {
      es.close();
    };
  }, [analysisId, onComplete, router]);

  const currentStageIndex = STAGES.findIndex((s) => s.id === currentStage);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="w-full max-w-lg rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-sm">
        {/* Header */}
        <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
              Pipeline Execution
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded font-medium ${
                status === "failed"
                  ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                  : status === "complete"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse"
              }`}
            >
              {status.toUpperCase()}
            </span>
          </div>
          <h2 className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1">
            {repoOwner}/{repoName}
          </h2>
        </div>

        {/* Failed State */}
        {status === "failed" ? (
          <div className="space-y-4">
            <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs font-mono">
              <div className="font-semibold text-red-800 dark:text-red-200 flex items-center gap-1.5">
                <span>✕ Analysis Failed in stage:</span>
                <span className="underline">{currentStage}</span>
              </div>
              <p className="text-red-600 dark:text-red-300 mt-1 text-[11px] leading-relaxed">
                {errorMessage || currentMessage}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  setStatus("parsing");
                  setCurrentStage("fetch");
                  setCurrentMessage("Restarting pipeline...");
                  setErrorMessage(null);
                  fetch("/api/analyses", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url: `${repoOwner}/${repoName}`, force: true }),
                  }).then(() => router.refresh());
                }}
                className="h-8 px-3 rounded text-xs font-mono font-medium bg-amber-500 text-zinc-950 hover:bg-amber-400 transition-colors"
              >
                Retry Analysis
              </button>
              <Link
                href="/"
                className="h-8 px-3 rounded text-xs font-mono flex items-center justify-center border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
              >
                ← Back to Repositories
              </Link>
            </div>
          </div>
        ) : (
          /* Live Progress Stages */
          <div className="space-y-5">
            <div className="space-y-3">
              {STAGES.map((s, index) => {
                const isPassed = currentStageIndex > index || status === "complete";
                const isCurrent = currentStageIndex === index && status === "parsing";

                return (
                  <div
                    key={s.id}
                    className={`flex items-start gap-3 p-2.5 rounded-lg transition-colors ${
                      isCurrent
                        ? "bg-amber-500/10 border border-amber-500/30 text-zinc-900 dark:text-zinc-100"
                        : isPassed
                          ? "bg-zinc-50 dark:bg-zinc-900/40 text-zinc-700 dark:text-zinc-300"
                          : "opacity-40 text-zinc-400"
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isPassed ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">
                          ✓
                        </div>
                      ) : isCurrent ? (
                        <div className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center text-xs font-bold font-mono animate-spin">
                          ◐
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-zinc-300 dark:border-zinc-700 text-zinc-400 flex items-center justify-center text-[10px] font-mono">
                          {index + 1}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-semibold">
                          {s.label}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
                            Active Stage
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {isCurrent ? currentMessage : s.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 text-center">
              <p className="text-[11px] font-mono text-zinc-400">
                Live stream via SSE · Zero browser polling
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
