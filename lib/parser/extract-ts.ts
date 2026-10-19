import { Project, SyntaxKind, type SourceFile } from "ts-morph";
import type { RawImport } from "./types.ts";

/**
 * Creates a lightweight ts-morph Project in memory for AST extraction.
 * No file writing or type-checking overhead needed.
 */
export function createTsProject(): Project {
  return new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      allowJs: true,
      noEmit: true,
    },
  });
}

/**
 * Extracts all imports, re-exports, and dynamic imports from a TypeScript/JavaScript source file.
 */
export function extractTsImports(
  filePath: string,
  content: string,
  project?: Project,
): { imports: RawImport[]; error?: string } {
  const p = project || createTsProject();
  let sourceFile: SourceFile;

  try {
    // Add or create source file in memory
    const existing = p.getSourceFile(filePath);
    if (existing) {
      existing.replaceWithText(content);
      sourceFile = existing;
    } else {
      sourceFile = p.createSourceFile(filePath, content, { overwrite: true });
    }
  } catch (err) {
    return {
      imports: [],
      error: `ts-morph parse error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const rawImports: RawImport[] = [];

  try {
    // 1. Static imports: `import ... from 'specifier';`
    const importDeclarations = sourceFile.getImportDeclarations();
    for (const importDecl of importDeclarations) {
      const specifier = importDecl.getModuleSpecifierValue();
      if (specifier) {
        rawImports.push({
          specifier,
          type: "static",
          line: importDecl.getStartLineNumber(),
        });
      }
    }

    // 2. Re-exports: `export ... from 'specifier';`
    const exportDeclarations = sourceFile.getExportDeclarations();
    for (const exportDecl of exportDeclarations) {
      if (exportDecl.hasModuleSpecifier()) {
        const specifier = exportDecl.getModuleSpecifierValue();
        if (specifier) {
          rawImports.push({
            specifier,
            type: "reexport",
            line: exportDecl.getStartLineNumber(),
          });
        }
      }
    }

    // 3. Dynamic imports: `import('specifier')` and `require('specifier')`
    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
    for (const callExpr of callExpressions) {
      const expr = callExpr.getExpression();

      // Dynamic import: `import('./module')`
      if (expr.getKind() === SyntaxKind.ImportKeyword) {
        const args = callExpr.getArguments();
        if (args.length > 0) {
          const firstArg = args[0];
          const kind = firstArg.getKind();
          if (
            kind === SyntaxKind.StringLiteral ||
            kind === SyntaxKind.NoSubstitutionTemplateLiteral
          ) {
            const rawText = firstArg.getText();
            const specifier = rawText.slice(1, -1); // strip quotes
            if (specifier) {
              rawImports.push({
                specifier,
                type: "dynamic",
                line: callExpr.getStartLineNumber(),
              });
            }
          }
        }
      }

      // require('specifier')
      if (expr.getText() === "require") {
        const args = callExpr.getArguments();
        if (args.length > 0) {
          const firstArg = args[0];
          const kind = firstArg.getKind();
          if (
            kind === SyntaxKind.StringLiteral ||
            kind === SyntaxKind.NoSubstitutionTemplateLiteral
          ) {
            const rawText = firstArg.getText();
            const specifier = rawText.slice(1, -1);
            if (specifier) {
              rawImports.push({
                specifier,
                type: "static",
                line: callExpr.getStartLineNumber(),
              });
            }
          }
        }
      }
    }
  } catch (err) {
    return {
      imports: rawImports,
      error: `AST traversal error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  return { imports: rawImports };
}
