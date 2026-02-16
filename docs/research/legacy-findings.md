# Legacy Findings Log

Use this log to capture reverse-engineering discoveries in chronological order.

## Entry Template

```text
Finding ID:
Date:
Area:
Legacy Source Ref:
Summary:
Evidence:
Confidence:
Impact on Port:
Next Validation Step:
Related Symbols:
Related Modern Docs:
```

## Findings

Finding ID: FIND-0001
Date: 2026-02-11
Area: Build/Portability
Legacy Source Ref: `SRC/u6.h`, `SRC/seg_0903.c`, `SRC/seg_32C3.c`
Summary: current decompiled source is tightly coupled to 16-bit DOS APIs and memory model.
Evidence: use of `far` pointers, `dos.h`, `int86/intdos`, segmented macros (`MK_FP`)
Confidence: high
Impact on Port: requires platform abstraction and selective rewrite before modern compilation
Next Validation Step: isolate minimal simulation-only subset compile target
Related Symbols: SYM-0004
Related Modern Docs: `../architecture/new/system-overview.md`

Finding ID: FIND-0002
Date: 2026-02-11
Area: Runtime Data Dependency
Legacy Source Ref: `SRC/seg_0C9C.c`, `SRC/seg_0903.c`, `SRC/seg_2FC1.c`, `SRC/seg_2F1A.c`
Summary: game requires many external original data/driver files not present in repo.
Evidence: explicit runtime opens for `map`, `chunks`, `savegame\\objlist`, `*.DRV`, `*.m`, and UI/data assets
Confidence: high
Impact on Port: asset pipeline and manifest are required for functional runtime
Next Validation Step: build machine-readable required-file manifest
Related Symbols: SYM-0001, SYM-0002, SYM-0003
Related Modern Docs: `../architecture/new/system-overview.md`

Finding ID: FIND-0003
Date: 2026-02-11
Area: Savegame Layout (`savegame\\objlist`)
Legacy Source Ref: `SRC/seg_0C9C.c`, `SRC/D_2C4A.c`, `SRC/u6.h`
Summary: the serialized `D_2C4A..D_2CCB` block occupies `0x82` bytes and begins after fixed-size `objlist` sections at offset `0x1BF1`.
Evidence: summing fixed reads before tail in `C_0C9C_042A` yields `0x1BF1`; length expression `(char *)&D_2CCC - (char *)&obj_2C4A` yields `0x82`.
Confidence: high
Impact on Port: enables strict compatibility boundary for extracting/patching mapped world fields without mutating unknown bytes.
Next Validation Step: validate on multiple real save files and confirm no variant layout deltas.
Related Symbols: SYM-0004, SYM-0005, SYM-0006, SYM-0007
Related Modern Docs: `../architecture/new/sim-core-contract.md`

Finding ID: FIND-0004
Date: 2026-02-11
Area: Map/Chunk Read Layout
Legacy Source Ref: `SRC/seg_101C.c`
Summary: legacy map loading uses 0x180-byte map blocks (z=0) and 0x600-byte map windows (z>0), with packed 12-bit chunk indices and 0x40-byte chunk data blocks.
Evidence: `OSI_read(..., 0x180, ...)`, `OSI_read(..., 4 * 0x180, ...)`, `OSI_read(..., (long)chunkIdx << 6, 0x40, ...)`, and `getChunkIdxAt` 12-bit decode logic.
Confidence: high
Impact on Port: enables deterministic read-only map/chunk compatibility APIs and fixture-based tests without shipping proprietary data.
Next Validation Step: verify with real runtime assets across multiple coordinates and z-levels.
Related Symbols: SYM-0006
Related Modern Docs: `../architecture/new/sim-core-contract.md`

Finding ID: FIND-0005
Date: 2026-02-11
Area: Clock Semantics Baseline
Legacy Source Ref: `SRC/D_2C4A.c`, `SRC/seg_0A33.c`, `SRC/seg_101C.c` (time use sites)
Summary: a deterministic calendar/tick policy is now explicit in sim-core (4 ticks/minute, 60/24/28/13 rollovers).
Evidence: implemented and covered by `test_clock_rollover`; chosen as stable baseline while deeper legacy timing parity analysis continues.
Confidence: medium
Impact on Port: establishes deterministic time progression needed for replay, save/load, and future network sync.
Next Validation Step: verify against legacy runtime behavior over long in-game time spans and adjust if parity gaps are observed.
Related Symbols: SYM-0005
Related Modern Docs: `../architecture/new/sim-core-contract.md`

