import Link from "next/link";
import { getLatestPromptExperiment, getEvalSummary } from "@/lib/db";
import { EvalsSection } from "@/components/dashboard/evals-section";

export default async function EvalsPage() {
  const latestExperiment = getLatestPromptExperiment();
  const evalSummary = getEvalSummary();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/"
              className="font-mono text-xs text-fg-muted hover:text-fg transition-colors"
            >
              ← Back to Analyses
            </Link>
          </div>
          <h1 className="font-mono text-base font-semibold tracking-tight text-fg">
            Evaluations & Prompt Quality (Phase 11)
          </h1>
          <p className="mt-0.5 text-xs text-fg-muted">
            Automated AST path verification, held-out role classification, and prompt iteration benchmarks.
          </p>
        </div>
      </div>

      {/* Main Evals Component */}
      <div className="mt-6">
        <EvalsSection initialExperiment={latestExperiment} evalSummary={evalSummary} />
      </div>
    </div>
  );
}
