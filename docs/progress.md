# Project Progress Checklist

Last Updated: 2026-02-14

## Milestone Status

- `[x]` M0: Documentation Foundation
- `[x]` M1: Deterministic Runtime Skeleton
- `[~]` M2: World State and Persistence Slice
- `[~]` M3: Playable Single-Player Vertical Slice (navigation-only)
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
- `[x]` Built markdown-powered architecture wiki web UI with reference atlas, theme sync, and code-overlay links (`8e0e031`)
- `[x]` Added API/UI realtime synchronization architecture chapter with generated topology/sequence diagrams (`7244757`)
- `[x]` Added dedicated render pipeline flow diagram in rendering deep-dive docs (`7244757`)
- `[x]` Added OpenAPI-style human-readable endpoint reference for the net server (`7244757`)

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
- `[~]` Object interaction system parity (container/world/use flows)
- `[~]` Inventory/equipment UX and item transfer rules parity
- `[ ]` NPC communication/dialogue system
- `[ ]` Quest mechanics/progression systems
- `[ ]` Magic/casting systems
- `[ ]` Combat systems
- `[ ]` NPC pathing and schedule behavior
- `[ ]` Party control semantics and companion command behaviors
- `[ ]` Character progression/stat effects and status-condition gameplay
- `[ ]` Sleep/rest interactions and world-time side effects
- `[ ]` Day/night cycle gameplay effects and presentation parity
- `[ ]` Music system integration and track-state parity
- `[ ]` Sound effects/event audio parity
- `[ ]` Economy/shop interactions and transaction rules
- `[ ]` Scripted world-state triggers (switches, keyed gates, event flags)
- `[ ]` Dungeon traversal semantics (ladders/stairs/level transitions/constraints)
- `[ ]` Boat and other vehicle interaction/navigation behavior
- `[ ]` Full verb-backend parity beyond movement baseline (`attack/cast/drop/move` completion)

### M4 Gameplay Parity Expansion

- `[x]` Static object layer from legacy save data (`objblk`, `objlist`)
- `[x]` Animated tiles (water/fire/wheels) with deterministic phase control
- `[x]` Interaction baseline (avatar mode, door toggle, collision behavior)
- `[~]` Keyboard parity expansion:
  - legacy verb keys mapped and mode-aware target cursor flow wired
  - first-pass target verb backends landed for `look/talk/get/use`
  - command backend parity (`attack/cast/drop/move`) still pending
- `[x]` NPC render + deterministic movement pilot + occlusion guards
- `[x]` Rendering parity hardening (blackout/wall/corner baseline restored):
  - `nuvie` feature-gated path removed
  - legacy-like blackout/wall behavior restored as default renderer path
  - hidden-room wall-adjacent decor suppression restored by source-cell visibility

### M5 Multiplayer

- `[x]` Network-neutral command envelope groundwork
- `[x]` Peer checkpoint hash comparison utility
- `[~]` Auth + remote character persistence contract defined (`docs/architecture/new/multiplayer-state-contract.md`)
- `[~]` Critical quest-item recovery/respawn policy defined for server authority (DEC-0003)
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
- `[x]` Blackout/wall/corner parity stabilization pass:
  - retained legacy-like blackout logic as single default path
  - removed `nuvie` runtime mode fork
  - fixed hidden-room wall decor leak in composition model

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
- `[x]` Resolve blackout wall-render parity and remove Nuvie mode fork
- `[~]` Add mode-aware legacy keyboard parity matrix + target-cursor flow
- `[~]` Add deterministic interaction/state transition tests:
  - completed: canonical status transition matrix (`LOCXYZ/CONTAINED/INVEN/EQUIP`)
  - completed: server interaction lifecycle contract + deterministic checkpoint hash replay
  - next: nested containment/assoc-chain accessibility fixtures and regression corpus
- `[ ]` Capture and archive startup/menu parity screenshot pair (R5)
- `[~]` Start M5 contracts slice (auth + remote saves + critical item recovery policy)
- `[ ]` Add environmental object collision pass (chairs, beds, tables, furniture)
- `[ ]` Add seated/lying interaction states:
  - avatar can sit in chairs and lie/sleep in beds
  - NPCs can enter sit/sleep states with deterministic pose/state transitions

## Known Blockers / Risks

- `[~]` Full canonical title-menu ownership is split across assets/executable paths not entirely represented in released decompiled C source.
- `[x]` Wall/corner/contextual blackout parity hardening pass completed for current default renderer path.
- `[~]` Browser renderer still owns logic that should ultimately be centralized in sim-core authority boundaries.
- `[ ]` Multiplayer remains deferred until rendering/interactions reach stable parity confidence.
- `[~]` Audio parity work is intentionally paused while interaction/collision parity slices are prioritized.

## Deferred Backlog (Intentional Pause)

- `[~]` Audio parity program (paused):
  - OPL backend fidelity work
  - ScummVM/Nuvie reference tuning
  - worklet/runtime hardening after gameplay-interaction slices

## Next Immediate Task

Continue canonical interaction-parity closure before resuming audio:

1. Implement assoc/container-chain traversal semantics for contained items (cycle/missing-parent guards). (`partially complete` in net authority path)
2. Enforce chain-access rules in canonical interaction execution (`take/put/drop/equip`) and expose `blocked_by` diagnostics. (`complete` for server endpoint path)
3. Add deterministic replay/hash fixtures for repeated interaction command streams over nested chains. (`in progress`, lifecycle + reset replay hash checks landed)
4. Add room-level canonical fixture corpus for interaction hotspots (Virtue room / British study stack cases).
5. Only after chain semantics closure: proceed to environmental collision + sit/sleep interaction slice.

Then continue R5/R3 closure and M5:

6. Capture startup/title parity screenshots against legacy references.
7. Add deterministic interaction visual-state replay fixtures (doors + sit/sleep states).
8. Continue M5 backend/game-state authority slices.
