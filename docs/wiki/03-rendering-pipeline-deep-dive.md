# Rendering Pipeline Deep Dive

## Why The Pipeline Is This Strict

Ultima VI visuals are a layered illusion with hard ordering dependencies.

If base tiles, overlays, spill fragments, and entity layers are even slightly out of order, the scene stops reading as "Ultima VI" and starts reading as a glitch collage.

## Render Layers (Current)

1. Base map tiles (with blackout/corner/wall handling)
2. Background object tiles (BA-class behavior integrated into base where applicable)
3. Overlay object composition (main + spill fragments)
4. Actors/entities
5. Floor overlays and post passes

This ordering is not aesthetic preference. It encodes interaction expectations:

- what appears "on top" is often what players interpret as selectable or interactable
- what appears "below" is interpreted as floor/background context

## Critical Composition Functions

### Base Layer

- `buildBaseTileBuffersCurrent(...)` in `modern/client-web/app.js`
- applies map tile selection and selected object background substitution

### Overlay Layer

- `buildOverlayCellsModel(...)` in `modern/client-web/render_composition.js`
- consumes `objectsInWindowLegacyOrder(...)`
- applies legacy-like insertion behavior using `insertLegacyCellTile(...)`

This function boundary is where many parity bugs hide: source ordering may be correct while insertion precedence is subtly wrong.

### Source Window Rule

Legacy parity requirement:

- source scan includes one extra right/bottom source row/column (`viewW + 1`, `viewH + 1`)
- required so spill-left/spill-up fragments from off-edge anchors appear in view

## Spill Semantics

Driven by tile flags:

- horizontal spill (`0x80`): render `tile-1` at left cell
- vertical spill (`0x40`): render `tile-1` or `tile-2` upward depending on horizontal bit
- corner spill (`0x40 + 0x80`): render `tile-3` up-left

Legacy anchor: `C_1184_35EA` in `legacy/u6-decompiled/SRC/seg_1184.c`.

## Visibility Suppression

Modern path suppresses overlays sourced from hidden cells to prevent hidden-room decor leaking into visible cells.

This is parity-sensitive and must remain test-backed.

## Bench/Table Failure Archetype

Symptom pattern:

- movable inventory-class objects appear one cell right
- endpoint stacks pile up
- background/support object appears to "flip" when an item is introduced

Root causes usually fall into one of three buckets:

1. wrong baseline source block mapping
2. same-cell tie behavior mismatch in insertion order
3. incorrect treatment of legacy obscurity/background overlays

All three can produce nearly identical screenshots, so diagnosis must use hover/parity reports, not visual guessing.

## Why “Looks Similar” Is Not Enough

Render correctness requires all of these simultaneously:

- correct object source dataset
- correct source scan window
- correct object order stream
- correct insertion behavior within each destination cell
- correct spill computation from tile flags

Any one mismatch causes table/bench/door artifacts that look like random one-cell shifts.

## Player-Visible Impact

Getting this right affects:

- whether props sit on surfaces or under them
- whether double-size art tears at viewport edges
- whether walls/doors feel stable while moving

This is where "it looks off" becomes actionable engineering.

## Deep Debug Checklist (Render Layer)

For a single problematic cell:

1. capture hover report for target cell and left/up neighbors
2. record `overlay[]` with `sourceX/sourceY/sourceType`
3. compare with expected legacy anchor behavior
4. verify same-cell object order indices and tile flags (`0x40`, `0x80`)
5. only then adjust insertion or source-window logic

This avoids misdiagnosing provenance bugs as renderer bugs.
