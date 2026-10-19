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
): { imports: RawImport[]; exports: string[]; error?: string } {
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
      exports: [],
      error: `ts-morph parse error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const rawImports: RawImport[] = [];
  const exportNames = new Set<string>();

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

      // require('specifier') with literal string argument
      if (
        expr.getKind() === SyntaxKind.Identifier &&
        expr.getText() === "require"
      ) {
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

    // 4. CommonJS Exports: `module.exports = ...`, `exports.foo = ...`, `module.exports.foo = ...`
    const binaryExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.BinaryExpression);
    for (const binExpr of binaryExpressions) {
      if (binExpr.getOperatorToken().getKind() === SyntaxKind.EqualsToken) {
        const left = binExpr.getLeft();
        const right = binExpr.getRight();
        const leftText = left.getText();

        if (leftText === "module.exports") {
          const rightKind = right.getKind();
          if (rightKind === SyntaxKind.ObjectLiteralExpression) {
            const obj = right.asKind(SyntaxKind.ObjectLiteralExpression);
            if (obj) {
              for (const prop of obj.getProperties()) {
                if (prop.getKind() !== SyntaxKind.SpreadAssignment) {
                  const named = prop as { getName?: () => string };
                  const name = named.getName?.();
                  if (name) {
                    exportNames.add(name.replace(/['"]/g, ""));
                  }
                }
              }
            }
          } else if (rightKind === SyntaxKind.Identifier) {
            exportNames.add(right.getText());
          } else if (
            rightKind === SyntaxKind.FunctionExpression ||
            rightKind === SyntaxKind.ClassExpression
          ) {
            const name = (right as { getName?: () => string | undefined }).getName?.();
            if (name) exportNames.add(name);
          }
        } else if (left.getKind() === SyntaxKind.PropertyAccessExpression) {
          const propAccess = left.asKind(SyntaxKind.PropertyAccessExpression);
          if (propAccess) {
            const exprText = propAccess.getExpression().getText();
            if (exprText === "exports" || exprText === "module.exports") {
              exportNames.add(propAccess.getName());
            }
          }
        } else if (left.getKind() === SyntaxKind.ElementAccessExpression) {
          const elemAccess = left.asKind(SyntaxKind.ElementAccessExpression);
          if (elemAccess) {
            const exprText = elemAccess.getExpression().getText();
            if (exprText === "exports" || exprText === "module.exports") {
              const arg = elemAccess.getArgumentExpression();
              if (
                arg &&
                (arg.getKind() === SyntaxKind.StringLiteral ||
                  arg.getKind() === SyntaxKind.NoSubstitutionTemplateLiteral)
              ) {
                exportNames.add(arg.getText().slice(1, -1));
              }
            }
          }
        }
      }
    }
  } catch (err) {
    return {
      imports: rawImports,
      exports: Array.from(exportNames).sort(),
      error: `AST traversal error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // Deduplicate imports by specifier and type so mixing require() and import reports both without duplicates
  const uniqueImports: RawImport[] = [];
  const seenImports = new Set<string>();
  for (const imp of rawImports) {
    const key = `${imp.specifier}:${imp.type}`;
    if (!seenImports.has(key)) {
      seenImports.add(key);
      uniqueImports.push(imp);
    }
  }

  return {
    imports: uniqueImports,
    exports: Array.from(exportNames).sort(),
  };
}
