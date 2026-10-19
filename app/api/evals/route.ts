import { NextResponse } from "next/server";
import { getOrRunPromptExperiment, runPromptExperiment } from "@/lib/evals/prompt-experiment";
import { getEvalSummary, getRecentEvalResults } from "@/lib/db";
import { runRoleAccuracyEval } from "@/lib/evals/role-evaluator";

export async function GET() {
  try {
    const experiment = await getOrRunPromptExperiment();
    const evalSummary = getEvalSummary();
    const recentEvals = getRecentEvalResults(10);

    return NextResponse.json({
      experiment,
      evalSummary,
      recentEvals,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action } = body;

    if (action === "role_accuracy") {
      const roleResult = await runRoleAccuracyEval();
      return NextResponse.json({ roleResult });
    }

    // Default: Run live prompt experiment benchmark
    const experiment = await runPromptExperiment();
    const evalSummary = getEvalSummary();

    return NextResponse.json({
      experiment,
      evalSummary,
      success: true,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
