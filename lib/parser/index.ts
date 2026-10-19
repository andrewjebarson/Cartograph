import * as path from "node:path";
import type {
  ParseResult,
  ParsedFile,
  ResolvedEdge,
  ExternalImport,
  UnresolvedImport,
  SkippedFile,
} from "./types.ts";
import { walkRepository, normalizePath } from "./walk.ts";
import { createTsProject, extractTsImports } from "./extract-ts.ts";
import { extractJavaFile, type JavaFileExtraction } from "./extract-java.ts";
import {
  loadTsConfigPaths,
  resolveTsImport,
  buildJavaRepositoryIndex,
  resolveJavaFile,
} from "./resolve.ts";
import {
  deduplicateEdges,
  calculateMetrics,
  computeCoverage,
} from "./graph.ts";

export * from "./types.ts";
export * from "./walk.ts";
export * from "./extract-ts.ts";
export * from "./extract-java.ts";
export * from "./resolve.ts";
export * from "./graph.ts";

/**
 * Parses a repository on disk, producing nodes, edges, coverage, and unresolved import diagnostics.
 * Pure execution: no Next.js, no React, no database.
 */
export function parseRepository(rootDir: string): ParseResult {
  const root = path.resolve(rootDir);
  const { files: walkedFiles, skippedFiles: walkSkipped } = walkRepository(root);

  const allFilesSet = new Set(walkedFiles.map((f) => f.relativePath));
  const tsConfig = loadTsConfigPaths(root);

  const rawEdges: ResolvedEdge[] = [];
  const externalImports: ExternalImport[] = [];
  const unresolvedImports: UnresolvedImport[] = [];
  const skippedFiles: SkippedFile[] = [...walkSkipped];

  // 1. Pre-process Java files for global package & FQCN indexing
  const javaExtractions = new Map<string, JavaFileExtraction>();
  for (const file of walkedFiles) {
    if (file.extension === ".java") {
      try {
        const extraction = extractJavaFile(file.content);
        javaExtractions.set(file.relativePath, extraction);
      } catch (err) {
        skippedFiles.push({
          path: file.relativePath,
          reason: `Java parsing failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }
  }

  const javaIndex = buildJavaRepositoryIndex(javaExtractions, walkedFiles);

  // 2. Process TypeScript / JavaScript files with ts-morph
  const tsProject = createTsProject();
  const rawParsedFiles: ParsedFile[] = [];

  for (const file of walkedFiles) {
    if (file.extension === ".java") {
      const extraction = javaExtractions.get(file.relativePath);
      if (!extraction) continue;

      const { edges, externals, unresolved } = resolveJavaFile(
        file.relativePath,
        extraction,
        javaIndex,
      );

      rawEdges.push(...edges);
      externalImports.push(...externals);
      unresolvedImports.push(...unresolved);

      rawParsedFiles.push({
        path: file.relativePath,
        extension: file.extension,
        lineCount: file.lineCount,
        byteSize: file.byteSize,
        contentHash: file.contentHash,
        fanIn: 0,
        fanOut: 0,
        packageOrNamespace: extraction.packageName,
      });
    } else if (
      file.extension === ".ts" ||
      file.extension === ".tsx" ||
      file.extension === ".js" ||
      file.extension === ".jsx" ||
      file.extension === ".mjs" ||
      file.extension === ".cjs"
    ) {
      // TypeScript or JavaScript
      const { imports, error } = extractTsImports(
        file.relativePath,
        file.content,
        tsProject,
      );

      if (error) {
        skippedFiles.push({
          path: file.relativePath,
          reason: error,
        });
        continue;
      }

      for (const rawImp of imports) {
        const resolved = resolveTsImport(
          file.relativePath,
          rawImp,
          allFilesSet,
          tsConfig,
        );

        if (resolved.edge) {
          rawEdges.push(resolved.edge);
        } else if (resolved.external) {
          externalImports.push(resolved.external);
        } else if (resolved.unresolved) {
          unresolvedImports.push(resolved.unresolved);
        }
      }

      rawParsedFiles.push({
        path: file.relativePath,
        extension: file.extension,
        lineCount: file.lineCount,
        byteSize: file.byteSize,
        contentHash: file.contentHash,
        fanIn: 0,
        fanOut: 0,
      });
    } else {
      // Other supported repository assets/styles (e.g. .css, .scss, .html, .json)
      rawParsedFiles.push({
        path: file.relativePath,
        extension: file.extension,
        lineCount: file.lineCount,
        byteSize: file.byteSize,
        contentHash: file.contentHash,
        fanIn: 0,
        fanOut: 0,
      });
    }
  }

  // 3. Deduplicate edges and compute graph metrics
  const uniqueEdges = deduplicateEdges(rawEdges);
  const filesWithMetrics = calculateMetrics(rawParsedFiles, uniqueEdges);
  const coverage = computeCoverage(
    filesWithMetrics,
    uniqueEdges,
    externalImports,
    unresolvedImports,
  );

  return {
    rootPath: normalizePath(root),
    files: filesWithMetrics,
    edges: uniqueEdges,
    externalImports,
    unresolvedImports,
    skippedFiles,
    coverage,
  };
}
