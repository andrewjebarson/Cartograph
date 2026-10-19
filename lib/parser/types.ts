export type EdgeType = "static" | "dynamic" | "reexport" | "package-internal";

export interface ParsedFile {
  path: string; // Relative path with forward slashes, e.g. "src/app/page.tsx"
  extension: string; // e.g. ".ts", ".tsx", ".java"
  lineCount: number;
  byteSize: number;
  contentHash: string; // SHA-256 hex
  fanIn: number;
  fanOut: number;
  packageOrNamespace?: string; // e.g. "com.example.demo.service" for Java
  role?: string; // e.g. "controller", "service", "repository", "entity", "component", "module", "guard"
  exports?: string[]; // Exported names (e.g. CommonJS module exports)
}

export interface ResolvedEdge {
  source: string; // Relative path of importing file
  target: string; // Relative path of imported file
  specifier: string; // Original import string or class name
  type: EdgeType;
}

export interface UnresolvedImport {
  source: string; // Relative path of importing file
  specifier: string; // The import specifier that failed to resolve
  reason: string; // Explanation of why resolution failed
}

export interface ExternalImport {
  source: string; // Relative path of importing file
  specifier: string; // e.g. "@angular/core", "org.springframework.boot..."
  category?: "library" | "runtime" | "unknown";
}

export interface SkippedFile {
  path: string;
  reason: string;
}

export interface CoverageStats {
  totalFiles: number;
  totalLines: number;
  totalBytes: number;
  totalImports: number;
  internalEdges: number;
  externalImports: number;
  unresolvedImports: number;
  resolutionRate: number; // Percentage 0 - 100
}

export interface ParseResult {
  rootPath: string;
  files: ParsedFile[];
  edges: ResolvedEdge[];
  externalImports: ExternalImport[];
  unresolvedImports: UnresolvedImport[];
  skippedFiles: SkippedFile[];
  coverage: CoverageStats;
}

export interface RawImport {
  specifier: string;
  type: EdgeType;
  line?: number;
}
