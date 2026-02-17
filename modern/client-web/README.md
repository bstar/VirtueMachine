# VirtueMachine Client-Web (M3.4)

Minimal browser client prototype:

- fixed-tick runtime loop
- command-envelope-driven movement input (arrow keys primary, legacy fallbacks kept)
- deterministic world clock/date progression in HUD
- state hash display for replay/debug tracking
- replay stability check (`V`) with downloadable checkpoint CSV
- visible tile viewport (11x11)
- 10 switchable nostalgia UI themes (saved in browser `localStorage`)
- 5 switchable interface layout variants (saved in browser `localStorage`)
- optional self-hosted retro fonts (`modern/client-web/fonts/README.md`)
- viewport tile grid toggle (off by default; saved in browser `localStorage`)
- overlay debug labels toggle (off by default; saved in browser `localStorage`)
- net backend panel for login/password recovery and remote save/load snapshot flow
- account rename flow (authenticated username change with current password)
- live multiplayer presence preview (multiple tabs/users visible in world view)
- server-authoritative clock sync (authenticated clients poll net clock for tick/time/date)
- critical-item maintenance controls (manual run + optional auto cadence)
- runtime asset-backed map/chunk tile reads with synthetic fallback
- static object overlay layer for expanded world props (doors, beds, throne, desks, fireplaces, shelves, tables, food)
- first-pass legacy entity/NPC overlay layer from `savegame/objlist` actor records
- deterministic tick-driven NPC patrol motion pilot for humanoid actor subset
- control mode switch: `Ghost` (free movement) vs `Avatar` (collision + interaction)
- avatar interaction states: standing/sitting/sleeping
- NPC contextual sit/sleep pose rendering when on chair/bed cells
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

`sync_assets.sh` now prefers canonical world object files from the source root
(`objblk??`/`objlist`) and only falls back to `savegame/`. This avoids ingesting
player-mutated save-state placement drift by default.

If missing/unavailable, it renders a deterministic synthetic fallback grid.

## Controls

- `Arrow Keys`: queue movement commands
- `W/A/S/D`: movement fallback
- Legacy command keys recognized: `A C T L G D M U R B I` (target verbs enter targeting mode)
- Implemented target verbs (first pass): `L` Look, `T` Talk, `G` Get, `U` Use
- `U`: legacy-style Use target mode in avatar mode
- `Arrow Keys` while Use cursor is active: move interaction box
- `Enter`/`U` while Use cursor is active: interact at box location
- `Esc` while Use cursor is active: cancel Use cursor
- `0-9`: legacy party selection keys (mapped; party command flow pending)
- `Ctrl+S`: save world snapshot
- `Ctrl+R`: load world snapshot
- `Ctrl+Z`: sound toggle flag
- `Ctrl+H`: help panel toggle
- `Ctrl+V`: version banner (stub)
- `Shift+I`: net login using panel credentials
- `Shift+Y`: save current sim snapshot to net backend
- `Shift+U`: load current character snapshot from net backend
- `Shift+J`: capture live UI probe contract to `window.__vmLastUiProbe`
- `Shift+K`: hide/show legacy HUD layer on parchment frame (deviation mode toggle)
- `Shift+L`: toggle canonical UI probe mode (`live`/`sample`) for HUD payload stubs
- `Shift+N`: run critical-item maintenance now
- `Shift+G`: jump to selected canonical capture preset
- `Shift+P`: capture viewport PNG
- `Shift+Alt+P`: capture world+HUD PNG
- `Shift+O/F/B/M/R/V`: debug overlay/animation/palette/mode/reset/replay controls
- `Shift+C`: copy hover parity report to clipboard

Legacy HUD interaction notes:

- right-side parchment HUD clicks use legacy status hitboxes from:
  - `C_155D_1267` (inventory + portrait selection)
  - `C_155D_130E` (equipment slot selection)
  - when authenticated, report now appends `server_obj[...]` rows from `/api/world/objects` for the hovered cell using footprint projection (`fp=...`)

Useful parity presets:

- `Animation Test Fire (360,397,0)` for palette-cycle validation
- `Animation Test Wheels (307,384,0)` for tile-remap animation validation

## Determinism Fixtures

Run deterministic client composition fixtures:

```bash
./modern/tools/test_client_web_render_composition.sh
./modern/tools/test_client_web_ui_inventory_paperdoll.sh
```

Run the canonical UI parity workflow (legacy anchors + probe contracts + deterministic fixture verification):

```bash
./modern/tools/run_ui_parity_workflow.sh --verify
```

## Layout Variants

- `Classic Right Rail`
- `Classic Left Rail`
- `Ledger Split Panel`
- `Ledger Compact Console`
- `Ledger Focus Board`
