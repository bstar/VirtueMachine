# VirtueMachine Client-Web (M3.4)

Minimal browser client prototype:

- fixed-tick runtime loop
- command-envelope-driven movement input (`W/A/S/D`)
- deterministic world clock/date progression in HUD
- state hash display for replay/debug tracking
- replay stability check (`V`) with downloadable checkpoint CSV
- visible tile viewport (11x11)
- 10 switchable nostalgia UI themes (saved in browser `localStorage`)
- 5 switchable interface layout variants (saved in browser `localStorage`)
- optional self-hosted retro fonts (`modern/client-web/fonts/README.md`)
- runtime asset-backed map/chunk tile reads with synthetic fallback

## Run

From repository root:

```bash
./modern/tools/dev_web.sh
```

Then open:

- `http://localhost:8080/modern/client-web/`

The client will try loading:

- `modern/assets/runtime/map`
- `modern/assets/runtime/chunks`
- `modern/assets/runtime/u6pal`
- `modern/assets/runtime/tileflag`

For bitmap tile rendering path (optional, if present):

- `modern/assets/runtime/tileindx.vga`
- `modern/assets/runtime/masktype.vga`
- `modern/assets/runtime/maptiles.vga`
- `modern/assets/runtime/objtiles.vga`

If missing/unavailable, it renders a deterministic synthetic fallback grid.

## Controls

- `W/A/S/D`: queue movement commands
- `R`: reset run state to initial seed/world
- `V`: run replay determinism verification for current command log and produce downloadable checkpoints CSV

## Layout Variants

- `Classic Right Rail`
- `Classic Left Rail`
- `Ledger Split Panel`
- `Ledger Compact Console`
- `Ledger Focus Board`
