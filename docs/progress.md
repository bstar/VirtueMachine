# Project Progress Checklist

Last Updated: 2026-02-11

## Milestone Status

- `[x]` M0: Documentation Foundation
- `[x]` M1: Deterministic Runtime Skeleton
- `[~]` M2: World State and Persistence Slice
- `[ ]` M3: Playable Single-Player Vertical Slice
- `[ ]` M4: Gameplay Parity Expansion
- `[ ]` M5: Multiplayer Prototype

Legend:

- `[x]` complete
- `[~]` in progress
- `[ ]` not started

## Completed (Backfilled)

- `[x]` Established modern repo with legacy submodule provenance and policy guardrails (`e30639d`)
- `[x]` Added pinned-legacy workflow and local asset sync tooling (`f8f6b3f`)
- `[x]` Added Nix flake dev shell for reproducible toolchain (`cd72e63`)
- `[x]` Documented sandbox escalation workflow and assistant policy (`5bdc9d6`)
- `[x]` Implemented deterministic `sim-core` bootstrap with replay hash test (`9ea6f61`)
- `[x]` Ported initial `D_2C4A`-mapped world state into `sim-core` with serialization/hash invariants tests (`0ac9cbe`)

## Current Sprint Checklist

### M2 Slice 2: `objlist` Compatibility Boundary

- `[x]` Add typed `objlist`-tail compatibility layout under `modern/sim-core`
- `[x]` Implement little-endian read/write helpers with strict size checks
- `[x]` Add roundtrip and malformed-input tests for persistence boundary
- `[x]` Add hash invariants for load/save roundtrip behavior
- `[x]` Document field offsets and assumptions in `docs/research/legacy-findings.md`

### Engineering Hygiene

- `[ ]` Add a one-command local test runner script (for example `modern/tools/test.sh`)
- `[ ]` Add CI job for CMake build + CTest in flake shell context (or equivalent environment)

## Known Blockers / Risks

- `[~]` Exact legacy binary layout assumptions for full `savegame/objlist` still being validated
- `[~]` Potential determinism drift if future subsystems introduce non-authoritative randomness or frame-time coupling
- `[ ]` No UI/client integration yet (M3 not started)

## Next Immediate Task

Implement `M2 Slice 2` (`objlist` persistence compatibility boundary) before map/chunk/object streaming.
