import { getAnalysisGraph, getAnalysisRoutes } from "../db/index.ts";
import { computeRepoSummary, computeFileDetails } from "../graph/details.ts";
import { computeTransitiveWalk } from "../graph/insights.ts";
import { deriveCategory } from "../graph/folding.ts";

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required?: string[];
  };
}

export const AGENT_TOOLS: ToolDefinition[] = [
  {
    name: "summary",
    description: "Returns an exact structural summary of the entire repository, including frameworks detected, file and edge counts, route count, and top depended-on entrypoints.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "search_files",
    description: "Searches for files in the repository whose paths or filenames match a query string. Returns exact paths, roles, line counts, and in/out degree.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Sub-path, directory name, or filename pattern to search for (e.g. 'auth', 'user', 'service', 'controller').",
        },
        limit: {
          type: "number",
          description: "Maximum number of files to return (defaults to 15).",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "list_by_role",
    description: "Lists files matching a specific architectural role (e.g. 'controller', 'service', 'repository', 'component', 'model', 'security') or broad category.",
    parameters: {
      type: "object",
      properties: {
        role: {
          type: "string",
          description: "Architectural role or category name to filter by (e.g. 'controller', 'service', 'security', 'model', 'component').",
        },
      },
      required: ["role"],
    },
  },
  {
    name: "file_neighbors",
    description: "Returns the direct internal and external dependencies (imports) and dependents (importers) of a specific file in the repository.",
    parameters: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "The exact repository-relative file path to query (e.g. 'src/app/auth/auth.service.ts').",
        },
      },
      required: ["filePath"],
    },
  },
  {
    name: "transitive_walk",
    description: "Computes a transitive walk across the dependency graph. Use 'blast-radius' to see everything that breaks if this file changes (upstream fan-in), or 'dependency-chain' to see everything this file depends on (downstream fan-out).",
    parameters: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "The exact file path to start walking from.",
        },
        direction: {
          type: "string",
          enum: ["blast-radius", "dependency-chain"],
          description: "'blast-radius' walks upstream (callers/importers), 'dependency-chain' walks downstream (dependencies).",
        },
        maxDepth: {
          type: "number",
          description: "Maximum traversal depth (default 2).",
        },
      },
      required: ["filePath", "direction"],
    },
  },
  {
    name: "route_table",
    description: "Returns all HTTP routes and endpoints declared across the repository, including HTTP method, path URL, and the source file where each is defined.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
];

/**
 * Pure dispatcher that invokes one of the six deterministic graph tools.
 * NEVER infers or guesses edges — only reads the verified AST graph.
 */
