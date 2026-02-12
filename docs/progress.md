# Project Progress Checklist

Last Updated: 2026-02-12

## Milestone Status

- `[x]` M0: Documentation Foundation
- `[x]` M1: Deterministic Runtime Skeleton
- `[~]` M2: World State and Persistence Slice
- `[x]` M3: Playable Single-Player Vertical Slice
- `[~]` M4: Gameplay Parity Expansion
- `[ ]` M5: Multiplayer Prototype

Legend:

- `[x]` complete
- `[~]` in progress
- `[ ]` not started

## Planning Flexibility

This checklist is intentionally mutable.

- Add, remove, split, merge, or reorder tasks when new technical evidence appears.
- Prefer momentum and shipped slice outcomes over strict adherence to prior ordering.
- If a task blocks progress, either reduce scope or defer it and continue on an adjacent slice.
- Record material priority/scope changes in this file so reasoning is preserved.

## Completed (Backfilled)

- `[x]` Established modern repo with legacy submodule provenance and policy guardrails (`e30639d`)
- `[x]` Added pinned-legacy workflow and local asset sync tooling (`f8f6b3f`)
- `[x]` Added Nix flake dev shell for reproducible toolchain (`cd72e63`)
- `[x]` Documented sandbox escalation workflow and assistant policy (`5bdc9d6`)
- `[x]` Implemented deterministic `sim-core` bootstrap with replay hash test (`9ea6f61`)
- `[x]` Ported initial `D_2C4A`-mapped world state into `sim-core` with serialization/hash invariants tests (`0ac9cbe`)
- `[x]` Added live project checklist/status board (`875be3a`)
- `[x]` Added legacy `objlist` compatibility boundary + tests (`2af67ea`)
- `[x]` Added one-command test runner + CI build/test workflow (`4919a2b`)

## 90-Day Plan (Status-Reconciled)

### M2 Foundations

- `[x]` Map/chunk read compatibility (read-only)
- `[x]` Deterministic time/calendar semantics
- `[x]` Persistence API hardening
- `[~]` Shared authority boundary cleanup:
  - remove duplicated client-side decode/logic where sim-core should own it
  - keep deterministic replay/checkpoint behavior stable during migration

### M3 Vertical Slice

- `[x]` Command pipeline + core loop integration
- `[x]` Minimal web client scaffolding
- `[x]` Runtime asset validation + fallback diagnostics
- `[x]` Playable deterministic walkaround demo

### M4 Gameplay Parity Expansion

- `[x]` Static object layer from legacy save data (`objblk`, `objlist`)
- `[x]` Animated tiles (water/fire/wheels) with deterministic phase control
- `[x]` Interaction baseline (avatar mode, door toggle, collision behavior)
- `[x]` NPC render + deterministic movement pilot + occlusion guards
- `[~]` Rendering parity hardening:
  - keep `current` and `nuvie` feature-gated paths
  - retain deferred wall/corner blackout hardening slice

### M5 Multiplayer

- `[x]` Network-neutral command envelope groundwork
- `[x]` Peer checkpoint hash comparison utility
- `[ ]` Live synchronized multiplayer prototype

## Rendering Parity Track

### R1: Static Layer Content

- `[x]` Read and render static world object layer
- `[x]` Deterministic ordering rules and debug telemetry
- `[~]` Canonical parity capture set:
  - web captures are present
  - legacy-reference side-by-side set still incomplete

### R2: Occlusion and Boundary Composition

- `[x]` Composition/overlay model unification for render + interaction probes
- `[x]` Fixture-based regression tests for composition semantics
- `[~]` Nuvie boundary reshape refactor:
  - scaffolded and feature-gated
  - final acceptance and default-mode decision pending

### R3: Interactive Visual State Determinism

- `[x]` World-state-backed door/open-state visuals
- `[ ]` Replay/hash fixture coverage explicitly validating interaction visual transitions

### R4: Tooling and CI Hardening

- `[ ]` Map-sweep validator for unknown/missing sprite coverage
- `[ ]` CI artifact publishing for parity screenshot/diff reports
- `[ ]` Accepted parity-gap ledger for unresolved legacy ambiguities

### R5: Startup/Menu Recreation

- `[x]` In-engine startup/title flow with journey path into throne room
- `[x]` Keyboard + mouse menu navigation with disabled-option feedback
- `[x]` Startup/title provenance documented against decompiled + ScummVM/Nuvie references
- `[x]` Real `titles.shp` + `mainmenu.shp` decode/render path (palette-highlight behavior)
- `[x]` `Q` return-to-title behavior during gameplay
- `[ ]` Pixel-parity screenshot pair (legacy reference vs current startup/menu frame)

### R6: Legacy Cursor Parity

- `[x]` Decode `u6mcga.ptr` via U6 LZW + libN item parsing path
- `[x]` Engine-rendered custom cursor across title and in-session views
- `[x]` Layer-aware cursor composition (world area vs menu/frame area)
- `[x]` Cursor scaling/aspect tuned for current legacy-frame presentation
- `[~]` Final pointer index/mode mapping:
  - visually correct pointer now selected
  - command/mode-specific cursor switching parity still pending

## Current Sprint Focus

- `[x]` Complete startup/menu art parity implementation pass
- `[x]` Complete in-engine legacy cursor integration pass
- `[~]` Continue render parity stabilization with feature-gated `nuvie` path
- `[ ]` Add deterministic tests for interaction visual-state transitions (R3)
- `[ ]` Capture and archive startup/menu parity screenshot pair (R5)

## Known Blockers / Risks

- `[~]` Full canonical title-menu ownership is split across assets/executable paths not entirely represented in released decompiled C source.
- `[~]` Wall/corner/contextual blackout parity remains intentionally deferred to a dedicated hardening pass.
- `[~]` Browser renderer still owns logic that should ultimately be centralized in sim-core authority boundaries.
- `[ ]` Multiplayer remains deferred until rendering/interactions reach stable parity confidence.

## Deferred Backlog (Intentional Pause)

- `[ ]` Wall rendering parity hardening:
  - doorway threshold floor precedence edge cases
  - contextual wall variant/corner selection in adjacent rooms
  - wall-adjacent decor suppression in blacked-out rooms
  - canonical capture/compare evidence set before default mode flip

## Next Immediate Task

Complete R5/R3 closure set:

1. Capture startup/title parity screenshots against legacy references.
2. Add deterministic interaction visual-state replay fixtures (doors/open states).
3. Record any accepted startup/cursor parity gaps and lock default cursor mapping policy.
