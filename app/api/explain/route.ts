import { NextResponse } from "next/server";
import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import {
  getAnalysis,
  getFileRecord,
  getFileNeighbors,
  getFolderDetails,
  getCachedExplanation,
  saveExplanation,
  recordAiTrace,
  recordEvalResult,
} from "../../../lib/db/index.ts";
import { getAiConfig, generateAiCompletion } from "../../../lib/ai/client.ts";
import {
  SYSTEM_PROMPT,
  buildFileExplainPrompt,
  buildFolderExplainPrompt,
} from "../../../lib/ai/prompts.ts";
import { checkInventedPaths } from "../../../lib/evals/path-evaluator.ts";


export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { analysisId, targetPath, targetType = "file", forceRefresh = false } = body;

    if (!analysisId || !targetPath) {
      return NextResponse.json(
        { error: "Missing required parameters: analysisId and targetPath" },
        { status: 400 },
      );
    }

    const analysis = getAnalysis(analysisId);
    if (!analysis) {
      return NextResponse.json(
        { error: `Analysis not found for ID: ${analysisId}` },
        { status: 404 },
      );
    }

    const aiConfig = getAiConfig();
    const startTime = Date.now();

    // -------------------------------------------------------------------------
    // FILE EXPLANATION
    // -------------------------------------------------------------------------
    if (targetType === "file") {
      const fileRecord = getFileRecord(analysisId, targetPath);

      // Attempt to retrieve content: from database record, or fallback to disk
      let content = fileRecord?.content || "";
      if (!content) {
        const candidatePaths = [
          path.join(/*turbopackIgnore: true*/ process.cwd(), analysis.repo_owner || "", analysis.repo_name || "", targetPath),
          path.join(/*turbopackIgnore: true*/ process.cwd(), "fixtures", analysis.repo_name || "", targetPath),
          path.join(/*turbopackIgnore: true*/ process.cwd(), targetPath),
        ];

        for (const candidate of candidatePaths) {
          if (fs.existsSync(/*turbopackIgnore: true*/ candidate) && fs.statSync(/*turbopackIgnore: true*/ candidate).isFile()) {
            try {
              content = fs.readFileSync(/*turbopackIgnore: true*/ candidate, "utf8");
              break;
            } catch {
              // ignore
            }
          }
        }
      }

      // Compute content hash for exact caching
      const contentHash = content
        ? crypto.createHash("sha256").update(content, "utf8").digest("hex")
        : fileRecord?.content_hash ||
          crypto.createHash("sha256").update(targetPath, "utf8").digest("hex");

      // Retrieve exact neighbors
      const { imports, importedBy } = getFileNeighbors(analysisId, targetPath);
      const allowedPaths = [targetPath, ...imports, ...importedBy];

      // 1. Cache read inside the traced function
      if (!forceRefresh) {
        const cached = getCachedExplanation(contentHash, aiConfig.model);
        if (cached) {
          const durationMs = Date.now() - startTime;
          const pathEval = checkInventedPaths(cached.explanation, allowedPaths);

          recordAiTrace({
            analysisId,
            targetPath,
            contentHash,
            model: cached.model,
            cacheHit: true,
            durationMs,
          });

          recordEvalResult({
            targetPath,
            evalType: "invented_path",
            score: pathEval.score,
            passed: pathEval.passed,
            totalPaths: pathEval.totalPaths,
            inventedPaths: pathEval.inventedPaths,
            durationMs,
          });

          return NextResponse.json({
            explanation: cached.explanation,
            text: cached.explanation,
            targetPath,
            targetType: "file",
            cached: true,
            model: cached.model,
            provider: aiConfig.provider,
            contentHash,
            durationMs,
            trace: {
              cacheHit: true,
              modelCalls: 0,
              durationMs,
            },
            eval: {
              pathAccuracy: pathEval.score,
              passed: pathEval.passed,
              inventedPaths: pathEval.inventedPaths,
              totalPaths: pathEval.totalPaths,
            },
          });
        }
      }

      // 2. Cache miss: retrieve exact neighbors and call model
      const prompt = buildFileExplainPrompt({
        path: targetPath,
        content: content || `// File: ${targetPath}\n// Role: ${fileRecord?.role || "generic"}`,
        role: fileRecord?.role || "generic",
        framework: analysis.framework || "Generic",
        imports,
        importedBy,
      });

      const completion = await generateAiCompletion(prompt, SYSTEM_PROMPT);
      const durationMs = Date.now() - startTime;
      const pathEval = checkInventedPaths(completion.text, allowedPaths);

      // Persist in local SQLite cache
      saveExplanation({
        fileId: fileRecord?.id || null,
        targetPath,
        contentHash,
        model: completion.model,
        explanation: completion.text,
      });

      // Record trace
      recordAiTrace({
        analysisId,
        targetPath,
        contentHash,
        model: completion.model,
        cacheHit: false,
        durationMs,
      });

      recordEvalResult({
        targetPath,
        evalType: "invented_path",
        score: pathEval.score,
        passed: pathEval.passed,
        totalPaths: pathEval.totalPaths,
        inventedPaths: pathEval.inventedPaths,
        durationMs,
      });

      return NextResponse.json({
        explanation: completion.text,
        text: completion.text,
        targetPath,
        targetType: "file",
        cached: false,
        model: completion.model,
        provider: completion.provider,
        contentHash,
        durationMs,
        trace: {
          cacheHit: false,
          modelCalls: 1,
          durationMs,
        },
        eval: {
          pathAccuracy: pathEval.score,
          passed: pathEval.passed,
          inventedPaths: pathEval.inventedPaths,
          totalPaths: pathEval.totalPaths,
        },
      });
    }

    // -------------------------------------------------------------------------
    // FOLDER EXPLANATION
    // -------------------------------------------------------------------------
    const folderDetails = getFolderDetails(analysisId, targetPath);
    const folderAllowedPaths = [
      targetPath,
      ...folderDetails.files.map((f) => f.path),
      ...folderDetails.incomingFiles,
      ...folderDetails.outgoingFiles,
    ];

    // Deterministic folder hash derived from its files and their hashes
    const folderHashPayload =
      targetPath +
      ":" +
      folderDetails.files.map((f) => `${f.path}:${f.contentHash || ""}`).join("|");
    const folderHash = crypto
      .createHash("sha256")
      .update(folderHashPayload, "utf8")
      .digest("hex");

    // 1. Cache read inside traced function
    if (!forceRefresh) {
      const cached = getCachedExplanation(folderHash, aiConfig.model);
      if (cached) {
        const durationMs = Date.now() - startTime;
        const pathEval = checkInventedPaths(cached.explanation, folderAllowedPaths);

        recordAiTrace({
          analysisId,
          targetPath,
          contentHash: folderHash,
          model: cached.model,
          cacheHit: true,
          durationMs,
        });

        recordEvalResult({
          targetPath,
          evalType: "invented_path",
          score: pathEval.score,
          passed: pathEval.passed,
          totalPaths: pathEval.totalPaths,
          inventedPaths: pathEval.inventedPaths,
          durationMs,
        });

        return NextResponse.json({
          explanation: cached.explanation,
          text: cached.explanation,
          targetPath,
          targetType: "folder",
          cached: true,
          model: cached.model,
          provider: aiConfig.provider,
          contentHash: folderHash,
          durationMs,
          trace: {
            cacheHit: true,
            modelCalls: 0,
            durationMs,
          },
          eval: {
            pathAccuracy: pathEval.score,
            passed: pathEval.passed,
            inventedPaths: pathEval.inventedPaths,
            totalPaths: pathEval.totalPaths,
          },
        });
      }
    }

    // 2. Cache miss: prompt model with folder context
    const prompt = buildFolderExplainPrompt({
      directory: targetPath,
      files: folderDetails.files,
      fanIn: folderDetails.fanIn,
      fanOut: folderDetails.fanOut,
      incomingFiles: folderDetails.incomingFiles,
      outgoingFiles: folderDetails.outgoingFiles,
      framework: analysis.framework || "Generic",
    });

    const completion = await generateAiCompletion(prompt, SYSTEM_PROMPT);
    const durationMs = Date.now() - startTime;
    const pathEval = checkInventedPaths(completion.text, folderAllowedPaths);

    saveExplanation({
      fileId: null,
      targetPath,
      contentHash: folderHash,
      model: completion.model,
      explanation: completion.text,
    });

    recordAiTrace({
      analysisId,
      targetPath,
      contentHash: folderHash,
      model: completion.model,
      cacheHit: false,
      durationMs,
    });

    recordEvalResult({
      targetPath,
      evalType: "invented_path",
      score: pathEval.score,
      passed: pathEval.passed,
      totalPaths: pathEval.totalPaths,
      inventedPaths: pathEval.inventedPaths,
      durationMs,
    });

    return NextResponse.json({
      explanation: completion.text,
      text: completion.text,
      targetPath,
      targetType: "folder",

      cached: false,
      model: completion.model,
      provider: completion.provider,
      contentHash: folderHash,
      durationMs,
      trace: {
        cacheHit: false,
        modelCalls: 1,
        durationMs,
      },
      eval: {
        pathAccuracy: pathEval.score,
        passed: pathEval.passed,
        inventedPaths: pathEval.inventedPaths,
        totalPaths: pathEval.totalPaths,
      },
    });

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
