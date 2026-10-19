import React from "react";
import { notFound } from "next/navigation";
import { getAnalysis, getAnalysisGraph } from "@/lib/db";
import { ExplorerShell } from "@/components/map/explorer-shell";
import { ProgressView } from "@/components/pipeline/progress-view";

export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const analysis = getAnalysis(id);

  if (!analysis) {
    notFound();
  }

  if (analysis.status === "complete") {
    const graph = getAnalysisGraph(id);
    if (graph) {
      return (
        <ExplorerShell
          analysisId={id}
          repoOwner={analysis.repo_owner || "repository"}
          repoName={analysis.repo_name || "project"}
          commitSha={analysis.commit_sha}
          framework={analysis.framework}
          parseResult={graph}
        />
      );
    }
  }

  // Active parsing or failed state
  return (
    <div className="h-full w-full bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      <ProgressView
        analysisId={id}
        repoOwner={analysis.repo_owner || "repository"}
        repoName={analysis.repo_name || "project"}
        initialStage={analysis.stage || "fetch"}
        initialMessage={analysis.stage_message || "Initializing pipeline..."}
      />
    </div>
  );
}
