# Project Progress Checklist

Last Updated: 2026-02-11

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

## 90-Day Execution Plan (Slice-Based)

### Month 1 (Weeks 1-4): Finish M2 Foundations

#### Slice M2.3: Map/Chunk Read Compatibility (Read-Only)

- `[x]` Add `u6_map` module (`modern/sim-core/include/u6_map.h`, `modern/sim-core/src/u6_map.c`)
- `[x]` Implement `map` file open/close and tile read API with bounds checks
- `[x]` Implement `chunks` file read API with chunk index validation
- `[x]` Add fixture-based tests (small synthetic binaries, no proprietary assets)
- `[x]` Document offset/index assumptions in `docs/research/legacy-findings.md`

#### Slice M2.4: Deterministic Time/Clock Semantics

- `[x]` Define authoritative tick-to-time policy for minute/hour/day progression
- `[x]` Add regression tests for rollover behavior (minute->hour->day->month)
- `[x]` Document intended parity gaps (if any) in `docs/architecture/new/sim-core-contract.md`

#### Slice M2.5: Persistence API Hardening

- `[x]` Add versioned state blob header for modern snapshots
- `[x]` Add malformed/corrupt snapshot tests
- `[x]` Add explicit error codes and failure-path tests for all persistence functions

### Month 2 (Weeks 5-8): Reach First Playable Vertical Slice (M3)

#### Slice M3.1: Command Pipeline and Core Loop Integration

- `[x]` Define stable command schema for movement/interact/wait
- `[x]` Implement command queue ingestion boundary between client and sim-core
- `[x]` Add replay logs with deterministic checkpoint hashes every N ticks

#### Slice M3.2: Minimal Web Client Scaffolding

- `[x]` Scaffold `modern/client-web` app shell and runtime loop
- `[x]` Render tile grid viewport fed only by sim-core snapshot data
- `[x]` Add camera transform supporting larger world view area
- `[x]` Add input mapping (keyboard first) to simulation commands

#### Slice M3.3: Asset Pipeline Integration

- `[x]` Add runtime asset validation command (preflight)
- `[x]` Wire map/chunk/tile reads from `modern/assets/runtime`
- `[x]` Add fallback diagnostics UI for missing asset files

#### Slice M3.4: Playable Walkaround Demo

- `[x]` Achieve movement on map with deterministic tick stepping
- `[x]` Show current world time/date/map position in debug HUD
- `[x]` Capture demo replay and verify hash stability between runs

### Month 3 (Weeks 9-12): M4 Early Parity + Multiplayer Prework

#### Slice M4.1: Object/NPC Data Surface

- `[x]` Introduce typed object/NPC state containers for a minimal subset
- `[x]` Port first object placement/update rules with deterministic tests
- `[x]` Add save/load tests for object subset roundtrip

#### Slice M4.2: Interaction + Basic Dialogue Path

- `[x]` Port one interaction flow (open/use/talk minimal path)
- `[x]` Add deterministic script/dialogue execution test fixtures
- `[x]` Document legacy-to-modern function mapping for this flow

#### Slice M4.3: Multiplayer Readiness (Pre-M5)

- `[x]` Define network-neutral command envelope (tick, actor, command, args)
- `[x]` Add serialization/deserialization tests for command envelopes
- `[x]` Add desync detector utility comparing checkpoint hashes between peers

#### Slice M4.4: Quality Gates and CI Expansion

- `[x]` Add CI job for replay regression pack
- `[x]` Add CI artifact upload of replay/hash logs
- `[x]` Set minimum required test set for merge to `main`

### Next 90 Days (Reprioritized): Rendering Layer Parity First

#### Slice R1: Static Object Layer Rendering (Doors/Fountains/Tables/Food)

- `[x]` Identify and document legacy object placement source files/records for world map overlays
- `[x]` Add read-only loader for static world object placements into `sim-core` data surface
- `[x]` Render static object layer in `client-web` above terrain with deterministic ordering rules
- `[x]` Add fixture tests for placement decode and draw-order determinism
- `[ ]` Capture parity screenshots at known coordinates (legacy reference vs web client)

#### Slice R2: Occlusion/Passability-Aware Composition

- `[~]` Implement tile/object composition rules for doorway openings, wall edges, and overlap priority
- `[x]` Add first-pass entity/NPC overlay render layer from legacy `savegame/objlist` actor records
- `[ ]` Ensure interaction probes use the same object layer coordinates as renderer
- `[ ]` Add regression cases for corner/edge overlaps and transparency correctness

#### Slice R3: Interactive Container Props and Visual State

- `[ ]` Add world-state-backed visual variants (e.g., opened/closed doors, empty/non-empty containers)
- `[ ]` Bind first interaction outcomes to layer sprite state transitions
- `[ ]` Add replay/hash tests proving visual state transitions are deterministic

#### Slice R4: Layer Parity Hardening and Tooling

- `[ ]` Build a map sweep validator for missing/unknown object sprites in viewport samples
- `[ ]` Add CI artifact upload for layer parity diff reports/screenshots
- `[ ]` Document accepted parity gaps and unresolved legacy ambiguities

## Current Sprint Focus

- `[x]` Complete M3.3 (asset pipeline integration)
- `[x]` Complete M3.4 (playable walkaround demo)
- `[x]` Complete M4.1 (object/NPC data surface)
- `[x]` Complete M4.2 (interaction + basic dialogue path)
- `[x]` Start M4.3 (multiplayer readiness prework)
- `[x]` Define actor-aware command envelope variant and checksum fixtures
- `[x]` Add peer checkpoint hash comparator CLI + automated test
- `[x]` Complete M4.4 CI quality gates (required tests + replay artifact job)
- `[x]` Start R1 static object layer rendering (doors/fountains/tables/food)
- `[x]` Add canonical capture preset + PNG export tooling for parity screenshot workflow
- `[x]` Add deterministic tick-driven animated tile phase + freeze/debug toggle + replay animation checkpoints
- `[x]` Port legacy VGA fire/water palette cycling to deterministic web renderer path
- `[x]` Add renderer debug stats (palette phase, center tile ids, palette band)
- `[x]` Land first terrain+object parity screenshots from canonical locations

## Known Blockers / Risks

- `[~]` Exact legacy binary layout assumptions for full `savegame/objlist` still being validated
- `[~]` Potential determinism drift if future subsystems introduce non-authoritative randomness or frame-time coupling
- `[~]` Current browser renderer duplicates some map/chunk logic in JS pending shared sim-core boundary
- `[ ]` Map/chunk format edge cases may require additional reverse-engineering passes
- `[~]` Multiplayer implementation deferred; architecture decisions will be made incrementally when R1-R4 work exposes concrete needs
- `[~]` Legacy object placement storage/encoding for world overlays still needs explicit mapping

## Next Immediate Task

Harden R2 entity layering: add occlusion/order parity checks for actor-vs-wall/door transitions and document residual gaps.
