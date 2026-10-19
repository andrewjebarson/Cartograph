import type { ParseResult, ParsedFile } from "../parser/types.ts";
import { deriveCategory, type FoldedNodeData } from "./folding.ts";

export interface RepoSummaryData {
  name: string;
  framework: string;
  fileCount: number;
  edgeCount: number;
  routeCount: number;
  mostDependedOn: ParsedFile[];
  entrypoints: ParsedFile[];
  unidentifiedCount: number;
}

export interface FileDependencyItem {
  path: string;
  specifier: string;
  isExternal?: boolean;
}

export interface FileDetailsData {
  file: ParsedFile;
  category: string;
  dependencies: FileDependencyItem[]; // What this file imports (fan-out)
  dependents: FileDependencyItem[]; // What imports this file (fan-in)
}

export interface FolderDetailsData {
  folder: FoldedNodeData;
  categoryBreakdown: { category: string; count: number }[];
  files: ParsedFile[];
  dependencies: { targetNodeId: string; targetLabel: string; count: number }[];
  dependents: { sourceNodeId: string; sourceLabel: string; count: number }[];
}

/**
 * Computes the resting summary of the repository when nothing is selected.
 */
export function computeRepoSummary(
  parseResult: ParseResult,
  repoName: string = "ecommerce-fullstack",
): RepoSummaryData {
  const { files, edges, externalImports } = parseResult;

  // Framework detection
  const hasJava = files.some((f) => f.extension === ".java");
  const hasTs = files.some((f) => f.extension === ".ts" || f.extension === ".tsx");
  let framework = "TypeScript & JavaScript";
  if (hasJava && hasTs) {
    framework = "Spring Boot (Java) & Angular (TypeScript)";
  } else if (hasJava) {
    framework = "Spring Boot (Java)";
  } else if (hasTs) {
    framework = "Angular (TypeScript)";
  }

  // Count estimated routes (controllers, endpoints, routes.ts)
  const routeCount = files.filter((f) => {
    const p = f.path.toLowerCase();
    return (
      p.includes("controller") ||
      p.includes("endpoint") ||
      p.includes("resource") ||
      p.includes("routes.") ||
      p.includes("app.routes")
    );
  }).length;

  // Most depended on: sorted by fanIn desc
  const mostDependedOn = [...files]
    .filter((f) => f.fanIn > 0)
    .sort((a, b) => b.fanIn - a.fanIn)
    .slice(0, 8);

  // Where reading starts: entrypoints (fanIn === 0, fanOut > 0)
  const entrypoints = [...files]
    .filter((f) => f.fanIn === 0 && f.fanOut > 0)
    .sort((a, b) => b.fanOut - a.fanOut)
    .slice(0, 8);

  // Unidentified files: general code that didn't match conventional patterns
  const unidentifiedCount = files.filter(
    (f) => deriveCategory(f.path) === "General Code",
  ).length;

  return {
    name: repoName,
    framework,
    fileCount: files.length,
    edgeCount: edges.length + externalImports.length,
    routeCount,
    mostDependedOn,
    entrypoints,
    unidentifiedCount,
  };
}

/**
 * Computes details for a single selected file.
 * Constraint: Dependency & dependent counts match the exact number of rows underneath them.
 */
export function computeFileDetails(
  filePath: string,
  parseResult: ParseResult,
): FileDetailsData | null {
  const file = parseResult.files.find((f) => f.path === filePath);
  if (!file) return null;

  const category = deriveCategory(file.path);

  // Dependencies (fan-out: what this file imports)
  const dependencies: FileDependencyItem[] = [];
  const seenDeps = new Set<string>();

  for (const edge of parseResult.edges) {
    if (edge.source === filePath && !seenDeps.has(edge.target)) {
      seenDeps.add(edge.target);
      dependencies.push({
        path: edge.target,
        specifier: edge.specifier,
        isExternal: false,
      });
    }
  }

  for (const ext of parseResult.externalImports) {
    if (ext.source === filePath && !seenDeps.has(ext.specifier)) {
      seenDeps.add(ext.specifier);
      dependencies.push({
        path: ext.specifier,
        specifier: ext.specifier,
        isExternal: true,
      });
    }
  }

  // Dependents (fan-in: what imports this file)
  const dependents: FileDependencyItem[] = [];
  const seenDependents = new Set<string>();

  for (const edge of parseResult.edges) {
    if (edge.target === filePath && !seenDependents.has(edge.source)) {
      seenDependents.add(edge.source);
      dependents.push({
        path: edge.source,
        specifier: edge.specifier,
        isExternal: false,
      });
    }
  }

  return {
    file,
    category,
    dependencies,
    dependents,
  };
}

/**
 * Computes details for a selected folded folder node.
 */
export function computeFolderDetails(
  folderId: string,
  foldedNodes: FoldedNodeData[],
  edges: { source: string; target: string; count: number }[],
): FolderDetailsData | null {
  const folder = foldedNodes.find((n) => n.id === folderId);
  if (!folder) return null;

  // Category breakdown
  const catMap = new Map<string, number>();
  for (const f of folder.files) {
    const cat = deriveCategory(f.path);
    catMap.set(cat, (catMap.get(cat) || 0) + 1);
  }

  const categoryBreakdown = Array.from(catMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  // Dependencies (folders this folder imports)
  const nodeLabelMap = new Map(foldedNodes.map((n) => [n.id, n.label]));
  const dependencies = edges
    .filter((e) => e.source === folderId && e.target !== folderId)
    .map((e) => ({
      targetNodeId: e.target,
      targetLabel: nodeLabelMap.get(e.target) || e.target,
      count: e.count,
    }));

  // Dependents (folders that import this folder)
  const dependents = edges
    .filter((e) => e.target === folderId && e.source !== folderId)
    .map((e) => ({
      sourceNodeId: e.source,
      sourceLabel: nodeLabelMap.get(e.source) || e.source,
      count: e.count,
    }));

  return {
    folder,
    categoryBreakdown,
    files: folder.files,
    dependencies,
    dependents,
  };
}
