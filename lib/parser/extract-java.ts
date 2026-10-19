import type { RawImport } from "./types.ts";

export interface JavaImportInfo {
  specifier: string;
  isWildcard: boolean;
  isStatic: boolean;
  line: number;
}

export interface JavaFileExtraction {
  packageName?: string;
  declaredTypes: string[];
  imports: JavaImportInfo[];
  rawImports: RawImport[];
  referencedTypeNames: Set<string>;
}

/**
 * Strips comments and string literals from Java code to safely extract identifiers and imports.
 */
function cleanJavaCode(code: string): string {
  // Replace block comments with whitespace/newlines
  let cleaned = code.replace(/\/\*[\s\S]*?\*\//g, (match) => {
    return match.replace(/[^\n]/g, " ");
  });
  // Replace line comments with spaces
  cleaned = cleaned.replace(/\/\/[^\n]*/g, " ");
  // Replace string and character literals with spaces (preserving newlines)
  cleaned = cleaned.replace(/"(?:\\.|[^"\\])*"/g, '""');
  cleaned = cleaned.replace(/'(?:\\.|[^'\\])*'/g, "''");
  return cleaned;
}

/**
 * Extracts package declaration, imports, and referenced class names from Java source code.
 */
export function extractJavaFile(content: string): JavaFileExtraction {
  let packageName: string | undefined;
  const declaredTypes: string[] = [];
  const imports: JavaImportInfo[] = [];
  const rawImports: RawImport[] = [];

  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;

    // Package declaration
    const pkgMatch = line.match(/^package\s+([a-zA-Z0-9_.]+)\s*;/);
    if (pkgMatch) {
      packageName = pkgMatch[1];
      continue;
    }

    // Import declarations
    const importMatch = line.match(/^import\s+(static\s+)?([a-zA-Z0-9_.*]+)\s*;/);
    if (importMatch) {
      const isStatic = Boolean(importMatch[1]);
      const specifier = importMatch[2];
      const isWildcard = specifier.endsWith(".*");

      imports.push({
        specifier,
        isWildcard,
        isStatic,
        line: lineNum,
      });

      rawImports.push({
        specifier,
        type: "static",
        line: lineNum,
      });
    }
  }

  // Find declared types: class, interface, enum, record
  const cleaned = cleanJavaCode(content);
  const typeDeclRegex = /\b(?:class|interface|enum|record)\s+([A-Za-z0-9_]+)\b/g;
  let typeMatch: RegExpExecArray | null;
  while ((typeMatch = typeDeclRegex.exec(cleaned)) !== null) {
    declaredTypes.push(typeMatch[1]);
  }

  // Find all PascalCase capitalized identifiers that could be class references
  const referencedTypeNames = new Set<string>();
  const identifierRegex = /\b([A-Z][a-zA-Z0-9_]*)\b/g;
  let idMatch: RegExpExecArray | null;
  while ((idMatch = identifierRegex.exec(cleaned)) !== null) {
    referencedTypeNames.add(idMatch[1]);
  }

  return {
    packageName,
    declaredTypes,
    imports,
    rawImports,
    referencedTypeNames,
  };
}
