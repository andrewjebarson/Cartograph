import type { ResolvedEdge } from "../parser/types.ts";
import type { FrameworkAdapter, AdapterResult, TaxonomyItem } from "./types.ts";
import { angularAdapter } from "./angular.ts";
import { springBootAdapter } from "./spring-boot.ts";
import { expressAdapter } from "./express.ts";

export const REGISTERED_ADAPTERS: FrameworkAdapter[] = [
  angularAdapter,
  springBootAdapter,
  expressAdapter,
];

export function detectAndAnalyze(
  files: { path: string; content: string }[],
  existingEdges: ResolvedEdge[],
): AdapterResult {
  // Try registered adapters in order
  for (const adapter of REGISTERED_ADAPTERS) {
    if (adapter.detect(files)) {
      return adapter.analyze(files, existingEdges);
    }
  }

  // Fallback: Generic repository matching neither adapter
  const fileRoles = new Map<string, string>();
  for (const f of files) {
    fileRoles.set(f.path, "generic");
  }

  const genericTaxonomy: TaxonomyItem[] = [
    { id: "files", name: "Source Files", count: files.length, color: "#64748b" },
    { id: "route", name: "Routes", count: 0, color: "#71717a", isRouteCategory: true },
  ];

  return {
    framework: "Generic",
    fileRoles,
    diEdges: [],
    routes: [],
    taxonomy: genericTaxonomy,
  };
}
