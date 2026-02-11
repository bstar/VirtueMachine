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
Evidence: `modern/client-web/app.js` implements map-window/chunk decode logic aligned with `seg_101C` assumptions and renders 11x11 tile viewport.
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
Evidence: `modern/tools/validate_assets.sh` validates required/optional manifests; `modern/client-web/app.js` performs preflight fetch checks and emits explicit diagnostics UI state.
Confidence: high
Impact on Port: reduces startup ambiguity for contributors, preserves runnable web demo without proprietary data, and clarifies when viewport output is real map data versus synthetic fallback.
Next Validation Step: move map/chunk read path behind shared sim-core boundary to remove duplicate decode logic and unify diagnostics.
Related Symbols: SYM-0006, SYM-0008
Related Modern Docs: `../architecture/new/sim-core-contract.md`
