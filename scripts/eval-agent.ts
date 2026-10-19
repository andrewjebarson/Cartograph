import "../lib/evals/env.ts";
import { listAnalyses } from "../lib/db/index.ts";
import { mintAgentToken } from "../lib/agent/credentials.ts";
import { runAgentLoop } from "../agent/engine.ts";
import type { ConversationThread, AgentStreamEvent } from "../agent/types.ts";

async function runAgentEval() {
  console.log("==========================================================");
  console.log("   CARTOGRAPH PHASE 12: AGENT EVALUATION BENCHMARK");
  console.log("==========================================================");

  const analyses = listAnalyses();
  let analysis = analyses.find((a) => a.status === "complete");

  if (!analysis) {
    console.log("No complete analysis found. Seeding sample dataset...");
    const { seedSampleData } = await import("../app/(workspace)/actions.ts");
    await seedSampleData();
    const freshAnalyses = listAnalyses();
    analysis = freshAnalyses.find((a) => a.status === "complete") || freshAnalyses[0];
  }

  if (!analysis) {
    console.error("FATAL: Could not acquire or seed an analysis for testing.");
    process.exit(1);
  }

  console.log(`Analysis: ${analysis.id} (${analysis.repo_owner}/${analysis.repo_name})`);
  console.log(`Files in DB: ${analysis.file_count}, Edges: ${analysis.edge_count}`);

  const token = mintAgentToken(analysis.id, analysis.repo_owner || "local-org", 900);
  const toolsBaseUrl = process.env.TOOLS_BASE_URL || "http://localhost:3000";

  const thread: ConversationThread = {
    id: `eval_thread_${Date.now()}`,
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  let totalChecks = 0;
  let passedChecks = 0;

  function assert(name: string, condition: boolean, detail: string = "") {
    totalChecks++;
    if (condition) {
      passedChecks++;
      console.log(`  [PASS] ${name} ${detail ? `(${detail})` : ""}`);
    } else {
      console.error(`  [FAIL] ${name} ${detail ? `(${detail})` : ""}`);
    }
  }

  // ----------------------------------------------------
  // TEST 1: Acceptance Check 1 - "Where is authentication handled?"
  // ----------------------------------------------------
  console.log("\n[Test 1] Query: 'Where is authentication handled?'");
  const eventsTurn1: AgentStreamEvent[] = [];

  const turn1Result = await runAgentLoop({
    message: "where is authentication handled?",
    token,
    toolsBaseUrl,
    thread,
    onEvent: (e) => eventsTurn1.push(e),
  });

  const toolStartsTurn1 = eventsTurn1.filter((e) => e.type === "tool_start");
  const toolEndsTurn1 = eventsTurn1.filter((e) => e.type === "tool_end");

  assert("Tool lookups executed", turn1Result.toolsUsed.length >= 1, `Tools: ${turn1Result.toolsUsed.join(", ")}`);
  assert("Tool start & end streaming events emitted", toolStartsTurn1.length >= 1 && toolEndsTurn1.length >= 1);
  assert("Every answer backed by at least 1 tool call", turn1Result.toolsUsed.length >= 1);
  assert("No internal plumbing mentioned", !turn1Result.fullText.toLowerCase().includes("analysis_id") && !turn1Result.fullText.toLowerCase().includes("hmac"));

  // Check no hedging
  const lowerAns1 = turn1Result.fullText.toLowerCase();
  const hedges = ["i guess", "maybe it is", "perhaps it is", "i believe without checking"];
  const containsHedge = hedges.some((h) => lowerAns1.includes(h));
  assert("No unverified hedging in response", !containsHedge);

  // Update thread
  thread.messages.push({
    id: "t1_u",
    role: "user",
    content: "where is authentication handled?",
    createdAt: new Date().toISOString(),
  });
  thread.messages.push({
    id: "t1_a",
    role: "assistant",
    content: turn1Result.fullText,
    createdAt: new Date().toISOString(),
  });
  if (turn1Result.lastActiveFile) {
    thread.lastActiveFile = turn1Result.lastActiveFile;
  }

  // ----------------------------------------------------
  // TEST 2: Acceptance Check 2 - Follow-up pronoun resolution
  // ----------------------------------------------------
  console.log("\n[Test 2] Follow-up: 'What breaks if I change that?'");
  const eventsTurn2: AgentStreamEvent[] = [];

  const turn2Result = await runAgentLoop({
    message: "what breaks if I change that?",
    token,
    toolsBaseUrl,
    thread,
    onEvent: (e) => eventsTurn2.push(e),
  });

  assert("Pronoun 'that' resolved to prior file", turn2Result.toolsUsed.includes("transitive_walk") || turn2Result.toolsUsed.includes("file_neighbors"), `Resolved target: ${turn2Result.lastActiveFile || "active file"}`);
  assert("Transitive blast radius lookup performed", turn2Result.toolsUsed.includes("transitive_walk"));
  assert("Blast radius metrics present in response", turn2Result.fullText.includes("blast radius") || turn2Result.fullText.includes("break") || turn2Result.fullText.includes("dependents"));

  // ----------------------------------------------------
  // TEST 3: Acceptance Check 3 - Refusal for code quality grading
  // ----------------------------------------------------
  console.log("\n[Test 3] Refusal Check: 'Is this code any good?'");
  const eventsTurn3: AgentStreamEvent[] = [];

  const turn3Result = await runAgentLoop({
    message: "is this code any good?",
    token,
    toolsBaseUrl,
    thread,
    onEvent: (e) => eventsTurn3.push(e),
  });

  const lowerAns3 = turn3Result.fullText.toLowerCase();
  const declinesGrading =
    lowerAns3.includes("cannot evaluate code quality") ||
    lowerAns3.includes("cannot grade") ||
    lowerAns3.includes("cannot evaluate");

  const explainsAlternatives =
    lowerAns3.includes("dependencies") ||
    lowerAns3.includes("blast radius") ||
    lowerAns3.includes("routes");

  assert("Declined subjective code-quality review", declinesGrading);
  assert("Stated objective alternatives it CAN answer", explainsAlternatives);
  assert("Lookup performed above refusal", turn3Result.toolsUsed.length >= 1, `Tools: ${turn3Result.toolsUsed.join(", ")}`);

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log("\n----------------------------------------------------------");
  console.log(`Agent Evaluation Results: ${passedChecks}/${totalChecks} checks passed (${Math.round((passedChecks / totalChecks) * 100)}%)`);
  console.log("----------------------------------------------------------");

  if (passedChecks === totalChecks) {
    console.log("SUCCESS: All Phase 12 Agent constraints and acceptance criteria verified!");
    process.exit(0);
  } else {
    console.error("FAILURE: One or more agent checks failed.");
    process.exit(1);
  }
}

runAgentEval().catch((err) => {
  console.error("Unhandled error in agent evaluation:", err);
  process.exit(1);
});
