# Symbol Catalog and Rename Ledger

Use this file to track decompiled identifiers to proposed semantic names without losing provenance.

## Confidence Scale

- `high`: strongly supported by code, data flow, and behavior.
- `medium`: likely, but still needs runtime validation.
- `low`: hypothesis based on partial evidence.

## Status Tags

- `active`: currently used name in modern code/docs.
- `candidate`: proposed but not adopted yet.
- `rejected`: investigated and discarded.

## Entry Format

```text
ID:
Legacy Symbol:
Location:
Proposed Name:
Confidence:
Status:
Evidence:
Behavior Notes:
Modern Mapping:
Last Updated:
```

## Seed Entries

ID: SYM-0001
Legacy Symbol: `D_0198`
Location: `SRC/seg_0903.c`
Proposed Name: `ui_bitmap_files`
Confidence: high
Status: candidate
Evidence: string table includes `paper.bmp`, `newmagic.bmp`, `u6face0.bmp`, `stats.bmp`, `worldmap.bmp`
Behavior Notes: loaded in startup and UI drawing paths
Modern Mapping: pending
Last Updated: 2026-02-11

ID: SYM-0002
Legacy Symbol: `D_2A34`
Location: `SRC/seg_2FC1.c`
Proposed Name: `graphics_driver_files`
Confidence: high
Status: candidate
Evidence: table contains `U6MCGA.DRV`, `U6EGA.DRV`, `U6TANDY.DRV`, `U6CGA.DRV`
Behavior Notes: loaded during graphics init
Modern Mapping: modern renderer backend selection
Last Updated: 2026-02-11

ID: SYM-0003
Legacy Symbol: `D_296D`
Location: `SRC/seg_2F1A.c`
Proposed Name: `music_driver_files`
Confidence: high
Status: candidate
Evidence: table contains `U6ADLIB.DRV`, `U6CMS.DRV`, `U6TMUS.DRV`, `U6ROLAND.DRV`, `U6COVOX.DRV`, `U6INNOVA.DRV`
Behavior Notes: selected by audio config and loaded in `MUS_0A3A`
Modern Mapping: audio backend selection and compatibility layer
Last Updated: 2026-02-11

ID: SYM-0004
Legacy Symbol: `D_2C4A` block globals
Location: `SRC/D_2C4A.c`
Proposed Name: `world_state_globals`
Confidence: high
Status: active
Evidence: includes time/date, map coordinates, active party state, combat flag, quest state
Behavior Notes: serialized to `savegame\\objlist` tail region
Modern Mapping: `SimWorldState` in `modern/sim-core/include/sim_core.h`
Last Updated: 2026-02-11

ID: SYM-0005
Legacy Symbol: `Time_M`, `Time_H`, `Date_D`, `Date_M`, `Date_Y`
Location: `SRC/D_2C4A.c`
Proposed Name: `world_time_date`
Confidence: high
Status: active
Evidence: explicit minute/hour/day/month/year globals in `D_2C4A`
Behavior Notes: simulation clock fields that must serialize cleanly
Modern Mapping: `SimWorldState.time_m/time_h/date_d/date_m/date_y`
Last Updated: 2026-02-11

ID: SYM-0006
Legacy Symbol: `MapX`, `MapY`, `MapZ`
Location: `SRC/D_2C4A.c`
Proposed Name: `world_map_position`
Confidence: high
Status: active
Evidence: explicit globals for current world position and level
Behavior Notes: core movement/view state; required for save/load parity
Modern Mapping: `SimWorldState.map_x/map_y/map_z`
Last Updated: 2026-02-11

ID: SYM-0007
Legacy Symbol: `InCombat`, `SoundFlag`, `IsOnQuest`, `NextSleep`, `WindDir`, `Active`
Location: `SRC/D_2C4A.c`
Proposed Name: `world_runtime_flags`
Confidence: high
Status: active
Evidence: top-level world state globals in legacy source
Behavior Notes: combat mode and progression flags influence world behavior
Modern Mapping: `SimWorldState.in_combat/sound_enabled/is_on_quest/next_sleep/wind_dir/active`
Last Updated: 2026-02-11

ID: SYM-0008
Legacy Symbol: `savegame\\objlist` tail (`obj_2C4A..D_2CCB`)
Location: `SRC/seg_0C9C.c`, `SRC/D_2C4A.c`
Proposed Name: `objlist_world_tail`
Confidence: high
Status: active
Evidence: read/write tail size computed by `(char *)&D_2CCC - (char *)&obj_2C4A`, with fixed preceding reads in `C_0C9C_042A`/`C_0C9C_089F`
Behavior Notes: compatibility boundary for loading/persisting world-state globals
Modern Mapping: `u6_objlist` helpers and constants `U6_OBJLIST_TAIL_OFFSET`/`U6_OBJLIST_TAIL_SIZE`
Last Updated: 2026-02-11

ID: SYM-0009
Legacy Symbol: conversation/interaction handlers (function names pending)
Location: `SRC/seg_1703.c`, `SRC/seg_1944.c`
Proposed Name: `interaction_dispatch`
Confidence: medium
Status: candidate
Evidence: segments contain interaction-heavy gameplay branching and NPC-driven action handling surfaces.
Behavior Notes: expected to route talk/use/open-like actions through context and target checks.
Modern Mapping: `u6_interaction_apply` in `modern/sim-core/src/u6_interaction.c`
Last Updated: 2026-02-11

ID: SYM-0010
Legacy Symbol: dialogue/content lookup routines (function names pending)
Location: `SRC/seg_27a1.c`
Proposed Name: `dialogue_content_lookup`
Confidence: low
Status: candidate
Evidence: module map and string/content handling patterns suggest conversation text/content mediation.
Behavior Notes: likely downstream from interaction dispatch for talk flows.
Modern Mapping: pending (future M4.2+ dialogue bridge)
Last Updated: 2026-02-11

ID: SYM-0011
Legacy Symbol: intro/title executable resource path (`u.exe` + `intro.ptr` + `intro*.shp`)
Location: local original game binaries (outside released `u6-decompiled/SRC` set)
Proposed Name: `startup_intro_resource_pipeline`
Confidence: medium-high
Status: candidate
Evidence: `u.exe` references intro/title shape resources; released decompiled repository explicitly omits most other executables.
Behavior Notes: likely owns canonical title/startup menu presentation not directly visible in released `GAME.EXE` decompilation.
Modern Mapping: planned startup/title parity importer/renderer in `modern/client-web`
Last Updated: 2026-02-12
