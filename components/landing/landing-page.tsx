"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  VerifiedImportsIllustration,
  FoldingHierarchyIllustration,
  FrameworkAdaptersIllustration,
} from "./landing-illustrations";

interface LandingPageProps {
  isAuthenticated?: boolean;
}

export function LandingPage({
  isAuthenticated = false,
}: LandingPageProps) {
  const [repoUrl, setRepoUrl] = useState("");
  const router = useRouter();

  const handleHeroSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = repoUrl.trim();
    if (!trimmed) return;

    if (isAuthenticated) {
      // If already signed in, go directly to workspace with auto-submission
      router.push(`/?repo=${encodeURIComponent(trimmed)}`);
    } else {
      // If signed out, route to login carrying the repo parameter
      router.push(`/login?repo=${encodeURIComponent(trimmed)}`);
    }
  };

  return (
    <div className="w-full bg-background text-fg flex flex-col selection:bg-accent/20">

      {/* Main Container Capped at 1140px */}
      <main className="w-full max-w-[1140px] mx-auto px-6 flex-1 flex flex-col">
        {/* HERO SECTION */}
        <section className="py-20 md:py-32 flex flex-col justify-center min-h-[75vh]">
          <div className="max-w-2xl">
            <h1 className="font-mono text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-fg leading-[1.08] text-balance">
              Real codebases, parsed into maps.
            </h1>
            <p className="mt-5 font-sans text-sm md:text-base text-fg-muted leading-relaxed max-w-[64ch]">
              Cartograph reads a repository from disk and draws it as an exact
              dependency map. Everything on screen comes from parsing real AST
              imports. The AI explains what the parser found; it never decides
              what is there.
            </p>

            {/* Live Repository URL Hero Form */}
            <form onSubmit={handleHeroSubmit} className="mt-8 flex flex-col sm:flex-row gap-2 max-w-xl">
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repository"
                className="flex-1 rounded border border-line bg-surface px-3 py-2 font-mono text-xs text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <button
                type="submit"
                className="h-9 rounded bg-accent px-4 font-mono text-xs font-medium text-accent-fg transition-opacity hover:opacity-90 whitespace-nowrap shrink-0"
              >
                Analyze Repository →
              </button>
            </form>

            <div className="mt-3 flex items-center gap-3 font-mono text-[11px] text-fg-muted">
              <span>Try with:</span>
              <button
                type="button"
                onClick={() => setRepoUrl("https://github.com/angular/components")}
                className="hover:text-accent underline transition-colors"
              >
                angular/components
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setRepoUrl("https://github.com/spring-projects/spring-petclinic")}
                className="hover:text-accent underline transition-colors"
              >
                spring-petclinic
              </button>
            </div>
          </div>
        </section>

        {/* SECTION 1: WHAT IT DOES */}
        <section className="border-t border-line py-20 md:py-28">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-12 md:gap-20">
            <div className="max-w-[46ch]">
              <span className="font-mono text-xs font-semibold text-accent uppercase tracking-wider">
                01 / Verification
              </span>
              <h2 className="mt-2 font-mono text-2xl md:text-3xl font-bold tracking-tight text-fg leading-[1.1]">
                Every edge is a verified import.
              </h2>
              <p className="mt-4 text-sm text-fg-muted leading-relaxed">
                No assumed connections. No fuzzy hallucinations. An edge exists
                because ts-morph or tree-sitter resolved a concrete import
                statement to a real file on disk. Unresolved imports are reported
                with exact line numbers and reasons, never smoothed over.
              </p>
            </div>
            <div className="w-full md:w-auto shrink-0 flex justify-center">
              <VerifiedImportsIllustration />
            </div>
          </div>
        </section>

        {/* SECTION 2: HOW IT WORKS */}
        <section className="border-t border-line py-20 md:py-28">
          <div className="flex flex-col md:flex-row-reverse items-start md:items-center justify-between gap-12 md:gap-20">
            <div className="max-w-[46ch]">
              <span className="font-mono text-xs font-semibold text-accent uppercase tracking-wider">
                02 / Topology
              </span>
              <h2 className="mt-2 font-mono text-2xl md:text-3xl font-bold tracking-tight text-fg leading-[1.1]">
                Folding hierarchies into readable boxes.
              </h2>
              <p className="mt-4 text-sm text-fg-muted leading-relaxed">
                Large codebases collapse into bounded clusters solved
                deterministically by directory depth and fan-in weight. Click to
                inspect direct imports, or compute an instant 2-hop transitive walk
                to preview blast radius before touching shared code.
              </p>
            </div>
            <div className="w-full md:w-auto shrink-0 flex justify-center">
              <FoldingHierarchyIllustration />
            </div>
          </div>
        </section>

        {/* SECTION 3: FRAMEWORKS UNDERSTOOD */}
        <section className="border-t border-line py-20 md:py-28">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-12 md:gap-20">
            <div className="max-w-[46ch]">
              <span className="font-mono text-xs font-semibold text-accent uppercase tracking-wider">
                03 / Adapters
              </span>
              <h2 className="mt-2 font-mono text-2xl md:text-3xl font-bold tracking-tight text-fg leading-[1.1]">
                Adapters, not branches.
              </h2>
              <p className="mt-4 text-sm text-fg-muted leading-relaxed">
                Framework knowledge lives in isolated AST adapters rather than
                conditional checks inside parser logic. Currently understands
                Angular (TypeScript), Next.js / React (TypeScript & JavaScript),
                and Spring Boot (Java), extracting route tables and dependency
                injection bindings.
              </p>
            </div>
            <div className="w-full md:w-auto shrink-0 flex justify-center">
              <FrameworkAdaptersIllustration />
            </div>
          </div>
        </section>

        {/* SECTION 4: WHAT IT DELIBERATELY DOESN'T DO */}
        <section className="border-t border-line py-20 md:py-28">
          <div className="max-w-[64ch]">
            <span className="font-mono text-xs font-semibold text-fg-muted uppercase tracking-wider">
              04 / Non-Goals
            </span>
            <h2 className="mt-2 font-mono text-2xl md:text-3xl font-bold tracking-tight text-fg leading-[1.1]">
              What Cartograph deliberately does not do.
            </h2>
            <p className="mt-4 text-sm text-fg-muted leading-relaxed">
              This explains a codebase; it does not review or grade one. The
              software is built on hard boundaries:
            </p>

            <div className="mt-8 space-y-6 border-l border-line pl-5 font-mono text-xs">
              <div>
                <h3 className="font-semibold text-fg">No code quality scores</h3>
                <p className="mt-1 text-fg-muted leading-relaxed">
                  No ratings, severity levels, or &quot;issues found&quot;. We never grade
                  an engineer&apos;s code or tell someone their architecture is bad.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-fg">No guessed edges</h3>
                <p className="mt-1 text-fg-muted leading-relaxed">
                  If an import cannot be resolved, we count it as unresolved and
                  report the missing target. We never invent a link to make a graph
                  look neat.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-fg">No test replacement</h3>
                <p className="mt-1 text-fg-muted leading-relaxed">
                  Static AST topology shows how files connect, not runtime test
                  assertions or execution traces.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-fg">No proprietary SaaS lock-in</h3>
                <p className="mt-1 text-fg-muted leading-relaxed">
                  Runs locally with SQLite. Local Ollama or Gemini Free Tier.
                  Nothing leaves your machine unless you configure it to.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-line py-6 text-center font-mono text-xs text-fg-muted">
        <div className="max-w-[1140px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>cartograph / local</span>
          <span>deterministic repository mapping</span>
        </div>
      </footer>
    </div>
  );
}
