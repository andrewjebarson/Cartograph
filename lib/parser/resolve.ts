import * as fs from "node:fs";
import * as path from "node:path";
import type {
  ResolvedEdge,
  UnresolvedImport,
  ExternalImport,
  RawImport,
} from "./types.ts";
import type { WalkedFile } from "./walk.ts";
import { normalizePath } from "./walk.ts";
import type { JavaFileExtraction } from "./extract-java.ts";

export interface TsConfigPaths {
  baseUrl: string;
  paths: Record<string, string[]>;
}

/**
 * Common known external Java packages
 */
const KNOWN_EXTERNAL_JAVA_PREFIXES = [
  "java.",
  "javax.",
  "jakarta.",
  "org.springframework.",
  "org.slf4j.",
  "lombok.",
  "com.fasterxml.jackson.",
  "org.junit.",
  "org.mockito.",
  "org.apache.",
  "org.hibernate.",
  "io.swagger.",
  "org.jetbrains.",
  "com.google.",
  "org.assertj.",
  "org.hamcrest.",
  "reactor.",
  "org.mapstruct.",
];

import { ts } from "ts-morph";

/**
 * Loads tsconfig.json or jsconfig.json from root directory if it exists.
 */
export function loadTsConfigPaths(rootDir: string): TsConfigPaths | null {
  const tsConfigPath = path.join(rootDir, "tsconfig.json");
  const jsConfigPath = path.join(rootDir, "jsconfig.json");
  const configPath = fs.existsSync(tsConfigPath)
    ? tsConfigPath
    : fs.existsSync(jsConfigPath)
      ? jsConfigPath
      : null;

  if (!configPath) return null;

  try {
    const raw = fs.readFileSync(configPath, "utf8");
    const parsed = ts.parseConfigFileTextToJson(configPath, raw);
    if (parsed.error || !parsed.config) {
      return null;
    }
    const compilerOptions = parsed.config.compilerOptions || {};
    const baseUrl = compilerOptions.baseUrl || ".";
    const paths = compilerOptions.paths || {};

    return {
      baseUrl: normalizePath(baseUrl),
      paths,
    };
  } catch {
    return null;
  }
}

/**
 * Checks if a relative path exists in the repository file set.
 */
function fileExistsInSet(
  candidateRel: string,
  allFilesSet: Set<string>,
): string | null {
  const clean = normalizePath(candidateRel);
  if (allFilesSet.has(clean)) {
    return clean;
  }
  return null;
}

const TS_EXTENSIONS = [
  "",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  "/index.ts",
  "/index.tsx",
  "/index.js",
  "/index.jsx",
];

/**
 * Resolves a TypeScript import specifier to a repository file or external import.
 */