Finding ID: FIND-0006
Date: 2026-02-11
Area: Snapshot Persistence Format
Legacy Source Ref: N/A (modern compatibility envelope)
Summary: introduced a versioned, checksummed snapshot envelope around authoritative sim state to harden persistence and future net sync.
Evidence: snapshot header includes magic/version/size/checksum and validated deserialize error paths.
Confidence: high
Impact on Port: improves corruption detection, simplifies migration/versioning strategy, and provides explicit failure behavior.
Next Validation Step: add snapshot format version migration test when version 2 fields are introduced.
Related Symbols: SYM-0004, SYM-0008
Related Modern Docs: `../architecture/new/sim-core-contract.md`

Finding ID: FIND-0007
Date: 2026-02-11
Area: Command Envelope + Replay Checkpoints
Legacy Source Ref: N/A (modern deterministic tooling boundary)
Summary: introduced fixed-size command wire envelope and deterministic checkpoint log output to support client ingestion and future net desync diagnostics.
Evidence: command wire encode/decode helpers and replay checkpoint tests in sim-core test suite.
Confidence: high
Impact on Port: establishes stable input boundary for web client integration and deterministic run comparison tooling.
Next Validation Step: consume command envelopes directly from client-web input loop in M3.2.
Related Symbols: SYM-0004, SYM-0006
Related Modern Docs: `../architecture/new/sim-core-contract.md`

Finding ID: FIND-0008
Date: 2026-02-11
Area: First Rendering Prototype
Legacy Source Ref: `SRC/seg_101C.c` (map/chunk tile addressing patterns)
Summary: first browser rendering path is functional: fixed-tick loop, command-envelope movement input, and tile viewport using runtime `map`/`chunks` binary reads with deterministic synthetic fallback.
Evidence: `modern/client-web/app.ts` implements map-window/chunk decode logic aligned with `seg_101C` assumptions and renders 11x11 tile viewport.
Confidence: medium
Impact on Port: unblocks visual iteration and UX work while preserving deterministic input/tick flow.
Next Validation Step: wire rendering reads through a shared sim-core boundary (wasm or generated bridge) to remove JS-side duplicate logic.
Related Symbols: SYM-0006, SYM-0008
Related Modern Docs: `../architecture/new/sim-core-contract.md`

Finding ID: FIND-0009
Date: 2026-02-11
Area: Runtime Asset Preflight + Diagnostics
Legacy Source Ref: `SRC/seg_101C.c` (runtime `map`/`chunks` dependency surface)
Summary: browser client startup now distinguishes required runtime files (`map`, `chunks`) from optional assets and falls back deterministically when required files are absent.
Evidence: `modern/tools/validate_assets.sh` validates required/optional manifests; `modern/client-web/app.ts` performs preflight fetch checks and emits explicit diagnostics UI state.
Confidence: high
Impact on Port: reduces startup ambiguity for contributors, preserves runnable web demo without proprietary data, and clarifies when viewport output is real map data versus synthetic fallback.
Next Validation Step: move map/chunk read path behind shared sim-core boundary to remove duplicate decode logic and unify diagnostics.
Related Symbols: SYM-0006, SYM-0008
Related Modern Docs: `../architecture/new/sim-core-contract.md`

Finding ID: FIND-0010
Date: 2026-02-11
Area: Browser Walkaround Determinism Surface
Legacy Source Ref: `SRC/D_2C4A.c` (world clock fields), `SRC/seg_0A33.c` (calendar usage), `SRC/seg_101C.c` (map movement context)
Summary: browser walkaround now advances a deterministic world clock/date and exposes per-tick state hashes with replay checkpoint export for stability verification.
Evidence: `modern/client-web/app.ts` now mirrors sim-core tick semantics (xorshift32, 4 ticks/minute, rollover rules), computes FNV-1a 64-bit state hash, and verifies replay checkpoints via dual re-run comparison.
Confidence: medium
Impact on Port: provides a practical browser-side determinism harness for movement slices and creates reproducible checkpoint artifacts before wasm unification is introduced.
Next Validation Step: replace JS-side deterministic helpers with direct sim-core wasm calls to eliminate duplicate authority logic.
Related Symbols: SYM-0005, SYM-0008
Related Modern Docs: `../architecture/new/sim-core-contract.md`

