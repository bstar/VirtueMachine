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
