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
Status: candidate
Evidence: includes time/date, map coordinates, active party state, combat flag, quest state
Behavior Notes: serialized to `savegame\\objlist` tail region
Modern Mapping: `sim-core` authoritative world state struct
Last Updated: 2026-02-11
