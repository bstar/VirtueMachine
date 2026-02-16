# Testing and Tooling Index

## Why Tooling Comes Before Theory

Parity confidence comes from repeatable probes, not memory.

These tools are the shortest path from "that looks wrong" to "here is the exact failing boundary."

## Asset and Baseline Tools

- `modern/tools/sync_assets.sh`: sync runtime assets + object baseline selection
- `modern/tools/extract_lzobjblk_savegame.ts`: decode canonical `lzobjblk` into mapped `objblk??`
- `modern/tools/compare_objblk_sets.sh`: diff two object-block baselines
- `modern/tools/validate_assets.sh`: required/optional asset preflight

Use these first when visual reports mention "shifted" or "stacked" static room decor.

## Baseline Profile Tools

- `modern/tools/import_baseline_profile.sh`
- `modern/tools/activate_baseline_profile.sh`
- `modern/tools/patch_baseline_profile.ts`

## Render/Parity Tests

- `modern/tools/test_client_web_render_composition.sh`
- `modern/client-web/tests/render_composition_fixtures.ts`

Use these when hover reports indicate source/insertion ordering anomalies.

## CI Gate

- `modern/tools/ci_required_tests.sh`

## Net/World Ops

- `modern/tools/reload_net_baseline.ts`
- `modern/tools/reset_world_save.sh`
- `modern/tools/hard_reset_world_state.sh`

Use these when code changes appear ignored by runtime state.

## Specialized Debug

- `modern/tools/probe_lb_bedroom.ts`
- `modern/tools/report_lb_bedroom.ts`
- `modern/tools/run_lb_profile_matrix.sh`

Use these when a specific room family (for example Lord British castle areas) has persistent local anomalies.

## Rule of Thumb

If a visual parity issue survives render code changes, run provenance tools before changing renderer logic again.

## Practical Triage Matrix

Symptom -> First Tool

- room objects one cell off in multiple locations -> `sync_assets.sh`, `compare_objblk_sets.sh`
- one room changed after restart only -> `reload_net_baseline.ts`, world delta inspection
- same code, different visual between machines -> baseline profile activation + provenance verification
- visually correct but interaction wrong -> sim-core replay/hash checks

This matrix keeps team effort pointed at the correct layer early.

## Player-Visible Impact

Strong tooling means:

- faster fixes with fewer regressions
- clearer triage between data, render, and network layers
- less time stuck in manual room-by-room retesting
