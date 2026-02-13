---
name: nuvie-parity-docs
description: Use this skill when validating VirtueMachine rendering or interaction parity against Ultima VI Nuvie/ScummVM behavior, including provenance checks, coordinate-level evidence, and compatibility documentation updates.
---

# Nuvie Parity Docs

Use this workflow for parity investigations where behavior looks wrong but should be verified against legacy/Nuvie evidence before changing runtime code.

## Canonical Source Policy

- Canonical upstream for Nuvie behavior is `scummvm/scummvm` under `engines/ultima/nuvie`.
- Standalone `nuvie/nuvie` is historical context only and must not override ScummVM parity evidence.
- Always verify source freshness before deep parity work (latest commit date for ScummVM Nuvie path).
- Critical references live in `references/canonical-sources.md`.

## Scope

- Rendering parity (tile/object placement, layering, visibility/blackout, door thresholds).
- Interaction parity (verb targeting, movement boundaries, cursor behavior).
- Asset provenance parity (pristine baseline vs save-derived drift).

## Workflow

1. Confirm current runtime asset provenance.
2. Capture coordinate-level evidence in VirtueMachine.
3. Compare against legacy code and Nuvie/ScummVM references.
4. Classify issue source.
5. Update parity docs with evidence and decision.

## Step 1: Provenance Check

- Run `./modern/tools/sync_assets.sh` and record `World object source`.
- If source is `.../savegame`, treat placement drift as possible data-state issue.
- Prefer canonical root `objblk??/objlist` sources when available.

## Step 2: VirtueMachine Evidence

- Collect hover/parity reports at affected coordinates.
- Dump nearby object records (`objblk??`, `objlist`) and inspect:
  - packed coord decode (`x,y,z`)
  - object `type`, `frame`, `tile`, `status`
- Confirm whether mismatch exists in source records or only at render composition.

## Step 3: Legacy/Nuvie Evidence

- Validate coordinate decoding and status semantics against:
  - `legacy/u6-decompiled/SRC/u6.h`
  - relevant segment logic (`seg_0A33.c`, `seg_1184.c`, `seg_2FC1.c`, etc.)
- Use ScummVM Nuvie references first to cross-check presentation rules.
- Use standalone Nuvie only when ScummVM lacks the relevant routine and document that exception.

## Step 4: Classification

Classify with one label:

- `source-data-drift`
- `decode-model-bug`
- `composition-order-bug`
- `visibility-rule-bug`
- `interaction-rule-bug`

Do not apply coordinate hardcodes before classification is explicit.

## Step 5: Documentation Update

Update:

- `docs/architecture/legacy/keyboard-parity.md` (input-related)
- `docs/architecture/legacy/startup-menu-parity.md` (menu/cursor-related)
- `docs/research/legacy-findings.md` (new evidence)
- `docs/progress.md` (task status)

Include:

- exact coordinates
- raw decoded records
- classification
- chosen fix strategy
