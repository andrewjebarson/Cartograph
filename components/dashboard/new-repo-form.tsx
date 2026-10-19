"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export function NewRepoForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to analyze repository");
        setIsSubmitting(false);
        return;
      }

      // Navigate to the analysis page (new or existing)
      if (data.analysisId) {
        router.push(`/analysis/${data.analysisId}`);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Network error");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            placeholder="GitHub repository URL or owner/repo (e.g. spring-projects/spring-petclinic)"
            className="w-full h-9 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
            disabled={isSubmitting}
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting || !url.trim()}
          className="h-9 px-4 rounded-md bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-mono text-xs font-semibold transition-colors shrink-0 flex items-center justify-center gap-1.5"
        >
          {isSubmitting ? (
            <>
              <span className="w-3 h-3 rounded-full border-2 border-zinc-950 border-t-transparent animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <span>Analyze Repository</span>
          )}
        </button>
      </form>

      {errorMessage && (
        <p className="text-[11px] font-mono text-red-500 mt-1.5 px-1">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
