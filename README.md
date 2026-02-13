# VirtueMachine

VirtueMachine is a modern browser-port workspace for Ultima VI, with legacy provenance preserved via read-only submodule.

## Layout

- `legacy/u6-decompiled/`: decompiled source mirror (read-only baseline)
- `docs/`: architecture, findings, and development plan
- `modern/`: all new implementation code and tooling

## Macro Milestones

Status legend: `complete`, `in progress`, `next`.

Completed:

- `M0` Documentation Foundation (`complete`)
- `M1` Deterministic Runtime Skeleton (`complete`)
- `M3` Playable Single-Player Vertical Slice (`complete`)

In progress:

- `M2` World State and Persistence Slice (`in progress`)
- `M4` Gameplay Parity Expansion (`in progress`)

Next:

- `R1-R4` Rendering Layer Parity plan (`next`, current 90-day execution focus)
- `R5` Startup/Menu parity (`next`, implementation landed; screenshot-pair validation pending)
- `R6` Legacy cursor parity (`next`, implementation landed; mode mapping polish pending)
- `M5` Multiplayer Prototype (`next`, after rendering parity stabilization)

For the live, mutable checklist and current slice-by-slice status, see:

- `docs/progress.md`

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

## Progress Snapshot

R1 canonical parity captures (web renderer):

- Throne room static composition (`307,347,0`)
- Fire palette-cycling composition (`360,397,0`)
- Wheel tile-remap animation composition (`307,384,0`)

Recently landed:

- R5 startup/title in-engine flow using decoded legacy assets (`titles.shp`, `mainmenu.shp`) with palette-highlight menu behavior.
- Journey-only startup action with direct throne-room entry and `Q` return-to-title path.
- R6 legacy cursor integration (`u6mcga.ptr`) rendered in-engine across title/game views with layer-aware placement.
If commands fail due to sandbox restrictions in assistant-driven sessions, follow:

- `docs/policies/sandbox-escalation-policy.md`

## Assets (Untracked)

Original game assets are not committed. Keep them outside the repo (or under ignored `local/`).

Sync required files into the local runtime assets folder:

```bash
./modern/tools/sync_assets.sh /home/bstar/projects/ULTIMA6/ultima6
```

Defaults:

- Source: `../ultima6` (relative to repo root) unless `U6_ASSET_SRC` is set.
- Destination: `modern/assets/runtime` unless `U6_ASSET_DEST` is set.
- Savegame object files (`savegame/objblk??`, `savegame/objlist`) are copied to:
  - `modern/assets/runtime/savegame` (runtime compatibility)
  - `modern/assets/pristine/savegame` (immutable baseline for render/net parity)

Baseline tooling:

- `./modern/tools/import_baseline_profile.sh <profile_name> /path/to/ultima6 --activate`
- `./modern/tools/activate_baseline_profile.sh <profile_name> --reload-net`
- `./modern/tools/check_lb_bedroom.sh`
