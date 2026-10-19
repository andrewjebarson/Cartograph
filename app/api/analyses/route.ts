import { NextResponse } from "next/server";
import {
  listAnalyses,
  findAnalysisByRepo,
  createAnalysis,
} from "@/lib/db";
import { parseRepoUrl, runAnalysisPipeline } from "@/lib/pipeline/runner";

export async function GET() {
  const analyses = listAnalyses();
  return NextResponse.json({ analyses });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string; force?: boolean };
    const inputUrl = body.url || "";
    const parsed = parseRepoUrl(inputUrl);

    if (!parsed) {
      return NextResponse.json(
        { error: "Please enter a valid GitHub repository URL (e.g. owner/repo or https://github.com/owner/repo)" },
        { status: 400 },
      );
    }

    const { owner, repo } = parsed;

    // Spec constraint: One analysis per repository.
    // Submitting a URL that has already been analysed does not create a second one — it takes you to the existing analysis.
    if (!body.force) {
      const existing = findAnalysisByRepo(owner, repo);
      if (existing && existing.status === "complete") {
        return NextResponse.json({
          analysisId: existing.id,
          existing: true,
        });
      }
    }

    // Create new analysis row
    const { analysisId } = createAnalysis(owner, repo);

    // Launch pipeline in background (do not await)
    runAnalysisPipeline(analysisId, owner, repo).catch((err) => {
      console.error(`Pipeline uncaught error for ${analysisId}:`, err);
    });

    return NextResponse.json({
      analysisId,
      existing: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