export function resolveTsImport(
  sourceRelPath: string,
  rawImport: RawImport,
  allFilesSet: Set<string>,
  tsConfig: TsConfigPaths | null,
): {
  edge?: ResolvedEdge;
  external?: ExternalImport;
  unresolved?: UnresolvedImport;
} {
  const { specifier, type } = rawImport;

  // Node built-in modules
  if (
    specifier.startsWith("node:") ||
    specifier === "fs" ||
    specifier === "path" ||
    specifier === "crypto" ||
    specifier === "os" ||
    specifier === "http"
  ) {
    return {
      external: {
        source: sourceRelPath,
        specifier,
        category: "runtime",
      },
    };
  }

  // 1. Check relative imports (starts with ./ or ../)
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const sourceDir = path.dirname(sourceRelPath);
    const resolvedRel = normalizePath(path.join(sourceDir, specifier));

    const candidatePaths: string[] = [];
    for (const ext of TS_EXTENSIONS) {
      const candidate = resolvedRel + ext;
      candidatePaths.push(candidate);
      const match = fileExistsInSet(candidate, allFilesSet);
      if (match) {
        return {
          edge: {
            source: sourceRelPath,
            target: match,
            specifier,
            type,
          },
        };
      }
    }

    return {
      unresolved: {
        source: sourceRelPath,
        specifier,
        reason: `Target file not found for relative import: tried [${candidatePaths.slice(0, 4).join(", ")}...]`,
      },
    };
  }

  // 2. Check path aliases from tsconfig (e.g. `@/*` -> `./*`)
  if (tsConfig && Object.keys(tsConfig.paths).length > 0) {
    for (const [aliasPattern, targetPatterns] of Object.entries(tsConfig.paths)) {
      let isMatch = false;
      let matchedWildcard = "";

      if (aliasPattern.endsWith("/*")) {
        const prefix = aliasPattern.slice(0, -2);
        if (specifier.startsWith(prefix + "/")) {
          isMatch = true;
          matchedWildcard = specifier.slice(prefix.length + 1);
        }
      } else if (aliasPattern === specifier) {
        isMatch = true;
        matchedWildcard = "";
      }

      if (isMatch) {
        const candidatePaths: string[] = [];
        for (const targetPattern of targetPatterns) {
          const replaced = targetPattern.endsWith("/*")
            ? targetPattern.slice(0, -2) + "/" + matchedWildcard
            : targetPattern;

          const basePrefixed = normalizePath(path.join(tsConfig.baseUrl, replaced));

          for (const ext of TS_EXTENSIONS) {
            const candidate = basePrefixed + ext;
            candidatePaths.push(candidate);
            const match = fileExistsInSet(candidate, allFilesSet);
            if (match) {
              return {
                edge: {
                  source: sourceRelPath,
                  target: match,
                  specifier,
                  type,
                },
              };
            }
          }
        }

        // Matched an alias pattern but file not found on disk
        return {
          unresolved: {
            source: sourceRelPath,
            specifier,
            reason: `Alias ${aliasPattern} matched, but target file not found: tried [${candidatePaths.slice(0, 4).join(", ")}]`,
          },
        };
      }
    }
  }

  // 3. Otherwise bare specifier (external library like @angular/core, react, etc.)
  return {
    external: {
      source: sourceRelPath,
      specifier,
      category: "library",
    },
  };
}

export interface JavaRepositoryIndex {
  fqcnMap: Map<string, string>; // FQCN -> relativePath
  packageMap: Map<string, string[]>; // packageName -> relativePaths
  fileTypesMap: Map<string, string[]>; // relativePath -> declaredTypes
  basePackagePrefixes: string[];
}

/**
 * Builds an index of all Java files, packages, and fully-qualified class names in the repository.
 */
export function buildJavaRepositoryIndex(
  javaExtractions: Map<string, JavaFileExtraction>,
  walkedFiles: WalkedFile[],
): JavaRepositoryIndex {
  const fqcnMap = new Map<string, string>();
  const packageMap = new Map<string, string[]>();
  const fileTypesMap = new Map<string, string[]>();
  const packagePrefixSet = new Set<string>();

  for (const file of walkedFiles) {
    if (file.extension !== ".java") continue;

    const extraction = javaExtractions.get(file.relativePath);
    const pkg = extraction?.packageName || "";
    const declaredTypes = extraction?.declaredTypes || [];

    // Derive class name from file name as fallback (e.g. "UserService.java" -> "UserService")
    const baseName = path.basename(file.relativePath, ".java");
    const typesToRegister = declaredTypes.length > 0 ? declaredTypes : [baseName];

    fileTypesMap.set(file.relativePath, typesToRegister);

    // Group by package
    if (pkg) {
      const existing = packageMap.get(pkg) || [];
      existing.push(file.relativePath);
      packageMap.set(pkg, existing);

      // Extract root 2 parts of package (e.g. "com.example" from "com.example.demo.service")
      const parts = pkg.split(".");
      if (parts.length >= 2) {
        packagePrefixSet.add(parts.slice(0, 2).join("."));
      } else if (parts.length === 1) {
        packagePrefixSet.add(parts[0]);
      }
    }

    // Register FQCNs
    for (const typeName of typesToRegister) {
      const fqcn = pkg ? `${pkg}.${typeName}` : typeName;
      fqcnMap.set(fqcn, file.relativePath);
    }
  }

  return {
    fqcnMap,
    packageMap,
    fileTypesMap,
    basePackagePrefixes: Array.from(packagePrefixSet),
  };
}

/**
 * Resolves Java imports and same-package implicit references.
 */
