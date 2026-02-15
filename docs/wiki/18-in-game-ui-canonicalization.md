# In-Game UI Canonicalization

This chapter documents the in-engine UI parity effort for the parchment/frame HUD area.

## Scope

Target area:

- right-side legacy HUD region inside the game frame
- verb strip and status/inventory/equipment interaction regions

Non-goal for this slice:

- fully populated gameplay data (party/inventory/equipment authority is still being bridged)

Goal:

- canonical sprite placement and hitbox behavior first, with temporary data stubs allowed.

## Canonical Source Anchors

- `legacy/u6-decompiled/SRC/seg_155D.c`
  - `C_155D_08F4`: equipment slot draw coordinates
  - `C_155D_0CF5`: inventory grid draw coordinates and slot semantics
  - `C_155D_1267`: inventory/portrait hitboxes
  - `C_155D_130E`: equipment hitboxes
- `legacy/u6-decompiled/SRC/seg_2FC1.c`
  - `C_2FC1_1EAF`: paperdoll/mannequin backdrop (`TIL_170..TIL_173`)
- `legacy/u6-decompiled/SRC/u6.h`
  - `SLOT_*` constants used for slot mapping

## Implemented In This Slice

### 1) Existing Frame Layer Is Canonical Rendering Target

Implementation is on the existing legacy frame path (`legacyBackdrop` HUD layer), not a separate overlay panel.

### 2) Canonical Slot Sprite Semantics

- empty slot tile: `TIL_19A` (`0x19a`)
- occupied slot background tile: `TIL_19B` (`0x19b`)
- item tile drawn on top when probe/runtime payload provides it

### 3) Canonical Paperdoll Backdrop

Drawn at canonical coordinates from `C_2FC1_1EAF(192,32)`:

- `0x170` at `(192,32)`
- `0x171` at `(208,32)`
- `0x172` at `(192,48)`
- `0x173` at `(208,48)`

### 4) Canonical Hitbox Interactivity

Mouse selection uses canonical regions:

- inventory + portrait: `C_155D_1267`
- equipment slots: `C_155D_130E`

Selections are surfaced in diagnostics and highlighted in-frame.

### 5) Deviation Mode (Explicit)

- `Shift+K`: hide/show legacy HUD layer to reveal more world map area.
- This is an explicit modern deviation and should remain documented as such.

## Removed As Non-Canonical

The following were removed from this effort:

- synthetic tab UI for status/inventory/party switching
- non-canonical “extra HUD overlay panel” as primary workflow
- mixed stub graphics that obscured canonical coordinate validation

## Current Controls (Relevant To This Slice)

- `Shift+J`: capture UI probe JSON (diagnostic artifact)
- `Shift+L`: toggle probe payload mode (`live` / `sample`)
- `Shift+K`: hide/show HUD layer (documented deviation)
- click right-side HUD cells for canonical hitbox checks

## Next Canonical Step

Replace payload stubs with real authoritative panel data:

1. map live `Party[]` + active index into HUD panel state
2. map live equipment slot occupancy via canonical slot semantics
3. map live inventory list ordering to canonical draw cells
4. keep coordinates/hitboxes unchanged while data authority improves