Finding ID: FIND-0011
Date: 2026-02-11
Area: Typed Object/NPC State Surface
Legacy Source Ref: `SRC/obj.h`, `SRC/seg_1944.c`, `SRC/seg_356A.c` (entity placement/update touchpoints)
Summary: introduced a bounded typed entity module with explicit object/NPC state records, deterministic patrol stepping, and versioned subset serialization.
Evidence: `modern/sim-core/include/u6_entities.h`, `modern/sim-core/src/u6_entities.c`, and `modern/sim-core/tests/test_entities.c`.
Confidence: medium
Impact on Port: establishes a deterministic, testable entity-state boundary needed before interaction/dialogue logic is ported.
Next Validation Step: map first real legacy interaction path (open/use/talk) onto this entity surface and validate symbol-level parity assumptions.
Related Symbols: SYM-0008
Related Modern Docs: `../architecture/new/sim-core-contract.md`

Finding ID: FIND-0012
Date: 2026-02-11
Area: Interaction Boundary (Talk/Use/Open)
Legacy Source Ref: `SRC/seg_1703.c`, `SRC/seg_1944.c`, `SRC/seg_27a1.c`
Summary: first deterministic interaction flow is isolated into a dedicated boundary with stable request/result structures and explicit failure codes.
Evidence: `modern/sim-core/include/u6_interaction.h`, `modern/sim-core/src/u6_interaction.c`, and `modern/sim-core/tests/test_interaction.c`.
Confidence: medium
Impact on Port: provides a testable gameplay interaction seam required for gradual dialogue/script parity work.
Next Validation Step: connect one legacy conversation/script path to this boundary and compare observed branch outcomes.
Related Symbols: SYM-0009, SYM-0010
Related Modern Docs: `../architecture/new/sim-core-contract.md`

Finding ID: FIND-0013
Date: 2026-02-11
Area: Object Block (`savegame/objblk??`) Layout for World Overlay Rendering
Legacy Source Ref: `SRC/seg_1184.c` (`C_1184_2722`, `C_1184_2DEF`, `__ObjSerialize`, `__ObjectsDeserialize`), `SRC/u6.h` (`struct t_9E39`, coord/status macros)
Summary: each `objblk` file is a compact object list: 2-byte object count followed by `count * 8` records (`ObjStatus`, packed coord, `ObjShapeType`, `Amount`), with area file naming based on 8x8 outdoor region IDs.
Evidence: legacy read/write paths use `OSI_read(..., 2)` for count and `OSI_read(..., count << 3, ScratchBuf)` for record payload; file name mapping writes `objblkXY` where `X=(area_id & 7)+'A'`, `Y=(area_id >> 3)+'A'`; packed coord decode follows `GetCoordX/GetCoordY/GetCoordZ` bit layout in `u6.h`.
Confidence: high
Impact on Port: enables faithful static object overlay rendering (doors/fountains/tables/food) from original game save data without mutating legacy sources.
Next Validation Step: compare selected known map locations against reference captures and refine draw ordering/occlusion rules for multi-object stacks.
Related Symbols: SYM-0006, SYM-0008
Related Modern Docs: `../architecture/new/system-overview.md`, `../progress.md`

Finding ID: FIND-0014
Date: 2026-02-11
Area: Read-Only `objblk` Compatibility Boundary in Sim-Core
Legacy Source Ref: `SRC/seg_1184.c` (`C_1184_2DEF`, `__ObjectsDeserialize`), `SRC/u6.h` (`GetCoordX/GetCoordY/GetCoordZ`, `GetType/GetFrame`)
Summary: added a deterministic parser/loader module for legacy `savegame/objblk??` records into a typed modern boundary, including stable render-order sorting.
Evidence: `modern/sim-core/include/u6_objblk.h`, `modern/sim-core/src/u6_objblk.c`, and `modern/sim-core/tests/test_u6_objblk.c`.
Confidence: high
Impact on Port: removes client-only parsing assumptions and establishes a testable data source for world prop overlays and future interaction parity.
Next Validation Step: replace direct JS `objblk` parsing path with data sourced through shared sim-core boundary.
Related Symbols: SYM-0006, SYM-0008
Related Modern Docs: `../architecture/new/sim-core-contract.md`, `../progress.md`

