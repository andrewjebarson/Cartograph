# Phase 16 — Monorepo & Workspace Mapping

**Goal.** Map multi-package workspaces (Turborepo, Nx, pnpm workspaces, and Maven multi-module) with clear package boundary hulls, shared package isolation, and inter-package edge filtering.

## Build

- **Automatic Monorepo Detection.** Detect workspace roots (`pnpm-workspace.yaml`, `lerna.json`, `nx.json`, parent `pom.xml`, or root `package.json` with `workspaces`).
- **Package Hull Clustering.** Group files into distinct visual package containers on the canvas with clear package labels and version tags.
- **Inter-Package vs Intra-Package Edge Toggle.**
  - *Full View:* Shows all internal and external dependencies.
  - *Cross-Package Only:* Hides all intra-package noise to reveal only the core contract and dependency graph connecting the packages.
- **Package Coupling Metrics.** Show incoming and outgoing package dependencies, identifying bottleneck packages and unwanted cyclical package dependencies.

## Constraints

- **Independent Resolution Contexts.** Each package resolves relative imports and path aliases according to its own configuration or root workspace symlinks.
- **Clutter Prevention.** Monorepos with 10+ packages default to collapsed package nodes on initial render to preserve canvas responsiveness.
- **Pure Function Layout.** Graph calculations remain pure functions receiving package-annotated node lists.

## Acceptance check

1. Submit a monorepo URL (e.g. a Turborepo or Maven multi-module project).
2. The pipeline detects monorepo structure and displays distinct package clusters.
3. Switch to "Cross-Package Only": all intra-package edges vanish, leaving only high-level inter-package connections.
4. Circular dependencies between packages (if any) are highlighted distinctly from internal file-level cycles.
5. Expanding a package reveals its internal folders and files without disturbing the global layout of neighboring packages.
