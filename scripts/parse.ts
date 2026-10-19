import * as path from "node:path";
import { parseRepository } from "../lib/parser/index.ts";

function run() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes("--json");
  const targetDir = args.find((a) => !a.startsWith("--")) || ".";
  const absTarget = path.resolve(targetDir);

  const startTime = Date.now();
  const result = parseRepository(absTarget);
  const elapsedMs = Date.now() - startTime;

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log("==========================================================");
  console.log("   CARTOGRAPH PARSER: Dual-Engine (TS/Angular + Java)     ");
  console.log("==========================================================");
  console.log(`Target:      ${result.rootPath}`);
  console.log(`Duration:    ${elapsedMs}ms`);
  console.log(`Total Files: ${result.coverage.totalFiles}`);
  console.log(`Total Lines: ${result.coverage.totalLines.toLocaleString()}`);
  console.log(`Bytes:       ${result.coverage.totalBytes.toLocaleString()} bytes`);
  console.log("----------------------------------------------------------");
  console.log(`Internal Edges:      ${result.coverage.internalEdges}`);
  console.log(`External Imports:    ${result.coverage.externalImports}`);
  console.log(`Unresolved Imports:  ${result.coverage.unresolvedImports}`);
  console.log(`Resolution Rate:     ${result.coverage.resolutionRate}%`);
  console.log("----------------------------------------------------------");

  // Sample files with metrics
  console.log("\n[Top Files by Connectivity (Fan-In + Fan-Out)]");
  const sortedByConnectivity = [...result.files].sort(
    (a, b) => b.fanIn + b.fanOut - (a.fanIn + a.fanOut),
  );
  const topFiles = sortedByConnectivity.slice(0, 10);
  for (const f of topFiles) {
    console.log(
      `  • ${f.path.padEnd(45)} [in: ${f.fanIn}, out: ${f.fanOut}, lines: ${f.lineCount}]`,
    );
  }

  // Sample internal edges
  if (result.edges.length > 0) {
    console.log(`\n[Sample Internal Edges (first 10 of ${result.edges.length})]`);
    for (const edge of result.edges.slice(0, 10)) {
      console.log(`  ${edge.source} -> ${edge.target} (${edge.type})`);
    }
  }

  // Sample external imports
  if (result.externalImports.length > 0) {
    const uniqueExternals = Array.from(
      new Set(result.externalImports.map((e) => e.specifier)),
    ).slice(0, 10);
    console.log(
      `\n[Sample External Libraries (first 10 of ${uniqueExternals.length} distinct)]`,
    );
    for (const ext of uniqueExternals) {
      console.log(`  • ${ext}`);
    }
  }

  // Unresolved imports
  if (result.unresolvedImports.length > 0) {
    console.log(
      `\n[Unresolved Imports: ${result.unresolvedImports.length} found]`,
    );
    for (const u of result.unresolvedImports.slice(0, 10)) {
      console.log(`  ⚠ ${u.source} -> "${u.specifier}"`);
      console.log(`    Reason: ${u.reason}`);
    }
  }

  // Skipped files
  if (result.skippedFiles.length > 0) {
    console.log(`\n[Skipped Files: ${result.skippedFiles.length}]`);
    for (const s of result.skippedFiles) {
      console.log(`  • ${s.path}: ${s.reason}`);
    }
  }

  console.log("\n==========================================================");
  console.log("Parse completed successfully.");
}

run();
