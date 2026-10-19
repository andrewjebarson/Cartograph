import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  updateAnalysisStage,
  updateAnalysisFailure,
  storeAnalysisData,
} from "../db/index";
import { parseRepository } from "../parser/index";
import { deduplicateEdges, calculateMetrics } from "../parser/graph";
import { detectAndAnalyze } from "../adapters/registry";
import { broker } from "./events";

const execFileAsync = promisify(execFile);

export function parseRepoUrl(input: string): { owner: string; repo: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Handle formats:
  // - https://github.com/owner/repo
  // - https://github.com/owner/repo.git
  // - github.com/owner/repo
  // - owner/repo
  let clean = trimmed;
  clean = clean.replace(/^https?:\/\//i, "");
  clean = clean.replace(/^github\.com\//i, "");
  clean = clean.replace(/\.git$/i, "");
  clean = clean.replace(/^\/+|\/+$/g, "");

  const parts = clean.split("/");
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return {
      owner: parts[0].trim(),
      repo: parts[1].trim(),
    };
  }

  return null;
}

function detectFramework(dir: string): string {
  try {
    const files = fs.readdirSync(dir, { recursive: true }) as string[];
    const fileSet = new Set(files.map((f) => f.toLowerCase().replace(/\\/g, "/")));

    const hasPom = Array.from(fileSet).some((f) => f.endsWith("pom.xml"));
    const hasGradle = Array.from(fileSet).some((f) => f.endsWith("build.gradle") || f.endsWith("build.gradle.kts"));
    const hasAngular = Array.from(fileSet).some((f) => f.endsWith("angular.json"));
    const hasNext = Array.from(fileSet).some((f) => f.includes("next.config"));
    const hasJava = Array.from(fileSet).some((f) => f.endsWith(".java"));
    const hasTs = Array.from(fileSet).some((f) => f.endsWith(".ts") || f.endsWith(".tsx"));

    if (hasAngular && hasPom) return "Fullstack (Angular + Spring Boot)";
    if (hasAngular) return "Angular";
    if (hasPom || hasGradle || hasJava) return "Spring Boot";
    if (hasNext) return "Next.js";
    if (hasTs) return "TypeScript";
    return "Generic";
  } catch {
    return "Generic";
  }
}

async function downloadArchive(owner: string, repo: string, destTar: string): Promise<string> {
  let commitSha = "HEAD";

  // Step 1: Check GitHub API to verify existence and get latest commit SHA
  try {
    const apiRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/HEAD`, {
      headers: {
        "User-Agent": "Cartograph-App",
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (apiRes.status === 404) {
      throw new Error(`Repository "${owner}/${repo}" was not found or is private on GitHub.`);
    }

    if (apiRes.ok) {
      const data = (await apiRes.json()) as { sha?: string };
      if (data.sha) {
        commitSha = data.sha.substring(0, 7);
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("was not found")) {
      throw err;
    }
    // Network or rate limit fallback: continue with archive download
  }

  // Step 2: Download tarball archive
  const archiveUrl = `https://codeload.github.com/${owner}/${repo}/tar.gz/HEAD`;
  const archiveRes = await fetch(archiveUrl, {
    headers: {
      "User-Agent": "Cartograph-App",
    },
  });

  if (!archiveRes.ok) {
    if (archiveRes.status === 404) {
      throw new Error(`Repository "${owner}/${repo}" was not found or is private on GitHub.`);
    }
    throw new Error(`Failed to download repository archive from GitHub (HTTP ${archiveRes.status})`);
  }

  const arrayBuffer = await archiveRes.arrayBuffer();
  fs.writeFileSync(destTar, Buffer.from(arrayBuffer));

  return commitSha;
}

export async function runAnalysisPipeline(
  analysisId: string,
  owner: string,
  repo: string,
): Promise<void> {
  const tempBase = path.join(os.tmpdir(), `cartograph_${analysisId}`);
  const destTar = `${tempBase}.tar.gz`;
  const extractDir = path.join(tempBase, "extracted");

  let currentStage = "fetch";

  try {
    // ----------------------------------------------------
    // STAGE 1: FETCH
    // ----------------------------------------------------
    currentStage = "fetch";
    const fetchMsg = `Fetching archive from GitHub (${owner}/${repo})...`;
    updateAnalysisStage(analysisId, "fetch", fetchMsg);
    broker.publish({
      analysisId,
      stage: "fetch",
      message: fetchMsg,
      status: "parsing",
      repoOwner: owner,
      repoName: repo,
      timestamp: new Date().toISOString(),
    });

    fs.mkdirSync(extractDir, { recursive: true });
    let commitSha = await downloadArchive(owner, repo, destTar);

    // Extract tarball using native bsdtar
    await execFileAsync("tar", ["-xzf", destTar, "-C", extractDir]);

    // Find extracted root folder
    const entries = fs.readdirSync(extractDir);
    const subFolder = entries.find((e) => fs.statSync(path.join(extractDir, e)).isDirectory());
    const projectRoot = subFolder ? path.join(extractDir, subFolder) : extractDir;

    if (commitSha === "HEAD" && subFolder) {
      // Subfolder is typically 'repo-7f8a9b1'
      const match = subFolder.match(/[0-9a-f]{7,40}$/i);
      if (match) {
        commitSha = match[0].substring(0, 7);
      }
    }

    // ----------------------------------------------------
    // STAGE 2: SELECT
    // ----------------------------------------------------
    currentStage = "select";
    const selectMsg = "Selecting and indexing candidate source files...";
    updateAnalysisStage(analysisId, "select", selectMsg);
    broker.publish({
      analysisId,
      stage: "select",
      message: selectMsg,
      status: "parsing",
      repoOwner: owner,
      repoName: repo,
      timestamp: new Date().toISOString(),
    });

    const framework = detectFramework(projectRoot);

    // ----------------------------------------------------
    // STAGE 3: PARSE
    // ----------------------------------------------------
    currentStage = "parse";
    const parseMsg = `Parsing ASTs and resolving ${framework} dependencies...`;
    updateAnalysisStage(analysisId, "parse", parseMsg);
    broker.publish({
      analysisId,
      stage: "parse",
      message: parseMsg,
      status: "parsing",
      repoOwner: owner,
      repoName: repo,
      timestamp: new Date().toISOString(),
    });

    const parseResult = parseRepository(projectRoot);

    // Read file contents for framework adapter analysis
    const fileContents: { path: string; content: string }[] = [];
    for (const f of parseResult.files) {
      try {
        const full = path.join(projectRoot, f.path);
        if (fs.existsSync(full)) {
          fileContents.push({ path: f.path, content: fs.readFileSync(full, "utf-8") });
        }
      } catch {
        // ignore read error
      }
    }

    const adapterResult = detectAndAnalyze(fileContents, parseResult.edges);
    const finalFramework = adapterResult.framework !== "Generic" ? adapterResult.framework : framework;

    // Merge DI edges into edges if any
    let finalEdges = parseResult.edges;
    if (adapterResult.diEdges.length > 0) {
      finalEdges = deduplicateEdges([...parseResult.edges, ...adapterResult.diEdges]);
    }

    // Attach roles to files and recalculate metrics
    for (const f of parseResult.files) {
      f.role = adapterResult.fileRoles.get(f.path) || "generic";
    }
    const finalFiles = calculateMetrics(parseResult.files, finalEdges);
    parseResult.files = finalFiles;
    parseResult.edges = finalEdges;
    parseResult.coverage.internalEdges = finalEdges.length;

    // ----------------------------------------------------
    // STAGE 4: STORE
    // ----------------------------------------------------
    currentStage = "store";
    const storeMsg = "Persisting dependency graph and metrics to database...";
    updateAnalysisStage(analysisId, "store", storeMsg);
    broker.publish({
      analysisId,
      stage: "store",
      message: storeMsg,
      status: "parsing",
      repoOwner: owner,
      repoName: repo,
      timestamp: new Date().toISOString(),
    });

    storeAnalysisData(
      analysisId,
      parseResult,
      commitSha,
      finalFramework,
      adapterResult.routes,
      adapterResult.fileRoles,
    );

    // Complete!
    broker.publish({
      analysisId,
      stage: "complete",
      message: "Analysis complete",
      status: "complete",
      repoOwner: owner,
      repoName: repo,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    updateAnalysisFailure(analysisId, currentStage, errorMsg);
    broker.publish({
      analysisId,
      stage: "failed",
      message: errorMsg,
      status: "failed",
      error: errorMsg,
      repoOwner: owner,
      repoName: repo,
      timestamp: new Date().toISOString(),
    });
  } finally {
    // Cleanup temporary files
    try {
      if (fs.existsSync(destTar)) fs.unlinkSync(destTar);
      if (fs.existsSync(tempBase)) fs.rmSync(tempBase, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  }
}
