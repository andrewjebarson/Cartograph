import type { ParsedFile, ResolvedEdge } from "../parser/types.ts";

export interface FoldedNodeData {
  id: string; // The directory path, e.g. "src/main/java/com/example/ecommerce/model"
  label: string; // Shortest unique label, e.g. "model"
  directory: string;
  files: ParsedFile[];
  fileCount: number;
  fanIn: number; // How many external files depend on files in this node
  fanOut: number; // How many external files this node depends on
  width: number;
  height: number;
  isExpanded: boolean;
  category: string; // e.g. "controller", "service", "model", etc.
}

export interface FoldedGraph {
  nodes: FoldedNodeData[];
  edges: {
    id: string;
    source: string;
    target: string;
    sourceFile: string;
    targetFile: string;
    count: number;
  }[];
  fileToNodeMap: Map<string, string>;
}

/**
 * Gets the directory of a relative file path using forward slashes.
 */
function getDir(filePath: string): string {
  const idx = filePath.lastIndexOf("/");
  return idx === -1 ? "." : filePath.substring(0, idx);
}

/**
 * Gets parent directory of a directory path.
 */
function getParentDir(dir: string): string {
  if (dir === "." || dir === "") return "";
  const idx = dir.lastIndexOf("/");
  return idx === -1 ? "." : dir.substring(0, idx);
}

/**
 * Derives a human-friendly category from path or extension.
 */
export function deriveCategory(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.includes("controller") || lower.includes("resource") || lower.includes("endpoint")) {
    return "Controllers & API";
  }
  if (lower.includes("service") || lower.includes("usecase")) {
    return "Services & Logic";
  }
  if (lower.includes("repository") || lower.includes("dao")) {
    return "Repositories & Storage";
  }
  if (lower.includes("model") || lower.includes("entity") || lower.includes("schema") || lower.includes("dto")) {
    return "Models & DTOs";
  }
  if (lower.includes("security") || lower.includes("auth") || lower.includes("guard")) {
    return "Security & Auth";
  }
  if (lower.includes("config") || lower.includes("environment")) {
    return "Configuration";
  }
  if (lower.includes("component") || lower.endsWith(".tsx") || lower.endsWith(".jsx")) {
    return "UI Components";
  }
  if (lower.endsWith(".css") || lower.endsWith(".scss") || lower.endsWith(".html")) {
    return "Styles & Assets";
  }
  return "General Code";
}

/**
 * Computes shortest unique labels for a set of visible directories.
 */
function computeShortestUniqueLabels(directories: string[]): Map<string, string> {
  const result = new Map<string, string>();

  for (const dir of directories) {
    if (dir === "." || dir === "") {
      result.set(dir, "root");
      continue;
    }

    const segments = dir.split("/").filter(Boolean);
    let shortest = segments[segments.length - 1];

    for (let len = 1; len <= segments.length; len++) {
      const candidate = segments.slice(-len).join("/");
      // Check collision with any other dir
      const collision = directories.some((other) => {
        if (other === dir) return false;
        const otherSegments = other.split("/").filter(Boolean);
        const otherSuffix = otherSegments.slice(-len).join("/");
        return otherSuffix === candidate;
      });

      if (!collision) {
        shortest = candidate;
        break;
      }
    }

    result.set(dir, shortest);
  }

  return result;
}

/**
 * Deepest-first folding algorithm.
 * Starts with every directory as a node.
 * Working from deepest upward, any directory holding fewer than T files merges into its parent.
 * Stops at lowest T that lands under roughly two dozen nodes (<= 24).
 * Ensures every node has > 1 file.
 */
