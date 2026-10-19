# Phase 3 — The dual-engine parser (TypeScript & Java)

**Goal.** Turn a repository on disk into a list of files and the real
connections between them for both **TypeScript/Angular** and **Java/Spring Boot**,
and prove it is correct.

## Build

- **Filesystem Walker.** Walks a directory, filters ignored folders (`node_modules`,
  `.git`, `dist`, `target`, `.gradle`, `build`), hashes contents, and counts lines.
- **TypeScript & Angular Parser Engine.** Reads imports, re-exports, and dynamic
  imports using a real TypeScript parser (`ts-morph`). Resolves path aliases
  (`@/*`, `tsconfig.json` paths) and relative paths.
- **Java & Spring Boot Parser Engine.** Reads Java syntax (`.java`), package
  declarations (`package com.example...`), and imports (`import com.example...`).
  Resolves internal package paths to files on disk.
- **Metrics Computation.** Fan-in (how many files import this) and fan-out (how
  many files this imports), calculated over the deduplicated edge list.
- **Coverage & Reporting.** For every import seen: resolves inside the repo,
  identifies external library/framework imports, or flags unresolved imports with
  a clear reason.
- **Standalone CLI runner.** Runnable via terminal script (`npm run parse <dir>`)
  outputting typed JSON without requiring Next.js or the database to be running.

## Constraints

- **Pure Functions.** The parser imports no Next.js, no React, and no database client.
  Path in, data out.
- **No Guessed Edges.** An edge exists only when an import resolves to a real file.
  External packages (e.g. `@angular/core`, `org.springframework.boot`) are tracked
  as external coverage, not invented nodes.
- **Zero Framework Logic in Core Parser.** Framework-specific concepts (like
  Angular components or Spring annotations) belong in Phase 8 adapters.

## Acceptance check

1. Run the parser against a TypeScript/Angular sample repo: files found, imports
   resolved, and coverage stats printed to terminal.
2. Run the parser against a Java/Spring Boot sample repo: `.java` packages and
   internal imports resolve cleanly into nodes and edges.
3. Test unresolved edge handling: intentionally alter an import path, verify it
   is reported as unresolved with an explicit reason.
4. Output verified as valid JSON matching the shared data contract.
