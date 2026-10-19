# Phase 17 — Dependency Path Finder (A-to-B Tracing)

**Goal.** Trace and visually isolate the exact chain of imports connecting any two files in the codebase, answering "How does File A depend on File B and why?".

## Build

- **Source & Target Selector.** Right-click or panel button to select "Trace from here" (File A) and "Trace to here" (File B).
- **Shortest & Alternative Path Finding.** Bidirectional graph traversal (BFS/Dijkstra) finding the shortest import route and any secondary bridge paths between the two files.
- **Canvas Path Isolation.**
  - All nodes and edges outside the path dim to 5% opacity.
  - Path nodes and intermediate folders highlight with illuminated borders.
  - Connecting edges pulse with animated directional arrows.
- **Hop-by-Hop Breadcrumb Inspector.**
  - Right pane lists the ordered dependency sequence: `File A → Service B → Repository C → File D`.
  - Displays the exact `import` statement and imported symbol for each hop in the chain.
- **Bridge Bottleneck Detection.** Identifies single-point-of-failure files (chokepoints) that serve as the sole bridge between two subsystems.
- **Explain Connection.** One-click contextual explanation summarizing why this dependency chain exists based on parsed AST facts.

## Constraints

- **Strict AST Lineage.** Every hop in the path must be a verified, real AST import. If no path exists, report "Disconnected: No import path exists between these files" with 0 hallucination.
- **Pure Function Algorithm.** Path search is a pure function operating over the graph edge list with zero side effects.
- **Instant Response.** Path calculation must complete in under 50ms for graphs with up to 2,000 nodes.

## Acceptance check

1. Select a controller and click "Trace from here".
2. Select a distant database entity or service and click "Trace to here".
3. The canvas dims all unrelated files, isolating only the files and folders forming the bridge.
4. The right pane shows the sequential hop list: `A → B → C → D` with the exact imported symbols for each step.
5. Select two completely independent files with no shared imports: the UI states "No dependency path found".
6. Click "Explain Connection": AI explains the architectural reason for the dependency chain in 2-3 sentences.
