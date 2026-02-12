# Legacy Startup/Menu Parity Notes

Last Updated: 2026-02-12

## Confirmed Legacy Baseline (`GAME.EXE` Decompiled Source)

- Startup initializes palette/font/background from original assets:
  - `u6pal`
  - `U6.CH`
  - `paper.bmp`
- Startup shell draws legacy verb/icon strip (`TIL_190..TIL_198`, `TIL_19E`) before gameplay load path.
- Gameplay load path (`C_0C9C_042A`) reads core world/save structures (`schedule`, `basetile`, `savegame/objlist`, `chunks`).

Primary refs:

- `legacy/u6-decompiled/SRC/seg_0903.c`
- `legacy/u6-decompiled/SRC/seg_0C9C.c`

## Provenance Gap and Resolution Strategy

The full title/menu presentation text + sequencing is not fully visible in the released decompiled `GAME.EXE` C source.

Additional evidence points to intro/title ownership outside this published C set:

- `u.exe` references `intro.ptr`, `intro.shp`, `intro_1.shp`, `intro_2.shp`, `intro_3.shp`
- decompiler README indicates other executables were decompiled but not published in this repo

Therefore startup/menu parity work uses:

1. published gameplay init behavior from decompiled `GAME.EXE`
2. intro/title asset path evidence from original binaries
3. ScummVM/Nuvie implementation as reference for draw/input sequencing

## ScummVM/Nuvie Cross-Reference Used

Key references:

- `devtools/create_ultima/files/ultima6/scripts/u6/intro.lua`
- `engines/ultima/nuvie/script/script_cutscene.cpp`
- `engines/ultima/nuvie/files/u6_shape.cpp`
- `engines/ultima/nuvie/core/cursor.cpp`

Confirmed from this path:

- Title art from `titles.shp`
- Menu art from `mainmenu.shp`
- Palette-highlight menu selection (indices `14,33,34,35,36`)
- Cursor assets loaded from `u6mcga.ptr` (U6 path)

## Current Implementation Status (VirtueMachine)

- `[x]` Startup/title flow is in-engine, not HTML overlay.
- `[x]` `Journey Onward` is the only enabled action and enters throne room preset.
- `[x]` Keyboard + mouse menu navigation are implemented.
- `[x]` Real startup art decode/render:
  - `titles.shp`
  - `mainmenu.shp`
- `[x]` Menu highlight behavior uses palette-driven selection logic.
- `[x]` `Q` returns gameplay back to title flow.
- `[x]` Legacy cursor path integrated in engine rendering (`u6mcga.ptr`) across startup and game view.

## Asset Set Used for Startup/Menu Path

From original local game directory via optional sync manifest:

- `mainmenu.shp`
- `titles.shp`
- `intro.shp`, `intro_1.shp`, `intro_2.shp`, `intro_3.shp`
- `intro.ptr`
- `u.exe`, `game.exe`, `ultima6.exe`
- `u6mcga.ptr`

## Remaining Parity Work

1. Capture/curate pixel-parity screenshot pairs (legacy reference vs current startup/menu frame).
2. Finalize command/mode-specific cursor mapping policy (currently visually-correct default pointer is selected, but full mode mapping is pending).
3. Maintain explicit accepted-gap list if any startup/menu differences remain after screenshot audit.
