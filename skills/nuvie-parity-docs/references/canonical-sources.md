# Canonical And Comparative Sources For Parity Work

## Purpose Boundary

- VirtueMachine does not target Nuvie behavior as the end state.
- VirtueMachine targets original Ultima VI behavior from decompiled legacy code + original data.
- ScummVM/Nuvie and Ultima VI Online sources are used to gather clues when legacy logic is hard to interpret.

## Rule

- Canonical proof must come from `legacy/u6-decompiled` plus original data semantics.
- Treat ScummVM Nuvie as comparative input only: `https://github.com/scummvm/scummvm/tree/master/engines/ultima/nuvie`
- Treat Ultima VI Online as comparative input only: `https://github.com/CearDragon/ultima-vi-online`
- Do not accept ScummVM/Nuvie- or U6O-only arguments as sufficient for VirtueMachine behavior changes.

## Local Reference Checkouts (Preferred)

- `legacy/scummvm/engines/ultima/nuvie` (comparative)
- `legacy/ultima-vi-online` (comparative)

If these submodules are initialized, prefer local grep/trace workflows over remote browsing for speed and reproducibility.
Default policy: do not use internet fetches for ScummVM/U6O source inspection when local submodule copies exist.

## Freshness Checks

Use these commands before major parity analysis:

```bash
curl -L "https://api.github.com/repos/scummvm/scummvm/commits?path=engines/ultima/nuvie&per_page=1"
curl -L "https://api.github.com/repos/nuvie/nuvie/commits?per_page=1"
```

As of February 13, 2026:

- ScummVM Nuvie path latest commit date: `2026-02-11`
- Standalone Nuvie latest commit date: `2025-03-12` (README update noting move to ScummVM)
- Ultima VI Online latest commit date: verify with `curl -L "https://api.github.com/repos/CearDragon/ultima-vi-online/commits?per_page=1"`

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

Ultima VI Online comparative URLs:

- `https://raw.githubusercontent.com/CearDragon/ultima-vi-online/master/u6o7.cpp`
- `https://raw.githubusercontent.com/CearDragon/ultima-vi-online/master/define_both.h`
- `https://raw.githubusercontent.com/CearDragon/ultima-vi-online/master/loop_host.cpp`

## Local VirtueMachine Files To Compare

- `modern/client-web/render_composition.ts`
- `modern/client-web/app.ts`
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
