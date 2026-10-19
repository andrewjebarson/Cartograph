import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import type { SkippedFile } from "./types.ts";

export const DEFAULT_IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "target",
  ".gradle",
  "build",
  ".next",
  "out",
  ".idea",
  ".vscode",
  ".turbo",
  "coverage",
  ".nyc_output",
]);

export const SUPPORTED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".java",
  ".css",
  ".scss",
  ".html",
  ".json",
]);

export interface WalkedFile {
  relativePath: string;
  absolutePath: string;
  extension: string;
  lineCount: number;
  byteSize: number;
  contentHash: string;
  content: string;
}

export interface WalkResult {
  files: WalkedFile[];
  skippedFiles: SkippedFile[];
}

/**
 * Normalizes file path to use forward slashes.
 */
export function normalizePath(p: string): string {
  return p.replace(/\\/g, "/");
}

/**
 * Computes SHA-256 hash of a string content.
 */
export function computeHash(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Counts lines in string content.
 */
export function countLines(content: string): number {
  if (!content) return 0;
  let lines = 1;
  for (let i = 0; i < content.length; i++) {
    if (content.charCodeAt(i) === 10) {
      lines++;
    }
  }
  return lines;
}

/**
 * Recursively walks a repository directory, filtering ignored folders and returning supported code files.
 */
export function walkRepository(
  rootDir: string,
  ignoredDirs: Set<string> = DEFAULT_IGNORED_DIRS,
): WalkResult {
  const root = path.resolve(rootDir);
  const files: WalkedFile[] = [];
  const skippedFiles: SkippedFile[] = [];

  function walk(currentDir: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (err) {
      const relPath = normalizePath(path.relative(root, currentDir));
      skippedFiles.push({
        path: relPath || ".",
        reason: `Could not read directory: ${err instanceof Error ? err.message : String(err)}`,
      });
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (ignoredDirs.has(entry.name)) {
          continue;
        }
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        // Skip .d.ts declaration files
        if (entry.name.endsWith(".d.ts")) {
          continue;
        }

        if (!SUPPORTED_EXTENSIONS.has(ext)) {
          continue;
        }

        const relativePath = normalizePath(path.relative(root, fullPath));

        try {
          const content = fs.readFileSync(fullPath, "utf8");
          const byteSize = Buffer.byteLength(content, "utf8");
          const lineCount = countLines(content);
          const contentHash = computeHash(content);

          files.push({
            relativePath,
            absolutePath: fullPath,
            extension: ext,
            lineCount,
            byteSize,
            contentHash,
            content,
          });
        } catch (err) {
          skippedFiles.push({
            path: relativePath,
            reason: `Could not read file: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
      }
    }
  }

  walk(root);

  // Stable sort by path
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  return { files, skippedFiles };
}
