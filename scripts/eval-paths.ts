import "../lib/evals/env.ts";
import { checkInventedPaths } from "../lib/evals/path-evaluator.ts";
import { listRecentExplanationsWithNeighbors } from "../lib/db/index.ts";

async function main() {
  console.log("==========================================================");
  console.log("   CARTOGRAPH: DETERMINISTIC INVENTED-PATH EVALUATOR      ");
  console.log("==========================================================");

  // ---------------------------------------------------------------------------
  // PART 1: EVALUATE RECENT REAL EXPLANATIONS (Acceptance Check 1)
  // ---------------------------------------------------------------------------
  console.log("\n[1] Evaluating Recent Explanations from Database...");
  const recentExplanations = listRecentExplanationsWithNeighbors(10);

  if (recentExplanations.length === 0) {
    console.log("  No stored explanations found in cartograph.db yet.");
    console.log("  Testing baseline sample explanation...");
    const sampleAllowed = [
      "src/app/services/hero.service.ts",
      "src/app/app.module.ts",
      "src/app/heroes.component.ts",
    ];
    const sampleText =
      "HeroService encapsulates data fetching. It is imported by `src/app/heroes.component.ts` and registered in `src/app/app.module.ts`.";
    const res = checkInventedPaths(sampleText, sampleAllowed);
    console.log(`  Sample check: score=${res.score * 100}% | totalPaths=${res.totalPaths} | invented=${res.inventedPaths.length} | passed=${res.passed}`);
  } else {
    let passedCount = 0;
    for (const item of recentExplanations) {
      const res = checkInventedPaths(item.explanation, item.allowedPaths);
      if (res.passed) passedCount++;

      console.log(`\n  Target: \`${item.targetPath}\` [Model: ${item.model}]`);
      console.log(`  Allowed paths: ${item.allowedPaths.length} | Paths in prose: ${res.totalPaths}`);
      console.log(`  Score: ${(res.score * 100).toFixed(0)}% (${res.passed ? "PASSED" : "FAILED"})`);

      if (!res.passed) {
        console.log(`  ⚠ INVENTED PATHS FLAGGED (verify by hand in 10s):`);
        for (const p of res.inventedPaths) {
          console.log(`    - "${p}" was NOT in allowed neighbors [${item.allowedPaths.join(", ")}]`);
        }
      }
    }

    const overallRate = Math.round((passedCount / recentExplanations.length) * 100);
    console.log(`\n  --> Overall Real Explanation Path Accuracy: ${overallRate}% (${passedCount}/${recentExplanations.length} clean)`);
  }

  // ---------------------------------------------------------------------------
  // PART 2: SYNTHETIC TEST WITH SPLICED MADE-UP FILENAME (Acceptance Check 2)
  // ---------------------------------------------------------------------------
  console.log("\n[2] Testing Made-up Filename Splicing (Acceptance Check 2)...");
  const groundTruthAllowed = [
    "src/app/services/hero.service.ts",
    "src/app/app.module.ts",
    "src/app/heroes.component.ts",
  ];

  // Splicing a fake made-up filename into genuine explanation prose
  const splicedProse = `The \`src/app/services/hero.service.ts\` manages hero entities. It connects to \`src/app/app.module.ts\` and imports a phantom utility \`src/app/fake-ghost-service-that-does-not-exist.ts\`.`;

  console.log("  Input Prose:");
  console.log(`  "${splicedProse}"`);
  console.log(`  Allowed Universe: [${groundTruthAllowed.join(", ")}]`);

  const syntheticResult = checkInventedPaths(splicedProse, groundTruthAllowed);

  console.log(`\n  Result:`);
  console.log(`  • Total paths found: ${syntheticResult.totalPaths}`);
  console.log(`  • Valid paths:       ${syntheticResult.validPaths.join(", ")}`);
  console.log(`  • Invented paths:    ${syntheticResult.inventedPaths.join(", ")}`);
  console.log(`  • Score:             ${(syntheticResult.score * 100).toFixed(0)}%`);
  console.log(`  • Passed:            ${syntheticResult.passed}`);

  if (
    !syntheticResult.passed &&
    syntheticResult.inventedPaths.includes("src/app/fake-ghost-service-that-does-not-exist.ts")
  ) {
    console.log("\n  ✓ SUCCESS: Correctly caught the made-up filename!");
  } else {
    console.error("\n  ✗ ERROR: Failed to catch the made-up filename!");
    process.exit(1);
  }

  console.log("\n==========================================================");
  console.log("   INVENTED-PATH EVALUATOR PASSED                         ");
  console.log("==========================================================");
}

main().catch((err) => {
  console.error("Eval error:", err);
  process.exit(1);
});
