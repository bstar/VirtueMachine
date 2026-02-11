# Ultima6 Modern

Modern browser-port workspace for Ultima VI, with legacy provenance preserved via read-only submodule.

## Layout

- `legacy/u6-decompiled/`: decompiled source mirror (read-only baseline)
- `docs/`: architecture, findings, and development plan
- `modern/`: all new implementation code and tooling

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
