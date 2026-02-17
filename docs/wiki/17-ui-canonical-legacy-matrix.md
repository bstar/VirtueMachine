# UI Canonical Legacy Matrix

This chapter is the start of the UI parity slice using legacy code as canonical reference, not screenshot matching.

## Why This Exists

We are now gating panel-heavy gameplay systems on evidence from legacy routines:

- inventory and paperdoll behavior
- party switching and command context
- message/talk flow
- selection/target semantics tied to panel actions

Without this matrix, UI work drifts into visual tweaks that fail when mechanics are added.

## Canonical Anchor Files

Primary anchor set:

- `legacy/u6-decompiled/SRC/seg_0A33.c`
- `legacy/u6-decompiled/SRC/seg_27a1.c`
- `legacy/u6-decompiled/SRC/seg_2FC1.c`
- `legacy/u6-decompiled/SRC/seg_155D.c`
- `legacy/u6-decompiled/SRC/D_2C4A.h`
- `legacy/u6-decompiled/SRC/tile.h`

Supporting references:

- `legacy/scummvm/engines/ultima/nuvie` (education/comparison only)
- `legacy/ultima-vi-online` (education/comparison only)

## Routine Families And What They Control

### 1) Command Loop, Party Mode, Talk Dispatch

Anchor routines/signals from `seg_0A33.c`:

- `SetPartyMode()`
- `PartyModeMsg`
- numeric key dispatch (`'0'..'9'`) for party/control context
- `CMD_83` talk path and `TALK_talkTo(...)`

Gameplay effect:

- decides whether player input is avatar-centric or party-command-centric.
- controls which actor is "active" for panel actions and interaction verbs.

### 2) Inventory/Equipment/Portrait Panel Pipeline

Anchor routines/signals from `seg_27a1.c`:

- comment anchor: `display character's portrait/inventory`
- draw calls:
  - `C_2FC1_1EAF(...); /*draw equipment*/`
  - `C_155D_08F4(...); /*draw inventory*/`
- equipment slot resolution: `STAT_GetEquipSlot(...)`
- equip/unequip mutation: `InsertObj(..., EQUIP)`, slot-clearing paths
- burden checks: `WeightInven`, `WeightEquip` flow

Gameplay effect:

- determines who owns an item, where it appears, whether equip is valid, and when moves are blocked.

### 3) Selection/Object Transfer Glue

Anchor routines/signals:

- `Selection.obj` handling
- transfer helpers (`C_155D_1666`, `C_155D_16E7`)
- coord-use checks (`GetCoordUse(...)`) for `LOCXYZ`/`CONTAINED`/`INVEN`/`EQUIP`

Gameplay effect:

- governs "what item did I actually act on" and "where did it end up" after panel interactions.

### 4) UI Frame/Cursor/Tile Semantics

Anchor signals from `seg_0A33.c` + `tile.h`:

- mouse cursor and mode-linked pointer tiles
- button/cursor tile definitions (`Button party`, equip cursor variants)

Gameplay effect:

- cursor mode must match command state; wrong mapping leads to invalid target expectations and desync in user intent.

## Extractor And Regression Guard

Tooling added in this slice:

- extractor: `modern/tools/extract_legacy_ui_anchors.sh`
- guard test: `modern/tools/test_legacy_ui_anchors.sh`
- probe contract module: `modern/client-web/ui_probe_contract.ts`
- probe regression test: `modern/client-web/tests/ui_probe_contract_test.ts`
- inventory/paperdoll layout runtime: `modern/client-web/ui/inventory_paperdoll_layout_runtime.ts`
- inventory/paperdoll layout regression test: `modern/client-web/tests/ui_inventory_paperdoll_layout_test.ts`

Purpose:

- keep canonical anchor discovery reproducible;
- prevent drift where UI parity work proceeds without legacy-symbol evidence.
- provide deterministic panel JSON artifacts (sample + live runtime modes).

## Canonical Test Avatar Process

The probe contract now includes a canonical avatar source process:

1. read `world.active` as active party index
2. resolve avatar object from `Party[active]`
3. fallback to `Party[0]` when active index is invalid

This is encoded in `createCanonicalTestAvatar(...)` and surfaced in `canonical_ui.avatar_panel`.

In-game verification hook:

- `Shift+J` captures a live UI probe contract
- output is available as `window.__vmLastUiProbe` and digest in `window.__vmLastUiProbeDigest`

## U0 Entry Criteria (Completed)

U0 is considered active when all are true:

1. canonical routine anchors are documented and machine-extractable (`complete`)
2. probe schema for panel-state evidence exists (`complete`)
3. deterministic sample-state generator exists (`complete`)
4. CI gate blocks panel work that bypasses probe contracts (`complete`)

## U1 Status (Completed)

- slot/hitbox geometry and hit-testing now share one canonical layout runtime used by both renderer and click-selection flow
- probe contract now emits inventory/paperdoll hitboxes and deterministic inventory<->equip probe-count signals
- anchor guard now explicitly checks `C_155D_1267`, `C_155D_130E`, and `C_155D_0CF5`

## Deviations And Constraints

- If modern UI behavior differs, the reason must be logged in `docs/wiki/08-deviation-ledger.md`.
- Account/login/recovery UX stays `modern_ui`; gameplay panels stay `canonical_ui`.
- We do not treat Nuvie/U6O behavior as canonical override of decompiled/source-data evidence.

## Next Implementation Slice (Follow-On)

1. keep deterministic fixture workflow green (`modern/tools/run_ui_parity_workflow.sh`)
2. expand canonical panel fixtures beyond the current sample baseline
3. add per-panel interaction fixtures tied to mechanics rollouts
4. only then begin mechanic rollouts that depend on those panels
