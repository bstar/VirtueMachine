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
