import "../lib/evals/env.ts";
import { checkInventedPaths } from "../lib/evals/path-evaluator.ts";
import { runRoleAccuracyEval } from "../lib/evals/role-evaluator.ts";
import { runPromptExperiment } from "../lib/evals/prompt-experiment.ts";
import { listRecentExplanationsWithNeighbors } from "../lib/db/index.ts";

async function runAllEvals() {
  console.log("==========================================================");
  console.log("            CARTOGRAPH: FULL EVALUATION SUITE             ");
  console.log("==========================================================");

  // 1. Invented-path check
  console.log("\n>>> [1/3] RUNNING INVENTED-PATH CHECK...");
  const recent = listRecentExplanationsWithNeighbors(5);
  console.log(`  Evaluating ${recent.length} recent explanations and testing synthetic made-up path...`);
  const sampleAllowed = ["src/app/services/hero.service.ts", "src/app/app.module.ts"];
  const sampleProse = "The hero service connects to `src/app/app.module.ts` and fake `src/app/phantom.ts`.";
  const catchCheck = checkInventedPaths(sampleProse, sampleAllowed);
  console.log(`  Synthetic made-up path caught: ${catchCheck.inventedPaths.includes("src/app/phantom.ts") ? "YES (PASSED)" : "NO (FAILED)"}`);


  // 2. Role accuracy
  console.log("\n>>> [2/3] RUNNING ROLE ACCURACY (30+ FILES)...");
  const roleSummary = await runRoleAccuracyEval();
  console.log(`  Role Accuracy: ${roleSummary.accuracy}% over ${roleSummary.total} files.`);

  // 3. Prompt experiment
  console.log("\n>>> [3/3] RUNNING PROMPT EXPERIMENTS (v1 vs v2)...");
  const promptExp = await runPromptExperiment();
  console.log(`  Prompt Comparison: v1=${promptExp.v1PathAccuracy}% vs v2=${promptExp.v2PathAccuracy}% (Delta: +${promptExp.pathAccuracyDelta}%)`);
  console.log(`  Specificity: v1=${promptExp.v1Specificity}/10 vs v2=${promptExp.v2Specificity}/10 (Delta: +${promptExp.specificityDelta})`);
  console.log(`  Winner: ${promptExp.winner}`);
  console.log(`  ${promptExp.summary}`);

  console.log("\n==========================================================");
  console.log("            ALL EVALUATIONS COMPLETED CLEANLY             ");
  console.log("==========================================================");
}

runAllEvals().catch((err) => {
  console.error("Suite failed:", err);
  process.exit(1);
});