export function resolveJavaFile(
  sourceRelPath: string,
  extraction: JavaFileExtraction,
  javaIndex: JavaRepositoryIndex,
): {
  edges: ResolvedEdge[];
  externals: ExternalImport[];
  unresolved: UnresolvedImport[];
} {
  const edges: ResolvedEdge[] = [];
  const externals: ExternalImport[] = [];
  const unresolved: UnresolvedImport[] = [];
  const seenTargets = new Set<string>();

  // 1. Process explicit imports
  for (const imp of extraction.imports) {
    const specifier = imp.specifier;

    // Check wildcard import: `import com.example.demo.model.*;`
    if (imp.isWildcard) {
      const pkgName = specifier.slice(0, -2);
      const pkgFiles = javaIndex.packageMap.get(pkgName);

      if (pkgFiles && pkgFiles.length > 0) {
        let matchedWildcardCount = 0;
        for (const targetPath of pkgFiles) {
          if (targetPath === sourceRelPath) continue;

          // Check if any declared type in target file is referenced in this file
          const targetTypes = javaIndex.fileTypesMap.get(targetPath) || [];
          const isReferenced = targetTypes.some((t) =>
            extraction.referencedTypeNames.has(t),
          );

          if (isReferenced && !seenTargets.has(targetPath)) {
            seenTargets.add(targetPath);
            edges.push({
              source: sourceRelPath,
              target: targetPath,
              specifier,
              type: "static",
            });
            matchedWildcardCount++;
          }
        }

        // If package is internal to repo, we don't treat it as external
        if (matchedWildcardCount > 0) {
          continue;
        }
      }
    }

    // Single type import: `import com.example.demo.service.UserService;`
    // (Also strip static member if static import: `import static com.example.Constants.MAX;`)
    let targetFqcn = specifier;
    if (imp.isStatic) {
      const lastDot = specifier.lastIndexOf(".");
      if (lastDot > 0) {
        targetFqcn = specifier.substring(0, lastDot);
      }
    }

    const resolvedFile = javaIndex.fqcnMap.get(targetFqcn);
    if (resolvedFile) {
      if (resolvedFile !== sourceRelPath && !seenTargets.has(resolvedFile)) {
        seenTargets.add(resolvedFile);
        edges.push({
          source: sourceRelPath,
          target: resolvedFile,
          specifier,
          type: "static",
        });
      }
      continue;
    }

    // If not found in internal FQCN map, check if it's external or unresolved
    const isKnownExternal = KNOWN_EXTERNAL_JAVA_PREFIXES.some((prefix) =>
      specifier.startsWith(prefix),
    );

    if (isKnownExternal) {
      externals.push({
        source: sourceRelPath,
        specifier,
        category: "library",
      });
      continue;
    }

    // Check if the specifier matches the repo's base packages
    const matchesBasePackage = javaIndex.basePackagePrefixes.some(
      (prefix) =>
        specifier.startsWith(prefix + ".") || specifier === prefix,
    );

    if (matchesBasePackage) {
      // It was intended for the repository package hierarchy, but the class does not exist!
      unresolved.push({
        source: sourceRelPath,
        specifier,
        reason: `Java class not found in repository: ${specifier}`,
      });
    } else {
      // Non-matching external 3rd-party library
      externals.push({
        source: sourceRelPath,
        specifier,
        category: "library",
      });
    }
  }

  // 2. Same-package implicit references in Java
  // In Java, sibling classes in the same package do not need import statements
  if (extraction.packageName) {
    const siblingFiles = javaIndex.packageMap.get(extraction.packageName) || [];
    for (const siblingPath of siblingFiles) {
      if (siblingPath === sourceRelPath || seenTargets.has(siblingPath)) {
        continue;
      }

      const siblingTypes = javaIndex.fileTypesMap.get(siblingPath) || [];
      const isReferenced = siblingTypes.some((t) =>
        extraction.referencedTypeNames.has(t),
      );

      if (isReferenced) {
        seenTargets.add(siblingPath);
        edges.push({
          source: sourceRelPath,
          target: siblingPath,
          specifier: siblingTypes[0] || path.basename(siblingPath, ".java"),
          type: "package-internal",
        });
      }
    }
  }

  return { edges, externals, unresolved };
}
