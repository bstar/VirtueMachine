# Nuvie Render Refactor Checklist

Date Started: 2026-02-11
Last Reconciled: 2026-02-12
Owner: VirtueMachine renderer slice
Scope: `modern/client-web` map/visibility/wall/object composition path

## Goal

Adopt a Nuvie-style rendering pipeline for blackout, boundary wall reshaping, and wall-adjacent object visibility while keeping a safe fallback path.

## Milestones

### M1: Pipeline Scaffolding (1-2 days)

- `[x]` Write refactor checklist and acceptance criteria.
- `[x]` Introduce explicit base-tile pipeline stages in code:
  - raw tile buffer
  - blackout buffer
  - boundary reshape stage
- `[x]` Add renderer mode feature gate (`current` vs `nuvie`) with persistent local storage key.
- `[x]` Add UI toggle to switch render mode at runtime.

Exit criteria:
- Runtime can switch between `current` and `nuvie` modes without reload.
- Default remains safe and reversible.

### M2: Boundary Reshape Parity Pass (2-4 days)

- `[x]` Implement Nuvie-style boundary corner substitutions against blacked neighbors.
- `[~]` Restrict reshaping to validated wall families and add guardrails to avoid over-cornering.
- `[x]` Add probe-level diagnostics for raw vs blacked vs reshaped tile IDs.

Exit criteria:
- No camera-driven wall morphing.
- Throne room + known wall transitions stop producing false corners.

### M3: Object Visibility Parity at Boundaries (2-3 days)

- `[x]` Implement wall-adjacent object suppression rule (right/bottom black checks) in Nuvie mode.
- `[ ]` Validate decor/wall objects around doors and room transitions.
- `[ ]` Keep interaction hit-testing and render composition aligned under this rule.

Exit criteria:
- Wall-mounted/boundary decor visibility matches expected legacy-like behavior in dark transitions.

### M4: Parity Harness and Acceptance (2-3 days)

- `[ ]` Extend hover/parity snapshot with mode + boundary decisions.
- `[ ]` Capture canonical screenshots for known trouble coordinates.
- `[ ]` Record accepted differences and remaining ambiguities in docs.
- `[ ]` Decide default mode flip (`current` -> `nuvie`) based on captured evidence.

Exit criteria:
- Acceptance checklist passes at canonical coordinates.
- Default mode can be flipped with rollback switch retained.

## Acceptance Coordinates (Initial Set)

- Throne room region: `307,347,0`, `311,360,0`, `312,368,0`, `312,369,0`
- Kitchen/courtyard transition: `303,360,0`
- Barracks reference doorway: `312,370,0`

## Notes

- This is a rendering pipeline refactor, not a sim-core migration.
- Multiplayer architecture remains out of scope for this checklist.
- Fallback path must remain available until M4 sign-off.
- Status update: wall parity work is intentionally paused and moved to deferred backlog while higher-priority gameplay slices continue.
- Startup/menu and cursor parity work progressed in parallel under R5/R6 and is tracked in `docs/progress.md`.
- `docs/progress.md` is the authoritative mutable priority board; this checklist remains the scoped tracker for the Nuvie wall/visibility refactor only.
