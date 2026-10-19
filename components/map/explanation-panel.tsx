"use client";

import React, { useState, useMemo } from "react";
import type { ParsedFile } from "../../lib/parser/types.ts";

export interface ExplanationTrace {
  cacheHit: boolean;
  modelCalls: number;
  durationMs: number;
}

export interface ExplanationData {
  text?: string;
  explanation?: string;
  targetPath: string;
  targetType: "file" | "folder";
  cached: boolean;
  model: string;
  provider: "gemini" | "ollama" | "mock";
  contentHash: string;
  durationMs: number;
  trace: ExplanationTrace;
}


interface ExplanationPanelProps {
  selectedId: string | null;
  files: ParsedFile[];
  currentExplanation: ExplanationData | null;
  isLoading: boolean;
  error?: string | null;
  onExplain: (targetPath: string, targetType: "file" | "folder", forceRefresh?: boolean) => void;
  onSelectFile: (filePath: string) => void;
}

export function ExplanationPanel({
  selectedId,
  files,
  currentExplanation,
  isLoading,
  error,
  onExplain,
  onSelectFile,
}: ExplanationPanelProps) {
  const [copied, setCopied] = useState(false);

  // Map relative path -> ParsedFile for rapid lookup
  const fileLookup = useMemo(() => {
    const map = new Map<string, ParsedFile>();
    for (const f of files) {
      map.set(f.path, f);
      const clean = f.path.replace(/^\.?\//, "");
      map.set(clean, f);
      map.set(`./${clean}`, f);
      // Also index by basename
      const base = f.path.split("/").pop();
      if (base) {
        if (!map.has(base)) map.set(base, f);
      }
    }
    return map;
  }, [files]);

  // Determine target info
  const selectedFile = useMemo(() => {
    if (!selectedId) return null;
    return files.find((f) => f.path === selectedId) || null;
  }, [selectedId, files]);

  const targetType = selectedFile ? "file" : "folder";
  const targetPath = selectedId || "";

  // Staleness detection
  const isStale = useMemo(() => {
    if (!selectedFile || !currentExplanation) return false;
    if (currentExplanation.targetType !== "file") return false;
    if (currentExplanation.targetPath !== selectedFile.path) return false;
    return Boolean(
      selectedFile.contentHash &&
        currentExplanation.contentHash &&
        selectedFile.contentHash !== currentExplanation.contentHash,
    );
  }, [selectedFile, currentExplanation]);

  const handleCopy = () => {
    const textToCopy = currentExplanation?.text || currentExplanation?.explanation || "";
    if (!textToCopy) return;
    navigator.clipboard?.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };


  // Helper to render markdown inline elements (bold, code, links)
  const renderInline = (text: string) => {
    // Regex splits text by **bold** or `code`
    const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

    return tokens.map((token, idx) => {
      if (!token) return null;

      // Bold: **text**
      if (token.startsWith("**") && token.endsWith("**") && token.length > 4) {
        return (
          <strong key={idx} className="font-semibold text-zinc-900 dark:text-zinc-100">
            {token.slice(2, -2)}
          </strong>
        );
      }

      // Inline code or file link: `text`
      if (token.startsWith("`") && token.endsWith("`") && token.length > 2) {
        const raw = token.slice(1, -1).trim();
        const clean = raw.replace(/^\.?\//, "");
        const matched = fileLookup.get(raw) || fileLookup.get(clean);

        if (matched) {
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectFile(matched.path)}
              className="inline-flex items-center gap-1 font-mono text-[11px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 underline decoration-amber-500/40 hover:decoration-amber-500 transition-colors mx-0.5 align-baseline cursor-pointer"
              title={`Click to focus ${matched.path} on canvas`}
            >
              <span className="text-[10px] opacity-75">📄</span>
              <span>{raw}</span>
            </button>
          );
        }

        return (
          <code
            key={idx}
            className="font-mono text-[11px] px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 mx-0.5"
          >
            {raw}
          </code>
        );
      }

      // Plain text: scan for words matching file paths/extensions
      const words = token.split(/(\s+)/);
      return (
        <span key={idx}>
          {words.map((word, wIdx) => {
            const stripped = word.replace(/^[('"`]|['"`),;.:]$/g, "");
            if (stripped.includes(".") || stripped.includes("/")) {
              const clean = stripped.replace(/^\.?\//, "");
              const matched = fileLookup.get(stripped) || fileLookup.get(clean);
              if (matched) {
                return (
                  <button
                    key={wIdx}
                    type="button"
                    onClick={() => onSelectFile(matched.path)}
                    className="inline-flex items-center gap-1 font-mono text-[11px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 underline decoration-amber-500/40 hover:decoration-amber-500 transition-colors mx-0.5 align-baseline cursor-pointer"
                    title={`Click to focus ${matched.path} on canvas`}
                  >
                    <span className="text-[10px] opacity-75">📄</span>
                    <span>{word}</span>
                  </button>
                );
              }
            }
            return <React.Fragment key={wIdx}>{word}</React.Fragment>;
          })}
        </span>
      );
    });
  };


  // Render markdown paragraphs and lists
  const renderMarkdown = (markdown?: string | null) => {
    if (!markdown) return null;
    const blocks = String(markdown).split(/\n\n+/);


    return blocks.map((block, bIdx) => {
      const trimmed = block.trim();
      if (!trimmed) return null;

      // Bullet List
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const items = trimmed
          .split("\n")
          .filter((line) => line.trim().startsWith("- ") || line.trim().startsWith("* "));

        return (
          <ul key={bIdx} className="space-y-1.5 my-2 pl-4 list-disc list-outside text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
            {items.map((item, iIdx) => {
              const cleanItem = item.replace(/^[-*]\s+/, "");
              return <li key={iIdx}>{renderInline(cleanItem)}</li>;
            })}
          </ul>
        );
      }

      // Headers (e.g. ### Header)
      if (trimmed.startsWith("#")) {
        const text = trimmed.replace(/^#+\s*/, "");
        return (
          <h4 key={bIdx} className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100 mt-3 mb-1">
            {renderInline(text)}
          </h4>
        );
      }

      // Standard Paragraph
      return (
        <p key={bIdx} className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 font-sans">
          {renderInline(trimmed)}
        </p>
      );
    });
  };

  if (!selectedId) {
    return (
      <div className="py-12 px-3 flex flex-col items-center text-center">
        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 mb-3">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </div>
        <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
          Select a Component to Explain
        </h3>
        <p className="text-[11px] text-zinc-400 mt-1.5 max-w-xs leading-relaxed">
          Click any file or directory folder card on the map to generate or view its contextual AI explanation.
        </p>
        <div className="mt-4 p-2.5 rounded bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-[10px] font-mono text-zinc-400 text-left w-full space-y-1">
          <div>• Zero-cost execution with local Ollama or Gemini free tier.</div>
          <div>• Strict SHA-256 caching: repeat reads cost 0 model calls.</div>
          <div>• Real AST neighbors ground every explanation.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Target Title & Role Pill */}
      <div className="flex items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-semibold text-zinc-400 font-mono">
              {targetType === "file" ? "File Explanation" : "Directory Module"}
            </span>
            {selectedFile?.role && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-semibold">
                {selectedFile.role}
              </span>
            )}
          </div>
          <div className="text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100 truncate mt-0.5" title={targetPath}>
            {targetPath}
          </div>
        </div>

        {/* Generate / Cache-Check / Refresh Buttons */}
        <div className="shrink-0 flex items-center gap-1">
          <button
            onClick={() => onExplain(targetPath, targetType, false)}
            disabled={isLoading}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-medium rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 hover:border-amber-500 dark:hover:bg-amber-500 dark:hover:text-zinc-950 dark:hover:border-amber-500 transition-colors disabled:opacity-50 cursor-pointer"
            title="Explain component (cached by default)"
          >
            {isLoading ? (
              <span className="animate-spin text-xs">⟳</span>
            ) : currentExplanation ? (
              <span>⚡ Explain</span>
            ) : (
              <span>✦ Explain</span>
            )}
          </button>
          {currentExplanation && (
            <button
              onClick={() => onExplain(targetPath, targetType, true)}
              disabled={isLoading}
              className="p-1 text-xs font-mono rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-400 transition-colors disabled:opacity-50 cursor-pointer"
              title="Force regenerate (bypass cache and call model)"
            >
              ⟳
            </button>
          )}
        </div>

      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="py-8 px-2 flex flex-col items-center text-center space-y-2">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono text-zinc-500">
            Generating contextual explanation...
          </p>
          <span className="text-[10px] font-mono text-zinc-400">
            Tracing AST imports &amp; verifying real neighbors
          </span>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400 text-xs font-mono space-y-1">
          <div className="font-semibold flex items-center gap-1">
            <span>⚠ Error</span>
          </div>
          <p className="text-[11px] leading-relaxed break-words">{error}</p>
          <div className="pt-2 text-[10px] text-zinc-500 dark:text-zinc-400 border-t border-red-500/20">
            Check your <code className="bg-red-500/20 px-1 py-0.5 rounded">.env.local</code> for <code className="bg-red-500/20 px-1 py-0.5 rounded">GEMINI_API_KEY</code> or verify that Ollama is running.
          </div>
        </div>
      )}

      {/* Staleness Detection Alert */}
      {isStale && !isLoading && (
        <div className="p-2.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs font-mono flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="shrink-0 text-sm">⚠</span>
            <span className="text-[11px] truncate">
              Content modified since explanation was generated.
            </span>
          </div>
          <button
            onClick={() => onExplain(targetPath, targetType, true)}
            className="shrink-0 px-2 py-0.5 rounded bg-amber-500 text-zinc-950 font-bold text-[10px] hover:bg-amber-400 transition-colors"
          >
            Update
          </button>
        </div>
      )}

      {/* Rendered Explanation Body */}
      {currentExplanation && !isLoading && (
        <div className="space-y-3">
          {/* Trace Badge & Verification Pill */}
          <div className="flex items-center justify-between text-[10px] font-mono border-b border-zinc-100 dark:border-zinc-800 pb-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {currentExplanation.cached ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                  <span>⚡</span>
                  <span>Cache Hit (0 calls)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium">
                  <span>✦</span>
                  <span>{currentExplanation.provider.toUpperCase()} (1 call)</span>
                </span>
              )}
              <span className="text-zinc-400">
                {currentExplanation.durationMs}ms
              </span>
              <span className="text-zinc-500 truncate max-w-[110px]" title={currentExplanation.model}>
                · {currentExplanation.model}
              </span>
            </div>

            <button
              onClick={handleCopy}
              className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors shrink-0"
              title="Copy explanation text"
            >
              {copied ? "✓ Copied" : "copy"}
            </button>
          </div>

          {/* Explanation Text */}
          <div className="space-y-2.5">
            {renderMarkdown(currentExplanation.text || currentExplanation.explanation)}
          </div>

        </div>
      )}

      {/* Empty State when node selected but not yet explained */}
      {!currentExplanation && !isLoading && !error && (
        <div className="py-6 px-2 flex flex-col items-center text-center space-y-2">
          <p className="text-xs text-zinc-500 font-mono">
            No explanation cached for this {targetType}.
          </p>
          <button
            onClick={() => onExplain(targetPath, targetType, false)}
            className="px-3 py-1.5 text-xs font-mono font-semibold rounded bg-amber-500 text-zinc-950 hover:bg-amber-400 transition-colors shadow-sm"
          >
            ✦ Generate Explanation
          </button>
        </div>
      )}
    </div>
  );
}
