# Phase 14 — Git Diff & Pull Request Blast Radius

**Goal.** Visually compare two Git branches/commits or analyze pull request diffs to highlight changed files and trace their exact downstream blast radius across routes and controllers.

## Build

- **Git Diff Comparison.** Analyze differences between two Git refs (e.g. `main..feature-branch` or `HEAD~1..HEAD`).
- **Visual Diff Highlighting.**
  - Added files indicated with distinct green borders and badges.
  - Modified files indicated with amber borders and diff count tags (`+12/-4`).
  - Removed files indicated with struck-through dashed nodes.
- **Transitive Impact Highlighting.** One-click "Show Impact" mode that dims all unaffected parts of the codebase and highlights every file and route that transitively depends on modified code.
- **Impact Summary Panel.** Displays the total impact tally: changed files, affected internal dependencies, and vulnerable external API endpoints.
- **Exportable Review Report.** Generates a clean markdown summary of affected components for pasting directly into pull request reviews.

## Constraints

- **Strict AST Verification.** Changed edges are computed solely from actual AST import shifts between git trees, never guessed from commit messages or file diff hunks.
- **Performance.** Diff calculation and graph recalculation must complete in under 1 second for graphs up to 1,000 files.
- **Zero Hallucination.** If an import was modified to an unresolvable path, flag it explicitly as an unresolved import in the diff view.

## Acceptance check

1. Open an analysis and select "Compare with Git Ref" (e.g. `main`).
2. Modified files highlight in amber, while newly created files appear in green.
3. Click "Show Impact" on a modified service: all unrelated nodes fade to low opacity, and the full dependency chain leading to public routes lights up.
4. The right pane displays the exact list of routes that require regression testing due to the change.
5. Click "Copy Review Summary" to copy the generated markdown table of impacted endpoints.
