"use client";

import React, { useState, useEffect } from "react";
import type { PromptExperimentRecord } from "@/lib/db";

interface EvalsSectionProps {
  initialExperiment?: PromptExperimentRecord | null;
  evalSummary?: {
    totalEvaluated: number;
    avgPathScore: number;
    passRate: number;
  };
}

interface PromptComparisonItem {
  path: string;
  v1PathAccuracy: number;
  v2PathAccuracy: number;
  v1SpecificityScore: number;
  v2SpecificityScore: number;
  judgeReasoning: string;
}


export function EvalsSection({ initialExperiment, evalSummary }: EvalsSectionProps) {
  const [experiment, setExperiment] = useState<PromptExperimentRecord | null>(initialExperiment || null);
  const [isRunning, setIsRunning] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [summaryStats, setSummaryStats] = useState(evalSummary);

  useEffect(() => {
    if (!initialExperiment) {
      fetch("/api/evals")
        .then((res) => res.json())
        .then((data) => {
          if (data.experiment) setExperiment(data.experiment);
          if (data.evalSummary) setSummaryStats(data.evalSummary);
        })
        .catch(() => {});
    }
  }, [initialExperiment]);

  const handleRunBenchmark = async () => {
    setIsRunning(true);
    try {
      const res = await fetch("/api/evals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "prompt_experiment" }),
      });
      const data = await res.json();
      if (data.experiment) setExperiment(data.experiment);
      if (data.evalSummary) setSummaryStats(data.evalSummary);
    } catch (err) {
      console.error("Benchmark failed:", err);
    } finally {
      setIsRunning(false);
    }
  };

  const parsedDetails = experiment?.details_json ? JSON.parse(experiment.details_json) : [];

  return (
    <section className="my-8 rounded-lg border border-line bg-surface/70 p-5 space-y-4 font-sans select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-mono font-bold tracking-wider text-accent">
              Phase 11
            </span>
            <span className="text-zinc-400">•</span>
            <h2 className="text-sm font-bold font-mono text-fg">
              Prompt Versions &amp; Evals
            </h2>
          </div>
          <p className="text-xs text-fg-muted mt-0.5">
            Answer quality stops being an opinion and becomes a number. Scored side-by-side over held-out datasets.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {summaryStats && summaryStats.totalEvaluated > 0 && (
            <div
              className="text-[10px] font-mono px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-fg-muted border border-line"
              title="Deterministic invented-path check on live user traffic"
            >
              Live Traffic: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{summaryStats.passRate}%</strong> clean ({summaryStats.totalEvaluated} runs)
            </div>
          )}

          <button
            onClick={handleRunBenchmark}
            disabled={isRunning}
            className="h-7 px-3 rounded border border-line bg-surface hover:bg-raised font-mono text-[11px] font-medium text-fg hover:text-accent transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {isRunning ? (
              <>
                <span className="animate-spin text-xs">⟳</span>
                <span>Evaluating...</span>
              </>
            ) : (
              <>
                <span>✦</span>
                <span>Run Live Benchmark</span>
              </>
            )}
          </button>
        </div>
      </div>

      {experiment ? (
        <div className="space-y-4">
          {/* Side by Side Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Prompt v1 (Retired) */}
            <div className="p-4 rounded-md border border-line bg-surface/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-fg-muted uppercase">
                  Prompt v1 (Retired)
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-200/60 dark:bg-zinc-800 text-fg-muted">
                  Naive Ungrounded
                </span>
              </div>
              <p className="text-[11px] text-fg-muted leading-relaxed font-mono">
                General prompt without AST neighbor injection or anti-hallucination bounds.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-line/60 font-mono text-xs">
                <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-900/40 border border-line/50">
                  <span className="text-[10px] text-fg-muted block">Path Accuracy</span>
                  <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                    {experiment.v1_path_accuracy}%
                  </span>
                </div>
                <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-900/40 border border-line/50">
                  <span className="text-[10px] text-fg-muted block">Specificity (Judge)</span>
                  <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                    {experiment.v1_specificity} <span className="text-[10px] font-normal text-fg-muted">/ 10</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Prompt v2 (Current) */}
            <div className="p-4 rounded-md border border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/10 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-300 uppercase">
                  Prompt v2 (Current)
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">
                  ★ Winner
                </span>
              </div>
              <p className="text-[11px] text-fg-muted leading-relaxed font-mono">
                AST neighbor injection with strict boundary grounding and zero phantom imports.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-500/20 font-mono text-xs">
                <div className="p-2 rounded bg-white dark:bg-zinc-900 border border-amber-500/30">
                  <span className="text-[10px] text-fg-muted block">Path Accuracy</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {experiment.v2_path_accuracy}%
                  </span>
                </div>
                <div className="p-2 rounded bg-white dark:bg-zinc-900 border border-amber-500/30">
                  <span className="text-[10px] text-fg-muted block">Specificity (Judge)</span>
                  <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
                    {experiment.v2_specificity} <span className="text-[10px] font-normal text-fg-muted">/ 10</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Experiment Delta & Comparison Conclusion */}
          <div className="p-3.5 rounded-lg border border-line bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-fg">Result:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  +{experiment.path_accuracy_delta}% Path Accuracy
                </span>
                <span className="text-fg-muted">•</span>
                <span className="text-amber-600 dark:text-amber-400 font-bold">
                  +{experiment.specificity_delta} Specificity
                </span>
              </div>
              <p className="text-[11px] text-fg-muted font-sans leading-relaxed">
                {experiment.summary}
              </p>
            </div>

            <button
              onClick={() => setShowDetails(!showDetails)}
              className="shrink-0 text-[11px] text-fg-muted hover:text-fg underline decoration-line hover:decoration-fg transition-colors"
            >
              {showDetails ? "Hide Itemized Breakdown ▴" : "View Itemized Breakdown ▾"}
            </button>
          </div>

          {/* Explicit Judge Disclaimer required by spec */}
          <div className="p-2.5 rounded bg-zinc-50 dark:bg-zinc-900/60 border border-line text-[11px] text-fg-muted leading-relaxed font-sans">
            <strong>Methodology Note:</strong> Path accuracy is deterministic set-membership code. Specificity comparison uses model-as-judge unavoidably, as <em>&quot;is this specific enough to be useful&quot;</em> has no exact mathematical answer.
          </div>

          {/* Collapsible Itemized Breakdown */}
          {showDetails && parsedDetails.length > 0 && (
            <div className="border border-line rounded-lg overflow-hidden mt-3">
              <div className="bg-raised px-3 py-2 text-xs font-mono font-semibold text-fg border-b border-line">
                Benchmark Suite ({parsedDetails.length} Held-Out Files)
              </div>
              <div className="divide-y divide-line max-h-80 overflow-y-auto text-xs font-mono">
                {parsedDetails.map((item: PromptComparisonItem, idx: number) => (
                  <div key={idx} className="p-3 hover:bg-surface/50 transition-colors space-y-1.5">

                    <div className="flex items-center justify-between">
                      <span className="font-bold text-fg truncate pr-2">
                        {item.path}
                      </span>
                      <div className="flex items-center gap-2 shrink-0 text-[10px]">
                        <span className="text-fg-muted">v1: {item.v1PathAccuracy}%</span>
                        <span>→</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">v2: {item.v2PathAccuracy}%</span>
                      </div>
                    </div>
                    <div className="text-[11px] text-fg-muted font-sans leading-tight">
                      <strong>Judge:</strong> {item.judgeReasoning} (v1: {item.v1SpecificityScore}/10 vs v2: {item.v2SpecificityScore}/10)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-8 flex flex-col items-center justify-center text-center space-y-2 font-mono">
          <p className="text-xs text-fg-muted">No benchmark experiment recorded yet.</p>
          <button
            onClick={handleRunBenchmark}
            disabled={isRunning}
            className="h-8 px-4 rounded bg-accent text-accent-fg font-medium text-xs hover:opacity-90 transition-opacity"
          >
            ✦ Run Initial Benchmark
          </button>
        </div>
      )}
    </section>
  );
}
