/**
 * Deterministic Invented-Path Evaluator (Phase 11)
 *
 * Strict set-membership check:
 * Extracts path-shaped tokens from an AI-generated explanation and tests
 * each token against the exact universe of paths the model was shown.
 * Any project path not in that universe was invented (hallucinated).
 *
 * Guaranteed deterministic code: no model grading a model.
 */

export interface PathCheckResult {
  totalPaths: number;
  validPaths: string[];
  inventedPaths: string[];
  score: number; // 0.0 to 1.0 (1.0 = 100% path accuracy, 0 invented)
  passed: boolean;
}

// Common file extensions in analyzed projects
const FILE_EXTENSIONS = new Set([
  "ts", "tsx", "js", "jsx", "mjs", "cjs",
  "java", "class",
  "html", "htm", "css", "scss",
  "json", "yaml", "yml", "xml", "sql",
  "py", "go", "rb", "rs", "php", "c", "cpp", "h",
]);

// Known external packages, frameworks, or protocol prefixes that are not project paths
const EXTERNAL_OR_GENERIC = new Set([
  "react", "react-dom", "next", "next/server", "next/navigation", "next/headers", "next/cache",
  "node:fs", "node:path", "node:crypto", "node:sqlite", "node:os",
  "express", "dagre", "ts-morph", "@xyflow/react", "@angular/core", "@angular/common",
  "@angular/router", "rxjs", "rxjs/operators", "org.springframework", "java.util",
  "http", "https", "localhost",
]);

function normalizePath(p: string): string {
  return p
    .replace(/\\/g, "/")
    .replace(/^\.?\//, "")
    .trim();
}

/**
 * Extracts candidate path-shaped tokens from prose text.
 */
export function extractPathTokens(text: string): string[] {
  if (!text) return [];

  const tokens = new Set<string>();

  // 1. Tokens inside backticks: `path/to/file.ext`
  const backtickMatches = text.match(/`([^`]+)`/g) || [];
  for (const match of backtickMatches) {
    const raw = match.slice(1, -1).trim();
    if (isCandidatePath(raw)) {
      tokens.add(cleanToken(raw));
    }
  }

  // 2. Scan whitespace-separated words for path-like strings
  const words = text.split(/\s+/);
  for (const word of words) {
    // Strip backticks if any remained
    const raw = cleanToken(word);
    if (isCandidatePath(raw)) {
      tokens.add(raw);
    }
  }

  return Array.from(tokens);
}

function cleanToken(token: string): string {
  return token
    .replace(/^[(`'"]+/, "")
    .replace(/[)`'",;:.!?]+$/, "")
    .trim();
}

function isCandidatePath(token: string): boolean {
  if (!token || token.length < 3) return false;
  if (token.startsWith("http://") || token.startsWith("https://")) return false;

  const cleaned = cleanToken(token);
  if (EXTERNAL_OR_GENERIC.has(cleaned.toLowerCase())) return false;

  // Must have directory separator or recognized extension
  const hasSlash = cleaned.includes("/");
  const dotIdx = cleaned.lastIndexOf(".");
  const ext = dotIdx > 0 ? cleaned.slice(dotIdx + 1).toLowerCase() : "";
  const hasValidExt = Boolean(ext && FILE_EXTENSIONS.has(ext));

  // Must not be a method invocation like `getHeroes()` or type parameter like `Observable<Hero[]>`
  if (cleaned.includes("(") || cleaned.includes(")") || cleaned.includes("<") || cleaned.includes(">")) {
    return false;
  }

  return hasSlash || hasValidExt;
}

/**
 * Evaluates whether every path mentioned in the explanation was in the allowed universe.
 *
 * @param explanation The AI explanation prose
 * @param allowedPaths Exact list of paths shown in the prompt (target file, imports, importedBy)
 */
export function checkInventedPaths(
  explanation: string,
  allowedPaths: string[],
): PathCheckResult {
  if (!explanation) {
    return {
      totalPaths: 0,
      validPaths: [],
      inventedPaths: [],
      score: 1.0,
      passed: true,
    };
  }

  // Build normalized lookup set for the allowed paths
  const allowedSet = new Set<string>();
  const allowedBasenames = new Set<string>();

  for (const p of allowedPaths) {
    if (!p) continue;
    const norm = normalizePath(p);
    allowedSet.add(norm);
    allowedSet.add(`./${norm}`);
    allowedSet.add(`/${norm}`);

    const base = norm.split("/").pop();
    if (base) {
      allowedBasenames.add(base);
      allowedSet.add(base);
      // Also allow without extension if file had one
      const dot = base.lastIndexOf(".");
      if (dot > 0) {
        allowedSet.add(base.slice(0, dot));
      }
    }
  }

  const extracted = extractPathTokens(explanation);
  const validPaths: string[] = [];
  const inventedPaths: string[] = [];

  for (const token of extracted) {
    const normToken = normalizePath(token);
    const tokenBase = normToken.split("/").pop() || normToken;

    // Check exact match, normalized match, or basename match
    if (
      allowedSet.has(token) ||
      allowedSet.has(normToken) ||
      allowedBasenames.has(tokenBase) ||
      EXTERNAL_OR_GENERIC.has(normToken.toLowerCase()) ||
      EXTERNAL_OR_GENERIC.has(tokenBase.toLowerCase())
    ) {
      validPaths.push(token);
    } else {
      inventedPaths.push(token);
    }
  }

  const total = extracted.length;
  const score = total === 0 ? 1.0 : Math.round((validPaths.length / total) * 100) / 100;
  const passed = inventedPaths.length === 0;

  return {
    totalPaths: total,
    validPaths,
    inventedPaths,
    score,
    passed,
  };
}
