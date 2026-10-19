# Phase 18 — Architectural Refactoring Simulator

**Goal.** Interactively simulate architectural changes directly on the dependency graph before modifying source code (e.g. splitting god-classes, extracting shared packages, or inverting dependencies).

## Build

- **Simulation Mode Sandbox.** Enter a non-destructive simulation state without altering original database or filesystem records.
- **Refactoring Operations.**
  - *Move / Reassign:* Move a file or group of files into an existing or new folder.
  - *Extract Package / Service:* Group selected nodes into a proposed standalone module.
  - *Reroute Edge:* Reassign dependencies to pass through an interface or service layer.
- **Instant Impact Delta.** Real-time calculation showing:
  - Delta in circular dependencies (e.g., `-2 cycles resolved`).
  - Delta in fan-in and fan-out metrics.
  - Impacted routes and blast radius changes.
- **Before vs After Visual Comparison.** Toggle between the baseline graph and the simulated graph.
- **Migration Plan Export.** Generates a step-by-step checklist of file moves and import edits needed to realize the simulated architecture in code.

## Constraints

- **In-Memory Only.** The simulation never writes changes to the target repository or SQLite database.
- **Deterministic Math.** All graph metric deltas are calculated using the existing pure graph algorithms.
- **Clear Sandbox Indicator.** Persistent amber banner indicating "Refactoring Simulation Active" with one-click "Discard Changes".

## Acceptance check

1. Open an analysis and click "Simulate Refactor".
2. Drag a repository file out of a controller into a new service folder.
3. The canvas immediately updates edge lines, and a delta badge shows "Cycles: 0 (was 2)".
4. Toggle "Compare Baseline": flips smoothly between the original and simulated topologies.
5. Click "Export Migration Plan" to generate a clear list of target file paths and import refactor instructions.
6. Click "Exit Simulator": restores the exact original graph state without side effects.
