# Legacy Startup/Menu Parity Notes

Last Updated: 2026-02-12

## Confirmed in Decompiled `GAME.EXE` Source

- `paper.bmp` is drawn during startup via `C_0903_070B` in `legacy/u6-decompiled/SRC/seg_0903.c`.
- VGA palette is initialized from `u6pal` via `C_0903_07C4` in `legacy/u6-decompiled/SRC/seg_0903.c`.
- Main font `U6.CH` is loaded during startup in `legacy/u6-decompiled/SRC/seg_0903.c`.
- Verb icons are drawn from tile IDs `TIL_190..TIL_198` and `TIL_19E` before game load in `legacy/u6-decompiled/SRC/seg_0903.c`.
- Gameplay load path then calls `C_0C9C_042A` (reads `schedule`, `basetile`, `savegame/objlist`, `chunks`) in `legacy/u6-decompiled/SRC/seg_0C9C.c`.

## What Is Not Yet Provenanced in This Decompiled Repo

- The full title menu presentation text/options (e.g. journey/new/return/configure) are not directly visible as plain strings in the released `legacy/u6-decompiled/SRC` for `GAME.EXE`.
- Upstream decompiler README states other executables were decompiled but not published in this repo.
- This implies canonical title/menu draw and input flow may live partly outside the currently released `GAME.EXE` source path.
- Direct binary evidence from local `u.exe` string table references `intro.ptr`, `intro.shp`, `intro_1.shp`, `intro_2.shp`, and `intro_3.shp`, reinforcing that startup/title presentation is likely handled by the intro executable path.

## Assets Likely Relevant to Title/Menu Parity

From the local original game directory (`../ultima6`) we have startup/menu candidates:

- `mainmenu.shp`
- `titles.shp`
- `intro.shp`, `intro_1.shp`, `intro_2.shp`, `intro_3.shp`
- `intro.ptr`
- `u.exe`, `game.exe`, `ultima6.exe`

These have been added to `modern/assets/manifest.optional.txt` for local sync.

## Next Technical Step

1. Add a small startup-asset inspector in `modern/tools` to parse/preview `.shp`/`.ptr` data and identify exact menu/title frames.
2. Correlate extracted frame geometry with existing in-engine startup renderer.
3. Only then perform pixel-parity layout pass for the startup menu.

## Current Tooling

- `modern/tools/inspect_shp.js` decodes U6 LZW-wrapped startup assets and reports candidate header/table structure.
- Example:
  - `node modern/tools/inspect_shp.js modern/assets/runtime/mainmenu.shp modern/assets/runtime/titles.shp modern/assets/runtime/intro.shp modern/assets/runtime/intro.ptr`
