# VirtueMachine Client-Web (M3.4)

Minimal browser client prototype:

- fixed-tick runtime loop
- command-envelope-driven movement input (`W/A/S/D` + `H/J/K/L`)
- deterministic world clock/date progression in HUD
- state hash display for replay/debug tracking
- replay stability check (`V`) with downloadable checkpoint CSV
- visible tile viewport (11x11)
- 10 switchable nostalgia UI themes (saved in browser `localStorage`)
- 5 switchable interface layout variants (saved in browser `localStorage`)
- optional self-hosted retro fonts (`modern/client-web/fonts/README.md`)
- viewport tile grid toggle (off by default; saved in browser `localStorage`)
- overlay debug labels toggle (off by default; saved in browser `localStorage`)
- runtime asset-backed map/chunk tile reads with synthetic fallback
- static object overlay layer for expanded world props (doors, beds, throne, desks, fireplaces, shelves, tables, food)
- first-pass legacy entity/NPC overlay layer from `savegame/objlist` actor records
- deterministic tick-driven NPC patrol motion pilot for humanoid actor subset
- control mode switch: `Ghost` (free movement) vs `Avatar` (collision + door interaction)
- deterministic `sim.tick`-driven `animdata` tile animation (water/swamp and other animated sets)
- legacy VGA palette-cycle animation for fire/water hues (deterministic, tick-driven)
- animation freeze toggle for render/occlusion debugging (`F` or UI dropdown)
- renderer debug stats for palette phase and center tile palette-band inspection
- renderer parity stat for actor-vs-occluder ordering checks (`Render Parity`)
- first-pass legacy visibility/blackout mask (room-dependent wall/corner behavior)
- canonical capture presets + one-click viewport PNG export for parity screenshot workflow
  - includes `Lord British Throne (307,347,0)` preset for throne composition validation
- deterministic composition fixture tests (corner spill ordering, occlusion parity, transparency edge cases)

## Run

From repository root:

```bash
./modern/tools/dev_web.sh
```

The dev server is allowlisted and does not expose general filesystem browsing.
Served paths are limited to:

- `/modern/client-web/*`
- `/modern/assets/runtime/*`

Then open:

- `http://localhost:8080/modern/client-web/`

The client will try loading:

- `modern/assets/runtime/map`
- `modern/assets/runtime/chunks`
- `modern/assets/runtime/u6pal`
- `modern/assets/runtime/tileflag`
- `modern/assets/runtime/animdata`

For bitmap tile rendering path (optional, if present):

- `modern/assets/runtime/tileindx.vga`
- `modern/assets/runtime/masktype.vga`
- `modern/assets/runtime/maptiles.vga`
- `modern/assets/runtime/objtiles.vga`

For static world object overlays (optional, if present):

- `modern/assets/runtime/basetile`
- `modern/assets/runtime/savegame/objblk??`
- `modern/assets/runtime/savegame/objlist`

If missing/unavailable, it renders a deterministic synthetic fallback grid.

## Controls

- `W/A/S/D` or `H/J/K/L`: queue movement commands
- `M`: toggle control mode (ghost/avatar)
- `E`: interact with facing door (avatar mode)
- `R`: reset run state to initial seed/world
- `O`: toggle overlay debug tile labels
- `F`: toggle animated tile freeze/live phase
- `B`: toggle legacy palette FX (fire/water color cycling)
- `G`: jump to selected canonical capture preset
- `P`: capture viewport PNG
- `V`: run replay determinism verification (sim + animation checkpoints) and produce downloadable checkpoints CSV

Useful parity presets:

- `Animation Test Fire (360,397,0)` for palette-cycle validation
- `Animation Test Wheels (307,384,0)` for tile-remap animation validation

## Determinism Fixtures

Run deterministic client composition fixtures:

```bash
./modern/tools/test_client_web_render_composition.sh
```

## Layout Variants

- `Classic Right Rail`
- `Classic Left Rail`
- `Ledger Split Panel`
- `Ledger Compact Console`
- `Ledger Focus Board`
