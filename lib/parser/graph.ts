import type {
  ParsedFile,
  ResolvedEdge,
  ExternalImport,
  UnresolvedImport,
  CoverageStats,
} from "./types.ts";

/**
 * Deduplicates edges by source, target, and edge type.
 */
export function deduplicateEdges(edges: ResolvedEdge[]): ResolvedEdge[] {
  const seen = new Set<string>();
  const uniqueEdges: ResolvedEdge[] = [];

  for (const edge of edges) {
    const key = `${edge.source} -> ${edge.target} [${edge.type}]`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueEdges.push(edge);
    }
  }

  // Sort edges deterministically
  uniqueEdges.sort((a, b) => {
    const srcCmp = a.source.localeCompare(b.source);
    if (srcCmp !== 0) return srcCmp;
    return a.target.localeCompare(b.target);
  });

  return uniqueEdges;
}

/**
 * Computes pure fan-in and fan-out metrics for all files given the deduplicated edges.
 */
export function calculateMetrics(
  files: ParsedFile[],
  edges: ResolvedEdge[],
): ParsedFile[] {
  const fanInMap = new Map<string, Set<string>>();
  const fanOutMap = new Map<string, Set<string>>();

  for (const file of files) {
    fanInMap.set(file.path, new Set<string>());
    fanOutMap.set(file.path, new Set<string>());
  }

  for (const edge of edges) {
    // Fan-out: files that `edge.source` imports
    const outSet = fanOutMap.get(edge.source);
    if (outSet) {
      outSet.add(edge.target);
    }

    // Fan-in: files that import `edge.target`
    const inSet = fanInMap.get(edge.target);
    if (inSet) {
      inSet.add(edge.source);
    }
  }

  return files.map((file) => ({
    ...file,
    fanIn: fanInMap.get(file.path)?.size || 0,
    fanOut: fanOutMap.get(file.path)?.size || 0,
  }));
}

/**
 * Computes repository coverage stats.
 */
export function computeCoverage(
  files: ParsedFile[],
  edges: ResolvedEdge[],
  externalImports: ExternalImport[],
  unresolvedImports: UnresolvedImport[],
): CoverageStats {
  const totalFiles = files.length;
  const totalLines = files.reduce((sum, f) => sum + f.lineCount, 0);
  const totalBytes = files.reduce((sum, f) => sum + f.byteSize, 0);

  const internalEdges = edges.length;
  const totalExternals = externalImports.length;
  const totalUnresolved = unresolvedImports.length;
  const totalImports = internalEdges + totalExternals + totalUnresolved;

  const resolvedCount = internalEdges + totalExternals;
  const resolutionRate =
    totalImports === 0
      ? 100
      : Math.round((resolvedCount / totalImports) * 1000) / 10;

  return {
    totalFiles,
    totalLines,
    totalBytes,
    totalImports,
    internalEdges,
    externalImports: totalExternals,
    unresolvedImports: totalUnresolved,
    resolutionRate,
  };
}