Finding ID: FIND-0015
Date: 2026-02-11
Area: Wall Corner Variant Parity (`seg_1100` AreaFlags vs web approximation)
Legacy Source Ref: `SRC/seg_1100.c` (`C_1100_0306`), `SRC/seg_1184.c` (`C_1184_35EA`), `SRC/u6.h` (`IsTileDoubleH`, `IsTileDoubleV`, wall/floor tile flags)
Summary: interior wall-corner selection depends on an AreaFlags wall signal that combines base map terrain walls and object wall contributions (including double-width/height spill into neighbor cells). A terrain-only neighbor check can misclassify straight walls as corners in places like the Lord British throne room.
Evidence: legacy AreaFlags build marks wall bits from `TILE_FRAME(obj)` and propagates wall flags to adjacent cells for double-H/double-V tiles before corner remap logic runs.
Confidence: medium-high
Impact on Port: prevents visible wall-shape artifacts and keeps architectural silhouettes stable in interior maps without introducing object-specific hacks.
Next Validation Step: spot-check known interior corner cases (Britain castle/throne room, tavern interiors) against captured reference views; then move this logic behind a shared sim-core/render boundary.
Related Symbols: SYM-0006
Related Modern Docs: `../architecture/new/system-overview.md`, `../progress.md`

Finding ID: FIND-0016
Date: 2026-02-11
Area: Renderer/Interaction Coordinate Parity and Occlusion Telemetry
Legacy Source Ref: `SRC/seg_1184.c` (`C_1184_35EA` object spill to neighbor cells), `SRC/seg_1100.c` (visibility/open-area behavior)
Summary: web client now builds a single overlay-cell composition model for object rendering and interaction probing, and records actor-vs-occluder parity warnings from the same data source.
Evidence: `modern/client-web/app.ts` now routes object spill/main tile placement through `buildOverlayCells(...)`, uses `topInteractiveOverlayAt(...)` for probe tile selection, and computes `measureActorOcclusionParity(...)` for deterministic HUD diagnostics.
Confidence: medium-high
Impact on Port: removes a class of renderer/probe coordinate drift bugs and gives a deterministic signal when doorway/wall transition ordering regresses.
Next Validation Step: add fixture-driven parity checks for known corner/edge overlap and transparency hotspots (throne room and interior door transitions), then compare against canonical captures.
Related Symbols: SYM-0006, SYM-0008
Related Modern Docs: `../progress.md`, `../architecture/new/system-overview.md`

Finding ID: FIND-0017
Date: 2026-02-11
Area: Deterministic Client-Side Layer Composition Fixtures
Legacy Source Ref: `SRC/seg_1184.c` (`C_1184_35EA` double-width/height spill), `SRC/u6.h` (tile flag-driven composition semantics)
Summary: extracted pure renderer-composition logic into a standalone module and added fixture tests for spill ordering, visibility suppression, actor-vs-occluder parity warnings, and mask/transparency edge rules.
Evidence: `modern/client-web/render_composition.ts`, `modern/client-web/tests/render_composition_fixtures.ts`, and CTest integration via `client_web_render_composition_test`.
Confidence: high
Impact on Port: catches corner/edge overlap and transparency regressions before runtime manual testing; reduces risk of reintroducing throne-room/door transition artifacts.
Next Validation Step: extend fixtures with canonical map-coordinate captures once screenshot diff tooling lands.
Related Symbols: SYM-0006, SYM-0008
Related Modern Docs: `../progress.md`, `../architecture/new/system-overview.md`

Finding ID: FIND-0018
Date: 2026-02-11
Area: Ghost vs Avatar Movement Authority + First Door Visual State
Legacy Source Ref: `SRC/seg_1184.c` (door/object placement and tile spill behavior), `SRC/u6.h` (tile flags and blocking semantics)
Summary: client now supports explicit movement authority modes: `ghost` (free camera locomotion) and `avatar` (collision-aware locomotion). Avatar mode introduces first world-state-backed door toggles and uses the same door state for both passability and rendered tile variant.
Evidence: `modern/client-web/app.ts` adds `movementMode`, collision gating in `applyCommand`, `queueInteractDoor` command flow, and deterministic `sim.doorOpenStates` hashing.
Confidence: medium
Impact on Port: enables practical avatar-centric interaction testing (doors + collision) without dropping existing free-roam inspection workflow.
Next Validation Step: add replay fixtures for avatar-mode door open/close command sequences and verify hash parity across repeated runs.
Related Symbols: SYM-0006, SYM-0008
Related Modern Docs: `../progress.md`, `../architecture/new/system-overview.md`

