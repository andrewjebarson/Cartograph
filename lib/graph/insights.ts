import type { ParsedFile, ResolvedEdge } from "../parser/types.ts";
import { deriveCategory } from "./folding.ts";

export interface TransitiveItem {
  path: string;
  depth: number;
  lineCount: number;
  category: string;
}

export interface TransitiveResult {
  startFile: string;
  direction: "blast-radius" | "dependency-chain";
  items: TransitiveItem[];
  directCount: number;
  transitiveCount: number;
}

/**
 * Single unified transitive walk over the edge list with direction and depth limit.
 * - 'blast-radius': walks upstream (fan-in: who depends on this file)
 * - 'dependency-chain': walks downstream (fan-out: what this file depends on)
 */
export function computeTransitiveWalk(
  startFile: string,
  edges: ResolvedEdge[],
  files: ParsedFile[],
  direction: "blast-radius" | "dependency-chain",
  maxDepth: number = 2,
): TransitiveResult {
  const fileMap = new Map(files.map((f) => [f.path, f]));

  // Build adjacency
  const adj = new Map<string, Set<string>>();
  for (const e of edges) {
    const from = direction === "blast-radius" ? e.target : e.source;
    const to = direction === "blast-radius" ? e.source : e.target;

    const set = adj.get(from) || new Set();
    set.add(to);
    adj.set(from, set);
  }

  // Breadth-first traversal up to maxDepth
  const visitedDepth = new Map<string, number>();
  visitedDepth.set(startFile, 0);

  const queue: { path: string; depth: number }[] = [{ path: startFile, depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= maxDepth) continue;

    const neighbors = adj.get(current.path);
    if (!neighbors) continue;

    for (const neighbor of neighbors) {
      if (!visitedDepth.has(neighbor)) {
        const nextDepth = current.depth + 1;
        visitedDepth.set(neighbor, nextDepth);
        queue.push({ path: neighbor, depth: nextDepth });
      }
    }
  }

  // Remove the startFile itself from result items
  visitedDepth.delete(startFile);

  const items: TransitiveItem[] = Array.from(visitedDepth.entries())
    .map(([p, depth]) => {
      const f = fileMap.get(p);
      return {
        path: p,
        depth,
        lineCount: f?.lineCount || 0,
        category: deriveCategory(p),
      };
    })
    .sort((a, b) => {
      if (a.depth !== b.depth) return a.depth - b.depth;
      return a.path.localeCompare(b.path);
    });

  const directCount = items.filter((i) => i.depth === 1).length;
  const transitiveCount = items.filter((i) => i.depth > 1).length;

  return {
    startFile,
    direction,
    items,
    directCount,
    transitiveCount,
  };
}

export interface CodeCycle {
  cycle: string[]; // [A, B, C, A]
  label: string;
}

/**
 * Iterative cycle detection over the graph.
 * Pure iterative DFS with explicit stack — no recursive calls.
 */
export function findCyclesIterative(edges: ResolvedEdge[]): CodeCycle[] {
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    const list = adj.get(e.source) || [];
    list.push(e.target);
    adj.set(e.source, list);
  }

  const visited = new Set<string>();
  const onPath = new Set<string>();
  const pathStack: string[] = [];
  const edgeIndexStack: number[] = [];
  const foundCycles: CodeCycle[] = [];
  const seenCycleKeys = new Set<string>();

  const allNodes = Array.from(adj.keys());

  for (const startNode of allNodes) {
    if (visited.has(startNode)) continue;

    // Start iterative DFS from startNode
    pathStack.push(startNode);
    edgeIndexStack.push(0);
    onPath.add(startNode);

    while (pathStack.length > 0) {
      const u = pathStack[pathStack.length - 1];
      const neighbors = adj.get(u) || [];
      const edgeIdx = edgeIndexStack[edgeIndexStack.length - 1];

      if (edgeIdx < neighbors.length) {
        // Advance current node's edge index
        edgeIndexStack[edgeIndexStack.length - 1]++;
        const v = neighbors[edgeIdx];

        if (onPath.has(v)) {
          // Cycle found!
          const cycleStartIndex = pathStack.indexOf(v);
          const cycleNodes = pathStack.slice(cycleStartIndex);
          cycleNodes.push(v); // close the loop

          // Normalize cycle key for deduplication
          const loopWithoutEnd = cycleNodes.slice(0, -1);
          const minNode = [...loopWithoutEnd].sort()[0];
          const minIdx = loopWithoutEnd.indexOf(minNode);
          const normalized = [
            ...loopWithoutEnd.slice(minIdx),
            ...loopWithoutEnd.slice(0, minIdx),
          ].join(" -> ");

          if (!seenCycleKeys.has(normalized)) {
            seenCycleKeys.add(normalized);
            foundCycles.push({
              cycle: cycleNodes,
              label: cycleNodes.map((p) => p.split("/").pop()).join(" → "),
            });
          }
        } else if (!visited.has(v)) {
          // Push next node
          pathStack.push(v);
          edgeIndexStack.push(0);
          onPath.add(v);
        }
      } else {
        // Backtrack
        const popped = pathStack.pop()!;
        edgeIndexStack.pop();
        onPath.delete(popped);
        visited.add(popped);
      }
    }
  }

  return foundCycles;
}

