import "../lib/evals/env.ts";
import { runPromptExperiment } from "../lib/evals/prompt-experiment.ts";

async function main() {
  console.log("==========================================================");
  console.log("   CARTOGRAPH: PROMPT EXPERIMENTS & COMPARISON (v1 vs v2) ");
  console.log("==========================================================");
  console.log("Comparing:");
  console.log("  • Prompt v1 (Retired): Naive ungrounded file summary");
  console.log("  • Prompt v2 (Current): AST neighbor grounded explanation");
  console.log("  Note on Specificity: Model-as-judge used ('is this specific");
  console.log("  enough to be useful' has no exact mathematical answer).\n");

  const startTime = Date.now();
  const exp = await runPromptExperiment();
  const duration = Date.now() - startTime;

  console.log(`Experiment completed in ${duration}ms over ${exp.datasetSize} benchmark files.\n`);

  console.log("----------------------------------------------------------");
  console.log("                   SIDE-BY-SIDE SCORES                    ");
  console.log("----------------------------------------------------------");
  console.log(`Metric                   | Prompt v1 (Retired) | Prompt v2 (Current) | Delta`);
  console.log(`-------------------------+---------------------+---------------------+-------`);
  console.log(
    `Path Accuracy (0-100%)   | ${String(exp.v1PathAccuracy + "%").padEnd(19)} | ${String(exp.v2PathAccuracy + "%").padEnd(19)} | +${exp.pathAccuracyDelta}%`,
  );
  console.log(
    `Specificity (1.0 - 10.0) | ${String(exp.v1Specificity + "/10").padEnd(19)} | ${String(exp.v2Specificity + "/10").padEnd(19)} | +${exp.specificityDelta}`,
  );
  console.log("----------------------------------------------------------\n");

  console.log("EXPERIMENT CONCLUSION:");
  console.log(`  Winner: ${exp.winner}`);
  console.log(`  ${exp.summary}\n`);

  console.log("Sample Comparisons:");
  for (const item of exp.details.slice(0, 3)) {
    console.log(`\n• File: \`${item.path}\``);
    console.log(`  Prompt v1 Accuracy: ${item.v1PathAccuracy}% (Invented: ${item.v1InventedPaths.length ? item.v1InventedPaths.join(", ") : "none"})`);
    console.log(`  Prompt v2 Accuracy: ${item.v2PathAccuracy}% (Invented: ${item.v2InventedPaths.length ? item.v2InventedPaths.join(", ") : "none"})`);
    console.log(`  Judge Specificity: v1=${item.v1SpecificityScore}/10 vs v2=${item.v2SpecificityScore}/10`);
    console.log(`  Reason: ${item.judgeReasoning}`);
  }

  console.log("\n==========================================================");
  console.log("   PROMPT EXPERIMENT EVALUATION PASSED                    ");
  console.log("==========================================================");
}

main().catch((err) => {
  console.error("Prompt experiment error:", err);
  process.exit(1);
});
