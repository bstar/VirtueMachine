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

- `npm test`: top-level quality gate (`typecheck`, type-safety lint gates, broad TypeScript unit tests, UI fixture drift, legacy UI anchors, net contract wrapper)
- `npm run typecheck`: TypeScript project checks only
- `npm run lint:types`: explicit-`any` ban plus production escape-hatch ban for `as unknown as`, TypeScript suppressions, and eslint disable comments
- `npm run test:ts`: broad Node test runner over client-web and net TypeScript tests
- `npm run test:fixtures`: UI probe fixture drift check
- `npm run test:legacy-ui`: canonical legacy UI anchor check
- `npm run test:net-contracts`: net/sim-core bridge contract wrapper
- `npm run test:ci-required`: heavier CI gate wrapper for sim-core, parity, strict contracts, and focused client tools
- `npm run smoke:browser:movement`: optional Chrome/Chromium smoke against the local dev stack; validates the live `__vmGetUiProbe().canonical_runtime.movement` surface, drives repeated movement when a session starts, and requires active walk presentation plus landed position changes in strict mode
- `npm run release:check`: release checklist wrapper; runs `npm test`, `test:ci-required`, and strict browser movement smoke when the local web/net stack is running
- `modern/tools/ci_required_tests.sh`
- `modern/tools/release_check.sh`

Use `npm test` before claiming a broad quality/report-card improvement. Use the specialized
tools below to isolate a narrower suspected layer. Use `npm run test:ci-required` before
large merges or when touching shared render, sim-core, networking, or persistence surfaces.
Use `./modern/tools/release_check.sh --browser-smoke` after starting `dev_stack.sh` when
movement, input, startup, or browser-only behavior is in scope.

Module note: the repo intentionally contains both ESM-style TypeScript tests and CommonJS
server bridge modules. Do not set package-wide `"type": "module"` without first migrating the
CommonJS bridge/server files; the TypeScript test command suppresses Node's module-less warning
explicitly for readable TAP output.

Tools note: `tsconfig.tools.strict.json` currently covers release/probe tooling (`browser_movement_probe_smoke.ts`
and `generate_ui_probe_fixture.ts`). Older one-off migration/provenance scripts remain outside that
strict lane until they are converted from global scripts into typed modules.

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