Finding ID: FIND-0019
Date: 2026-02-11
Area: Boundary-Scoped Wall Reshape Parity (Nuvie Cross-Reference)
Legacy Source Ref: Nuvie `MapWindow.cpp` (`generateTmpMap`, `reshapeBoundary`, `tmpBufTileIsWall`, `tmpBufTileIsBoundary`), U6 wall flag model (`TileManager.h` `TILEFLAG_WALL_MASK`)
Summary: Nuvie uses a dedicated post-blackout boundary reshape pass for wall families instead of relying only on per-tile corner remap. This likely explains several doorway/room-edge corner parity differences seen in the web client.
Evidence: code review of Nuvie `MapWindow.cpp` shows `generateTmpMap` -> `boundaryFill` -> `reshapeBoundary` flow with explicit black-corner substitutions and boundary-gated wall mask reconstruction.
Confidence: medium
Impact on Port: provides a concrete reference model for the remaining wall-transition parity bugs without introducing ad-hoc object-specific hacks.
Next Validation Step: implement the boundary reshape model behind a feature gate and validate against canonical throne room / kitchen-courtyard captures before replacing current default path.
Related Symbols: SYM-0006
Related Modern Docs: `../progress.md`, `../architecture/new/system-overview.md`

Finding ID: FIND-0020
Date: 2026-02-12
Area: Startup/Menu Presentation Parity Baseline
Legacy Source Ref: `SRC/seg_0903.c` (`C_0903_070B`, `C_0903_07C4`, startup init path), `SRC/seg_0C9C.c` (`C_0C9C_042A`, icon/status geometry constants), `SRC/u6.h`
Summary: the gameplay executable startup flow initializes palette/font/background/UI shell directly from game assets (`u6pal`, `U6.CH`, `paper.bmp`), draws verb icons at fixed tile slots, and then immediately enters savegame load path (`C_0C9C_042A`). The canonical "new/return/configure" title menu text is not present as plain strings in this decompiled gameplay source, indicating that presentation likely lives in intro/auxiliary assets or another executable path.
Evidence: `seg_0903.c` loads `U6.CH`, calls `C_0903_07C4` (palette), `C_0903_070B` (paper background), and draws icon strip with `GR_2D(TIL_190 + i, ...)` plus `TIL_19E`; then calls `C_0C9C_042A` to load schedule/basetile/savegame structures. String scan does not reveal full startup menu labels in `SRC/*.c`.
Confidence: medium-high
Impact on Port: startup/menu parity work must be anchored to real asset/routine sequencing from gameplay init, with separate investigation for missing title-menu text/art provenance before claiming pixel-faithful title flow.
Next Validation Step: trace intro/title provenance (`intro.m`, auxiliary resources/binaries, and/or external startup executable path), then map exact menu draw coordinates and input state transitions into modern in-engine startup state.
Related Symbols: SYM-0001, SYM-0006, SYM-0008
Related Modern Docs: `../progress.md`, `../architecture/new/system-overview.md`

Finding ID: FIND-0021
Date: 2026-02-12
Area: Title/Intro Executable Provenance
Legacy Source Ref: local original runtime binaries (`u.exe`, `intro.ptr`, `intro*.shp`), `legacy/u6-decompiled/README.md`
Summary: canonical title/intro presentation appears to be owned by `u.exe` asset path rather than the released decompiled `GAME.EXE` source. `u.exe` references intro/title shape resources directly.
Evidence: binary strings from `u.exe` include `intro.ptr`, `intro.shp`, `intro_1.shp`, `intro_2.shp`, `intro_3.shp`; decompiler README states other executables were decompiled but not published.
Confidence: high
Impact on Port: faithful startup/menu parity requires tracing the intro executable resource format/flow (or a known equivalent implementation), not only mirroring `GAME.EXE` initialization.
Next Validation Step: implement a `.shp/.ptr` inspector for intro/title assets and map frame indices/coordinates used by startup/title screens.
Related Symbols: SYM-0001
Related Modern Docs: `../progress.md`, `../architecture/legacy/startup-menu-parity.md`
