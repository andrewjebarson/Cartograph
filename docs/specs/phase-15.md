# Phase 15 — Architecture Rules & Boundary Enforcement

**Goal.** Define and visually enforce architectural boundaries (e.g., Clean Architecture, layered boundaries) to detect illegal cross-layer imports and prevent architectural erosion.

## Build

- **Boundary Rules Definition.** Visual rule builder in the UI (or optional `.cartograph/rules.json`) supporting constraints such as:
  - *Layer Isolation:* e.g. "Controllers cannot import Repositories directly (must go through Services)".
  - *Domain Protection:* e.g. "Domain/Entity models cannot import Web or UI layers".
  - *Module Encapsulation:* e.g. "Feature A cannot import internal private files of Feature B".
- **Visual Violation Overlay.** Offending edges render in prominent dashed crimson with a warning badge on the target node.
- **Rule Violations Drawer.** A dedicated inspector listing every detected boundary violation, showing the illegal import statement, line number, and rule broken.
- **Architecture Compliance Score.** A deterministic metric (% of compliant edges across all layer boundaries) showing codebase health.

## Constraints

- **Zero False Positives.** Violations are identified purely by AST import resolution matching specified path/role patterns.
- **No Style Grading.** This verifies explicit import boundaries defined by the user; it does not lecture or assign subjective code smell scores.
- **Persistence.** Configured rules are saved locally in SQLite per repository.

## Acceptance check

1. Open an analysis and navigate to "Architecture Rules".
2. Add a rule: "Controllers cannot import Repositories".
3. Any controller file directly importing a repository is immediately flagged, and the corresponding canvas edge turns crimson.
4. Clicking the violation in the drawer highlights the edge on the map and opens the exact import statement with line number.
5. Deleting or inverting the rule immediately recalculates the canvas without reloading the page.
