import Link from "next/link";
import { listAnalyses } from "@/lib/db";
import { seedSampleData, clearAllData } from "./actions";
import { NewRepoForm } from "@/components/dashboard/new-repo-form";
import { AnalysesTable } from "@/components/dashboard/analyses-table";

export default async function DashboardPage() {
  const analyses = listAnalyses();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line pb-4">
        <div>
          <h1 className="font-mono text-base font-semibold tracking-tight text-fg">
            Repository Analyses
          </h1>
          <p className="mt-0.5 text-xs text-fg-muted">
            Local dependency graphs for Angular, TypeScript, and Spring Boot codebases.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/evals"
            className="h-7 inline-flex items-center rounded border border-line bg-surface px-2.5 font-mono text-[11px] text-fg-muted transition-colors hover:text-fg"
          >
            Phase 11 Evals →
          </Link>
          {analyses.length > 0 && (
            <form action={clearAllData}>
              <button
                type="submit"
                className="h-7 rounded border border-line bg-surface px-2.5 font-mono text-[11px] text-fg-muted transition-colors hover:border-red-500/50 hover:text-red-500"
              >
                Clear Database
              </button>
            </form>
          )}
          <form action={seedSampleData}>
            <button
              type="submit"
              className="h-7 rounded border border-line bg-raised px-2.5 font-mono text-[11px] font-medium text-fg transition-colors hover:bg-surface hover:text-accent"
            >
              + Seed Demo Project
            </button>
          </form>
        </div>
      </div>

      {/* URL Submission Form */}
      <div className="my-6 p-4 rounded-lg border border-line bg-surface/60">
        <h2 className="text-xs font-mono font-medium text-fg mb-2">
          Analyze Public Repository
        </h2>
        <NewRepoForm />
      </div>

      {/* Analyses List */}
      {analyses.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed border-line bg-surface/50 py-16 text-center">
          <div className="font-mono text-xs text-fg-muted">cartograph.db</div>
          <h2 className="mt-2 text-sm font-medium text-fg">No analyses yet</h2>
          <p className="mt-1 max-w-sm text-xs text-fg-muted">
            Paste a public GitHub repository URL above, or seed the fullstack demo project to explore the map.
          </p>
          <form action={seedSampleData} className="mt-5">
            <button
              type="submit"
              className="h-7 rounded bg-accent px-3 text-xs font-medium text-accent-fg transition-opacity hover:opacity-90"
            >
              Seed Demo Project
            </button>
          </form>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border border-line bg-surface">
          <AnalysesTable initialAnalyses={analyses} />
        </div>
      )}
    </div>
  );
}


