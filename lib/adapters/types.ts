import type { ResolvedEdge } from "../parser/types.ts";

export interface ExtractedRoute {
  id: string;
  method: string; // e.g. "GET", "POST", "PUT", "DELETE", "PATCH", "PAGE"
  path: string; // Full URL pattern, e.g. "/api/users/{username}"
  filePath: string; // Relative path of the file declaring the route
  line: number; // Exact 1-indexed line number in source file
}

export interface TaxonomyItem {
  id: string;
  name: string;
  count: number;
  color: string;
  isRouteCategory?: boolean;
}

export interface AdapterResult {
  framework: string;
  fileRoles: Map<string, string>; // filePath -> role
  diEdges: ResolvedEdge[]; // Explicit dependency injection edges
  routes: ExtractedRoute[]; // Exact extracted routes
  taxonomy: TaxonomyItem[];
}

export interface FrameworkAdapter {
  name: string;
  detect: (files: { path: string; content?: string }[]) => boolean;
  analyze: (
    files: { path: string; content: string }[],
    existingEdges: ResolvedEdge[],
  ) => AdapterResult;
}