export async function executeAgentTool(
  toolName: string,
  args: Record<string, unknown>,
  analysisId: string,
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const graph = getAnalysisGraph(analysisId);
  if (!graph) {
    return { success: false, error: `Analysis graph not found or not completed for ID.` };
  }

  const routes = getAnalysisRoutes(analysisId);

  switch (toolName) {
    case "summary": {
      const summary = computeRepoSummary(graph, graph.rootPath, routes.length);
      return {
        success: true,
        data: {
          repository: summary.name,
          framework: summary.framework,
          totalFiles: summary.fileCount,
          totalDependencies: summary.edgeCount,
          routeCount: summary.routeCount,
          mostDependedOn: summary.mostDependedOn.slice(0, 6).map((f) => ({
            path: f.path,
            fanIn: f.fanIn,
            fanOut: f.fanOut,
            role: f.role || deriveCategory(f.path),
          })),
          entrypoints: summary.entrypoints.slice(0, 6).map((f) => ({
            path: f.path,
            fanOut: f.fanOut,
            role: f.role || deriveCategory(f.path),
          })),
          unidentifiedFiles: summary.unidentifiedCount,
        },
      };
    }

    case "search_files": {
      const query = String(args.query || "").toLowerCase().trim();
      const limit = Math.min(Number(args.limit) || 15, 50);

      if (!query) {
        return { success: false, error: "Missing required argument 'query'." };
      }

      const matches = graph.files
        .filter((f) => f.path.toLowerCase().includes(query))
        .slice(0, limit)
        .map((f) => ({
          path: f.path,
          extension: f.extension,
          role: f.role || null,
          category: deriveCategory(f.path),
          lineCount: f.lineCount,
          fanIn: f.fanIn,
          fanOut: f.fanOut,
        }));

      return {
        success: true,
        data: {
          query,
          matchCount: matches.length,
          files: matches,
        },
      };
    }

    case "list_by_role": {
      const target = String(args.role || "").toLowerCase().trim();
      if (!target) {
        return { success: false, error: "Missing required argument 'role'." };
      }

      const matches = graph.files
        .filter((f) => {
          const role = (f.role || "").toLowerCase();
          const category = deriveCategory(f.path).toLowerCase();
          const pathLower = f.path.toLowerCase();
          return role.includes(target) || category.includes(target) || pathLower.includes(target);
        })
        .slice(0, 20)
        .map((f) => ({
          path: f.path,
          role: f.role || null,
          category: deriveCategory(f.path),
          lineCount: f.lineCount,
          fanIn: f.fanIn,
          fanOut: f.fanOut,
        }));

      return {
        success: true,
        data: {
          roleSearched: target,
          matchCount: matches.length,
          files: matches,
        },
      };
    }

    case "file_neighbors": {
      const filePath = String(args.filePath || "").trim();
      if (!filePath) {
        return { success: false, error: "Missing required argument 'filePath'." };
      }

      const details = computeFileDetails(filePath, graph);
      if (!details) {
        // Try fuzzy find if exact path was slightly off
        const candidate = graph.files.find((f) => f.path.toLowerCase().endsWith(filePath.toLowerCase()));
        if (candidate) {
          const fuzzyDetails = computeFileDetails(candidate.path, graph);
          if (fuzzyDetails) {
            return {
              success: true,
              data: {
                file: candidate.path,
                category: fuzzyDetails.category,
                lineCount: candidate.lineCount,
                dependencies: fuzzyDetails.dependencies.slice(0, 15),
                dependents: fuzzyDetails.dependents.slice(0, 15),
                totalDependencies: fuzzyDetails.dependencies.length,
                totalDependents: fuzzyDetails.dependents.length,
              },
            };
          }
        }
        return { success: false, error: `File not found in graph: '${filePath}'.` };
      }

      return {
        success: true,
        data: {
          file: details.file.path,
          category: details.category,
          lineCount: details.file.lineCount,
          dependencies: details.dependencies.slice(0, 15),
          dependents: details.dependents.slice(0, 15),
          totalDependencies: details.dependencies.length,
          totalDependents: details.dependents.length,
        },
      };
    }

    case "transitive_walk": {
      const filePath = String(args.filePath || "").trim();
      const rawDirection = String(args.direction || "blast-radius");
      const direction = rawDirection === "dependency-chain" ? "dependency-chain" : "blast-radius";
      const maxDepth = Math.min(Math.max(Number(args.maxDepth) || 2, 1), 4);

      if (!filePath) {
        return { success: false, error: "Missing required argument 'filePath'." };
      }

      // Check if file exists, or find candidate
      let targetFile = filePath;
      if (!graph.files.some((f) => f.path === filePath)) {
        const candidate = graph.files.find((f) => f.path.toLowerCase().endsWith(filePath.toLowerCase()));
        if (candidate) {
          targetFile = candidate.path;
        } else {
          return { success: false, error: `File not found in graph: '${filePath}'.` };
        }
      }

      const walk = computeTransitiveWalk(targetFile, graph.edges, graph.files, direction, maxDepth);

      return {
        success: true,
        data: {
          startFile: walk.startFile,
          direction: walk.direction,
          directCount: walk.directCount,
          transitiveCount: walk.transitiveCount,
          totalImpacted: walk.items.length,
          items: walk.items.slice(0, 20).map((i) => ({
            path: i.path,
            depth: i.depth,
            category: i.category,
            lineCount: i.lineCount,
          })),
        },
      };
    }

    case "route_table": {
      return {
        success: true,
        data: {
          totalRoutes: routes.length,
          routes: routes.map((r) => ({
            method: r.method,
            path: r.path,
            filePath: r.filePath,
            line: r.line,
          })),
        },
      };
    }

    default:
      return {
        success: false,
        error: `Unknown tool '${toolName}'. Available tools: ${AGENT_TOOLS.map((t) => t.name).join(", ")}.`,
      };
  }
}
