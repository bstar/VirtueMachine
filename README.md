# VirtueMachine

VirtueMachine is a canonical-fidelity Ultima VI engine project with a modern web runtime.

At a high level, this project is trying to do two things at once:

- preserve original Ultima VI gameplay semantics (rendering, interaction, world behavior),
- modernize architecture so the game is deterministic, inspectable, and eventually MMO-capable.

This is not a “quick remake” and not a generic UI modernization pass.  
The core direction is fidelity-first engineering with explicit documentation for every material behavior decision.

## What This Project Is

- A source-driven implementation that anchors behavior to decompiled legacy code plus original game data.
- A tooling-heavy parity program with hover reports, replay checks, and diagnostics to avoid guesswork.
- A modern codebase (`sim-core`, `client-web`, `net`) designed for testing, persistence, and future multiplayer.
- A project that intentionally keeps the smaller framed classic visual presentation instead of replacing it with a modern HUD.

## What This Project Is Not

- Not a visual “close enough” port.
- Not a finished MMO today.
- Not a replacement for projects that prioritize broader interface modernization.

If you want a more modernized presentation layer today, projects like Nuvie/ScummVM and **Ultima VI Online** are often better immediate fits.  
Ultima VI Online is a major inspiration here, and the team behind it are the real heroes for achieving a similar feat decades earlier.

## Current Status (Short Version)

- Navigation-only single-player slice is in place (world traversal and rendering baseline).
- Rendering/interaction parity work is active and ongoing.
- Server-backed persistence and realtime sync foundations are implemented.
- MMO-direction design exists, but full multiplayer product scope is still evolving.

## Layout

- `legacy/u6-decompiled/`: decompiled source mirror (read-only baseline)
- `docs/`: architecture, findings, and development plan
- `modern/`: all new implementation code and tooling

## Macro Milestones

Status legend: `complete`, `in progress`, `next`.

Completed:

- `M0` Documentation Foundation (`complete`)
- `M1` Deterministic Runtime Skeleton (`complete`)

In progress:

- `M2` World State and Persistence Slice (`in progress`)
  - done: deterministic world state bootstrap, map/chunk read compatibility, persistence envelope baseline
  - pending: shared authority-boundary cleanup and migration of remaining client-owned state logic
- `M3` Playable Single-Player Vertical Slice (`in progress`, navigation-only so far)
  - done: deterministic walkaround loop, web client shell, runtime asset validation diagnostics
  - pending: object interaction, inventory/equipment, NPC dialogue, party management, quests, magic, combat, NPC pathing/schedules, day/night cycle, dungeons, boats/vehicles, music, SFX
- `M4` Gameplay Parity Expansion (`in progress`)
  - done: static object layer ingest, animated tile phase control, baseline interaction wiring, blackout/wall/corner parity stabilization
  - pending: deeper gameplay parity coverage and deterministic regression expansion across critical scenarios
  - gating policy: panel-heavy mechanics are gated behind UI parity harness slices (inventory/paperdoll/party/log)

Next:

- `R1-R4` Rendering Layer Parity plan (`next`, current 90-day execution focus)
- `R5` Startup/Menu parity (`next`, implementation landed; screenshot-pair validation pending)
- `R6` Legacy cursor parity (`next`, implementation landed; mode mapping polish pending)
- `M5` Multiplayer Prototype (`next`, after rendering parity stabilization)

## Next Ambitious Slices (Digestible)

These slices are intentionally larger than prior micro-fixes, but each remains testable and bounded.

1. `U0` Deterministic UI Parity Mode
- fixed-frame capture mode + scripted panel states
- one-command probe workflow (capture+diff optional): `./modern/tools/run_ui_parity_workflow.sh`
- deterministic sample fixture guard: `modern/client-web/tests/fixtures/ui_probe.sample.json`
2. `U1` Inventory + Paperdoll Harness
- slot/hitbox probes
- drag/drop/equip regression probes + legacy-code-backed assertions
  - baseline harness now implemented (`modern/client-web/ui/inventory_paperdoll_layout_runtime.ts`, `modern/client-web/tests/ui_inventory_paperdoll_layout_test.ts`)
3. `U2` Paperdoll + Equipment Harness (complete)
- canonical equip overlap semantics (`SLOT_2HND`/`SLOT_RING`) extracted to shared runtime
- deterministic equipment-resolution probes + CI gating
4. `U3/U4` Party + Message Log Harness (complete)
- party ordering/selection semantics
- party digit-key selection resolution wired and test-gated
- message window projection, scrollback boundary commands, and persistence roundtrip probes implemented/test-gated
5. `U5` Panel Scope Partition (complete)
- explicit `canonical_ui` vs `modern_ui` classification contract
- CI/parity guard rejects unclassified panel-surface drift
6. `U6` Canonical Target Resolver (complete)
- authoritative object target selection in sim-core for overlap cells
- deterministic overlap/talk target harness and CI gate implemented
7. `U7` Mechanics Rollout On Harness
- NPC dialogue, quests, combat, magic, schedules, vehicles, dungeons
- each mechanic must ship with panel and replay regression coverage
8. `U8` Story Gate Compatibility Bridge (deferred)
- add canonical progression gate keys for early LB intro/battle sequencing
- no story-flow implementation until combat/script compatibility slices are complete

Note: when canonical screenshot references are not yet available for a panel, acceptance is based on legacy-code-derived behavior contracts and deterministic probe output first.

For the live, mutable checklist and current slice-by-slice status, see:

- `docs/progress.md`

## Architecture Wiki (Current)

The technical wiki now includes deeper architecture coverage, interactive references, and diagram-backed deep dives:

- Wiki app: `docs/wiki/index.html`
- Wiki home/TOC: `docs/wiki/README.md`
- Render pipeline deep dive + flow diagram: `docs/wiki/03-rendering-pipeline-deep-dive.md`
- API/UI realtime sync deep dive + topology/sequence diagrams: `docs/wiki/14-api-ui-realtime-sync.md`
- OpenAPI-style endpoint reference (human-readable): `docs/wiki/15-api-endpoint-reference.md`
- UI canonical legacy matrix for panel-parity work: `docs/wiki/17-ui-canonical-legacy-matrix.md`

UI integration:

- In the web client header, `Wiki` is linked next to `VIRTUE MACHINE`.
- Wiki theme follows the debug-panel theme selection.

## Legacy Source Provenance

The legacy submodule tracks the original decompiled project:

- `https://github.com/ergonomy-joe/u6-decompiled`

Keep this source immutable in day-to-day work and implement all new behavior under `modern/`.

The exact legacy revision is pinned by this repository commit (git submodule commit SHA), so contributors get reproducible source snapshots.

Quick check:

```bash
git submodule status
```

## Workflow

1. Analyze legacy behavior in `legacy/u6-decompiled/SRC/`.
2. Record findings and symbol meaning in `docs/`.
3. Implement modern systems only under `modern/`.
4. Run policy checks to ensure legacy remains pristine.

## Nix Development Shell

This repo includes a Nix flake for reproducible tooling.

```bash
nix develop
```

Included tools: `clang`, `cmake`, `ninja`, `pkg-config`, `python3`, `nodejs`, `ripgrep`, shell tooling.

Build and run the first `sim-core` test:

```bash
nix develop
cmake -S . -B build -G Ninja
cmake --build build
ctest --test-dir build --output-on-failure
```

Or run the one-command local test script:

```bash
./modern/tools/test.sh
```

Run the CI-required deterministic gate locally:

```bash
./modern/tools/ci_required_tests.sh
```

Generate replay/hash artifact files locally (same pack produced in CI):

```bash
./modern/tools/generate_replay_pack.sh
```

Run the first web rendering prototype:

```bash
./modern/tools/dev_web.sh
```

Run full frontend+backend dev stack in one process (with Vite hot reload on frontend):

```bash
bun run dev
```

Direct script form (equivalent):

```bash
./modern/tools/dev_stack.sh
```

Set up Bun/Vite/TypeScript toolchain for the gradual migration lane:

```bash
bun install
bun run typecheck
```

## Progress Snapshot

R1 canonical parity captures (web renderer):

- Throne room static composition (`307,347,0`)
- Fire palette-cycling composition (`360,397,0`)
- Wheel tile-remap animation composition (`307,384,0`)

Recently landed:

- R5 startup/title in-engine flow using decoded legacy assets (`titles.shp`, `mainmenu.shp`) with palette-highlight menu behavior.
- Journey-only startup action with direct throne-room entry and `Q` return-to-title path.
- R6 legacy cursor integration (`u6mcga.ptr`) rendered in-engine across title/game views with layer-aware placement.
- Expanded architecture wiki with:
  - API/UI realtime sync flow documentation and generated diagrams
  - render-pipeline diagram embedded in the render deep dive
  - full endpoint reference page documenting live net API semantics

Latest screenshot:

![Latest VirtueMachine screenshot](docs/images/latest-screenshot-2026-02-14-15-42-36.png)

If commands fail due to sandbox restrictions in assistant-driven sessions, follow:

- `docs/policies/sandbox-escalation-policy.md`

## Assets (Untracked)

This repository does **not** include Ultima VI game data/assets.

No copyrighted Origin/EA game files, art, audio, or binaries are distributed here.
The repo includes only:

- engine/source code,
- docs/tooling,
- asset manifests and import scripts.

To run VirtueMachine, you must provide your own legal copy of the game files from an external source directory.

Keep those files outside git (or under ignored local paths). Do not commit proprietary assets.

### Required vs Optional Asset Sets

Required runtime list:

- `modern/assets/manifest.required.txt`

Optional enhancements list:

- `modern/assets/manifest.optional.txt`

`sync_assets.sh` enforces required assets and warns on optional ones.

Sync required files into the local runtime assets folder:

```bash
./modern/tools/sync_assets.sh ~/projects/ULTIMA6/ultima6
```

Defaults:

- Source: `../ultima6` (relative to repo root) unless `U6_ASSET_SRC` is set.
- Destination: `modern/assets/runtime` unless `U6_ASSET_DEST` is set.
- Savegame object files (`savegame/objblk??`, `savegame/objlist`) are copied to:
  - `modern/assets/runtime/savegame` (runtime compatibility)
  - `modern/assets/pristine/savegame` (immutable baseline for render/net parity)

World-object baseline source behavior:

- Preferred: canonical root `objblk??` + `objlist` in your asset source.
- Fallback: `lzobjblk` extraction path.
- Last resort: `savegame/objblk??` + `savegame/objlist` (can reflect altered world state).

If savegame-derived object blocks are used, parity results may differ from pristine baseline expectations.

### Copyright and Distribution Policy

- This repo intentionally avoids shipping copyrighted game assets.
- You are responsible for supplying and using game data in accordance with applicable rights/law.
- Pull requests/issues should not attach proprietary asset blobs.

Baseline tooling:

- `./modern/tools/import_baseline_profile.sh <profile_name> /path/to/ultima6 --activate`
- `./modern/tools/activate_baseline_profile.sh <profile_name> --reload-net`
- `./modern/tools/check_lb_bedroom.sh`