export function computeFoldedGraph(
  files: ParsedFile[],
  edges: ResolvedEdge[],
  expandedNodeIds: Set<string> = new Set(),
): FoldedGraph {
  if (files.length === 0) {
    return { nodes: [], edges: [], fileToNodeMap: new Map() };
  }

  // Find optimal threshold T (start with 2, increment until nodes <= 24)
  let finalDirMap = new Map<string, ParsedFile[]>();

  for (let threshold = 2; threshold <= 50; threshold++) {
    // Fresh computation for each pass
    const dirMap = new Map<string, ParsedFile[]>();
    for (const f of files) {
      const d = getDir(f.path);
      const list = dirMap.get(d) || [];
      list.push(f);
      dirMap.set(d, list);
    }

    // List all unique directories sorted deepest first
    const allDirs = Array.from(dirMap.keys()).sort((a, b) => {
      const depthA = a === "." ? 0 : a.split("/").length;
      const depthB = b === "." ? 0 : b.split("/").length;
      return depthB - depthA; // Deepest first
    });

    for (const d of allDirs) {
      if (d === "." || d === "") continue;
      const dirFiles = dirMap.get(d) || [];
      if (dirFiles.length < threshold) {
        const parent = getParentDir(d);
        const parentFiles = dirMap.get(parent) || [];
        parentFiles.push(...dirFiles);
        dirMap.set(parent, parentFiles);
        dirMap.delete(d);
      }
    }

    // Filter out empty directories
    const activeDirs = Array.from(dirMap.entries()).filter(
      ([, fls]) => fls.length > 0,
    );

    if (activeDirs.length <= 24 || threshold >= 50) {
      finalDirMap = new Map(activeDirs);
      break;
    }
  }

  // Ensure every node has > 1 file (if any node has exactly 1 file, merge to parent or largest neighbor)
  const remainingDirs = Array.from(finalDirMap.keys());
  for (const d of remainingDirs) {
    const list = finalDirMap.get(d);
    if (!list) continue;
    if (list.length <= 1 && finalDirMap.size > 1) {
      const parent = getParentDir(d);
      if (parent && finalDirMap.has(parent) && parent !== d) {
        finalDirMap.get(parent)?.push(...list);
        finalDirMap.delete(d);
      } else {
        // Merge into the first sibling or neighbor node
        const otherKey = Array.from(finalDirMap.keys()).find((k) => k !== d);
        if (otherKey) {
          finalDirMap.get(otherKey)?.push(...list);
          finalDirMap.delete(d);
        }
      }
    }
  }

  // Map each file to its folded directory node
  const fileToNodeMap = new Map<string, string>();
  for (const [dir, dirFiles] of finalDirMap.entries()) {
    for (const f of dirFiles) {
      fileToNodeMap.set(f.path, dir);
    }
  }

  // Compute shortest unique labels
  const visibleDirs = Array.from(finalDirMap.keys());
  const labelMap = computeShortestUniqueLabels(visibleDirs);

  // Compute node fan-in and fan-out
  const nodeFanIn = new Map<string, number>();
  const nodeFanOut = new Map<string, number>();

  for (const edge of edges) {
    const srcNode = fileToNodeMap.get(edge.source);
    const tgtNode = fileToNodeMap.get(edge.target);
    if (!srcNode || !tgtNode) continue;

    if (srcNode !== tgtNode) {
      nodeFanOut.set(srcNode, (nodeFanOut.get(srcNode) || 0) + 1);
      nodeFanIn.set(tgtNode, (nodeFanIn.get(tgtNode) || 0) + 1);
    }
  }

  // Create FoldedNodeData objects
  const nodes: FoldedNodeData[] = visibleDirs.map((dir) => {
    const dirFiles = finalDirMap.get(dir) || [];
    const label = labelMap.get(dir) || dir;
    const fanIn = nodeFanIn.get(dir) || 0;
    const fanOut = nodeFanOut.get(dir) || 0;
    const isExpanded = expandedNodeIds.has(dir);

    // Height based on things depending on it (fan-in)
    // Width based on label length so long names don't read as important
    const baseHeight = 56;
    const height = isExpanded
      ? 75 + Math.min(dirFiles.length, 10) * 28 + (dirFiles.length > 10 ? 28 : 0)
      : Math.min(130, baseHeight + Math.min(fanIn * 4, 70));

    const width = isExpanded
      ? 280
      : Math.max(140, Math.min(260, label.length * 9 + 50));

    const category = deriveCategory(dirFiles[0]?.path || dir);

    return {
      id: dir,
      label,
      directory: dir,
      files: dirFiles,
      fileCount: dirFiles.length,
      fanIn,
      fanOut,
      width,
      height,
      isExpanded,
      category,
    };
  });

  // Sort nodes deterministically
  nodes.sort((a, b) => a.id.localeCompare(b.id));

  // Compute and deduplicate edges between nodes
  const edgeKeyMap = new Map<
    string,
    {
      id: string;
      source: string;
      target: string;
      sourceFile: string;
      targetFile: string;
      sourceFiles: string[];
      targetFiles: string[];
      count: number;
    }
  >();

  for (const edge of edges) {
    const srcNode = fileToNodeMap.get(edge.source);
    const tgtNode = fileToNodeMap.get(edge.target);
    if (!srcNode || !tgtNode) continue;

    const isSrcExpanded = expandedNodeIds.has(srcNode);
    const isTgtExpanded = expandedNodeIds.has(tgtNode);

    // When nodes are collapsed, connect folder-to-folder
    // When expanded, connect to the specific row
    const edgeKey = `${srcNode}->${tgtNode}:${isSrcExpanded ? edge.source : ""}->${isTgtExpanded ? edge.target : ""}`;

    const existing = edgeKeyMap.get(edgeKey);
    if (existing) {
      existing.count++;
      if (!existing.sourceFiles.includes(edge.source)) {
        existing.sourceFiles.push(edge.source);
      }
      if (!existing.targetFiles.includes(edge.target)) {
        existing.targetFiles.push(edge.target);
      }
    } else {
      edgeKeyMap.set(edgeKey, {
        id: `e-${edgeKey}`,
        source: srcNode,
        target: tgtNode,
        sourceFile: edge.source,
        targetFile: edge.target,
        sourceFiles: [edge.source],
        targetFiles: [edge.target],
        count: 1,
      });
    }
  }

  const resultEdges = Array.from(edgeKeyMap.values()).sort((a, b) =>
    a.id.localeCompare(b.id),
  );

  return {
    nodes,
    edges: resultEdges,
    fileToNodeMap,
  };
}