export type InsightType = "unimported" | "cycle" | "central" | "oversized";

export interface CodebaseInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  file: string;
  relatedFiles?: string[];
  metric?: string;
}

/**
 * Checks if a file is an expected framework convention file (never an orphan).
 */
export function isFrameworkConventionFile(filePath: string): boolean {
  const p = filePath.toLowerCase();
  const name = p.split("/").pop() || "";

  // Next.js & Web conventions
  if (
    name.startsWith("page.") ||
    name.startsWith("layout.") ||
    name.startsWith("route.") ||
    name.startsWith("loading.") ||
    name.startsWith("error.") ||
    name.startsWith("not-found.") ||
    name.startsWith("middleware.") ||
    name.startsWith("template.")
  ) {
    return true;
  }

  // Routing and configs
  if (
    p.includes("routes.") ||
    p.includes("app.routes") ||
    name.endsWith(".config.ts") ||
    name.endsWith(".config.js") ||
    name.endsWith(".config.mjs") ||
    name.startsWith("main.") ||
    name.startsWith("index.")
  ) {
    return true;
  }

  // Spring Boot conventions
  if (
    name.includes("controller") ||
    name.includes("endpoint") ||
    name.includes("resource") ||
    name.includes("config") ||
    name.includes("security") ||
    name.endsWith("application.java")
  ) {
    return true;
  }

  return false;
}

export const INSIGHT_STRINGS = {
  unimported: "Not imported anywhere in the repository",
  central: "Imported by an unusual number of files",
  cycle: "Forms a circular dependency cycle",
  oversized: "File length exceeds threshold",
} as const;

/**
 * Computes all four kinds of insights from the edge and file lists.
 * Fixed order:
 * 1. Files nothing imports (unimported non-framework files)
 * 2. Unusually depended on (high centrality)
 * 3. Cycles
 * 4. Oversized files
 */
export function computeInsights(
  files: ParsedFile[],
  edges: ResolvedEdge[],
): CodebaseInsight[] {
  const insights: CodebaseInsight[] = [];

  // 1. Files nothing imports (excluding framework conventions)
  const unimportedFiles = files.filter(
    (f) => f.fanIn === 0 && !isFrameworkConventionFile(f.path),
  );

  for (const f of unimportedFiles.slice(0, 10)) {
    insights.push({
      id: `unimported-${f.path}`,
      type: "unimported",
      title: f.path.split("/").pop() || f.path,
      description: INSIGHT_STRINGS.unimported,
      file: f.path,
      metric: `${f.lineCount}L`,
    });
  }

  // 2. Unusually depended on files (high centrality: fanIn >= 4)
  const highCentrality = [...files]
    .filter((f) => f.fanIn >= 4)
    .sort((a, b) => b.fanIn - a.fanIn)
    .slice(0, 6);

  for (const f of highCentrality) {
    insights.push({
      id: `central-${f.path}`,
      type: "central",
      title: f.path.split("/").pop() || f.path,
      description: INSIGHT_STRINGS.central,
      file: f.path,
      metric: `${f.fanIn} in`,
    });
  }

  // 3. Import cycles
  const cycles = findCyclesIterative(edges);
  for (let i = 0; i < cycles.length; i++) {
    const c = cycles[i];
    insights.push({
      id: `cycle-${i}`,
      type: "cycle",
      title: c.label,
      description: INSIGHT_STRINGS.cycle,
      file: c.cycle[0],
      relatedFiles: c.cycle,
      metric: `${c.cycle.length - 1} files`,
    });
  }

  // 4. Oversized files (lineCount >= 85)
  const oversized = [...files]
    .filter((f) => f.lineCount >= 85)
    .sort((a, b) => b.lineCount - a.lineCount)
    .slice(0, 6);

  for (const f of oversized) {
    insights.push({
      id: `oversized-${f.path}`,
      type: "oversized",
      title: f.path.split("/").pop() || f.path,
      description: INSIGHT_STRINGS.oversized,
      file: f.path,
      metric: `${f.lineCount}L`,
    });
  }

  return insights;
}
