import "../lib/evals/env.ts";
import { runRoleAccuracyEval } from "../lib/evals/role-evaluator.ts";
import { ROLE_DATASET, ALLOWED_ROLES } from "../lib/evals/role-dataset.ts";

async function main() {
  console.log("==========================================================");
  console.log("   CARTOGRAPH: HELD-OUT ROLE ACCURACY EVALUATOR           ");
  console.log("==========================================================");
  console.log(`Dataset size: ${ROLE_DATASET.length} held-out files (minimum requirement: 30)`);
  console.log(`Allowed roles: [${ALLOWED_ROLES.join(", ")}]\n`);

  const startTime = Date.now();
  const summary = await runRoleAccuracyEval(ROLE_DATASET);
  const duration = Date.now() - startTime;

  console.log(`Evaluation completed in ${duration}ms.\n`);
  console.log("----------------------------------------------------------");
  console.log(`Overall Role Accuracy: ${summary.accuracy}% (${summary.correct}/${summary.total} correct)`);
  console.log("----------------------------------------------------------\n");

  console.log("Per-Role Accuracy Breakdown:");
  for (const role of ALLOWED_ROLES) {
    const stats = summary.byRole[role];
    console.log(
      `  • ${role.padEnd(12)}: ${stats.accuracy.toFixed(1).padStart(5)}% (${stats.correct}/${stats.total} correct)`,
    );
  }

  console.log("\nSample Classification Results (First 8):");
  for (const item of summary.items.slice(0, 8)) {
    const mark = item.match ? "✓" : "✗";
    console.log(`  ${mark} [${item.expected.padEnd(10)}] -> [${item.predicted.padEnd(10)}] : ${item.path}`);
  }

  if (summary.accuracy >= 70) {
    console.log("\n==========================================================");
    console.log("   ROLE ACCURACY EVALUATION PASSED                        ");
    console.log("==========================================================");
  } else {
    console.error("\nAccuracy below threshold (70%):", summary.accuracy);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Role eval error:", err);
  process.exit(1);
});
