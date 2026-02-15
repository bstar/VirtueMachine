---
name: in-game-ui-canonical
description: Use this skill for any in-engine HUD/UI work inside the Ultima VI frame (portrait, equipment, inventory, verb/status regions). Enforces canonical sprite placement and interaction behavior from legacy decompiled routines; allows data stubs only when authority bridges are missing.
---

# In-Game UI Canonical Skill

Use this skill when modifying the parchment/frame HUD area in the game engine.

## Non-Negotiables

1. Canonical coordinates/hitboxes come first.
2. Do not introduce ad hoc UI abstractions (tabs, modern panel metaphors) unless explicitly approved as a documented deviation.
3. Data can be stubbed temporarily, but visual placement and interactions must follow legacy routines.
4. Any deviation must be explicit in docs/wiki and marked as deviation mode.

## Canonical Anchors

- `legacy/u6-decompiled/SRC/seg_155D.c`
  - `C_155D_08F4` (equipment draw positions)
  - `C_155D_0CF5` (inventory draw positions)
  - `C_155D_1267` (inventory/portrait hitboxes)
  - `C_155D_130E` (equipment hitboxes)
- `legacy/u6-decompiled/SRC/seg_2FC1.c`
  - `C_2FC1_1EAF` (paperdoll backdrop tiles)
- `legacy/u6-decompiled/SRC/u6.h`
  - `SLOT_*` constants

## Required Workflow

1. Identify target UI behavior and map it to exact legacy routine(s).
2. Implement only on the existing in-engine frame/HUD layer (not a detached debug panel).
3. Preserve canonical coordinates/hitboxes; only payload data source may vary.
4. Add/adjust tests when feasible (`modern/client-web/tests/ui_probe_contract_test.mjs` and `modern/tools/test.sh` gate).
5. Update docs:
   - `docs/wiki/18-in-game-ui-canonicalization.md`
   - `docs/wiki/08-deviation-ledger.md` (if deviating)

## Canonical Sprite Rules

- Empty slot cell: `TIL_19A` (`0x19a`)
- Occupied slot background: `TIL_19B` (`0x19b`)
- Paperdoll backdrop: `TIL_170..173` at canonical positions from `C_2FC1_1EAF`

## Deviation Policy

Allowed only if explicitly requested and documented:

- hide/show HUD layer to expose more world map area

Not allowed without explicit sign-off:

- replacing canonical interaction flow with invented UI navigation metaphors
- moving canonical HUD content into unrelated modern side panels

## Quick Validation

- Run: `bash modern/tools/test.sh`
- In-game check:
  - verify right-side HUD cell placement and hitboxes
  - verify selection feedback maps to legacy regions
  - verify any deviation toggle is explicitly labeled
