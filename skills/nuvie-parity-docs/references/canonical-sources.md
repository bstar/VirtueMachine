# Canonical Sources For Nuvie Parity

## Purpose Boundary

- VirtueMachine does not target Nuvie behavior as the end state.
- VirtueMachine targets original Ultima VI behavior from decompiled legacy code + original data.
- Nuvie/ScummVM sources are used to gather clues when legacy logic is hard to interpret.

## Rule

- For Nuvie clue-reading, treat ScummVM Nuvie as canonical: `https://github.com/scummvm/scummvm/tree/master/engines/ultima/nuvie`
- Treat standalone Nuvie as historical/archive context: `https://github.com/nuvie/nuvie`
- Do not accept a Nuvie-only argument as sufficient for a VirtueMachine behavior change.

## Freshness Checks

Use these commands before major parity analysis:

```bash
curl -L "https://api.github.com/repos/scummvm/scummvm/commits?path=engines/ultima/nuvie&per_page=1"
curl -L "https://api.github.com/repos/nuvie/nuvie/commits?per_page=1"
```

As of February 13, 2026:

- ScummVM Nuvie path latest commit date: `2026-02-11`
- Standalone Nuvie latest commit date: `2025-03-12` (README update noting move to ScummVM)

## Critical Upstream Files

- `map_window.cpp`
  - draw order, blackout rules, object visibility suppression, multi-tile spill behavior
- `ObjManager.cpp`
  - object lookup, tile mapping, multi-tile occupancy checks
- `TileManager.cpp`
  - tile flags, passability, animation indirection

ScummVM raw URLs:

- `https://raw.githubusercontent.com/scummvm/scummvm/master/engines/ultima/nuvie/gui/widgets/map_window.cpp`
- `https://raw.githubusercontent.com/scummvm/scummvm/master/engines/ultima/nuvie/core/obj_manager.cpp`
- `https://raw.githubusercontent.com/scummvm/scummvm/master/engines/ultima/nuvie/core/tile_manager.cpp`

Standalone Nuvie historical URLs:

- `https://raw.githubusercontent.com/nuvie/nuvie/master/MapWindow.cpp`
- `https://raw.githubusercontent.com/nuvie/nuvie/master/ObjManager.cpp`
- `https://raw.githubusercontent.com/nuvie/nuvie/master/TileManager.cpp`

## Local VirtueMachine Files To Compare

- `modern/client-web/render_composition.js`
- `modern/client-web/app.js`
- `modern/client-web/tests/render_composition.test.js`

## Legacy Decompiled Anchors

- `legacy/u6-decompiled/SRC/u6.h` (packed coordinate decode macros)
- `legacy/u6-decompiled/SRC/seg_0A33.c`
- `legacy/u6-decompiled/SRC/seg_1184.c`
- `legacy/u6-decompiled/SRC/seg_2FC1.c`

## Required Evidence In Any Parity Fix

- Coordinate-level report (affected cells)
- Raw object record decode (`type`, `frame`, `tile`, packed coords)
- Classification label from skill workflow
- Legacy evidence showing why behavior matches original logic/data
- Optional: ScummVM/Nuvie clue that helped locate that legacy evidence
