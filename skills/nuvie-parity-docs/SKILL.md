---
name: nuvie-parity-docs
description: Use this skill when validating VirtueMachine rendering or interaction parity with legacy Ultima VI canonical behavior, while using Nuvie/ScummVM and Ultima VI Online as comparative reference inputs only.
---

# Nuvie Parity Docs

Use this workflow for parity investigations where behavior looks wrong and must be verified against legacy canonical evidence before changing runtime code.

## Fidelity Hierarchy (Must Follow)

- Primary target: original Ultima VI behavior from decompiled legacy code and original data.
- Secondary aid: ScummVM/Nuvie and Ultima VI Online may be consulted only to generate clues when legacy intent is unclear.
- Do not treat ScummVM/Nuvie or Ultima VI Online as implementation targets for VirtueMachine systems.
- Any comparative-reference-derived decision must map back to legacy evidence before code changes.

## Canonical Source Policy

- Canonical source of truth remains `legacy/u6-decompiled` + original game data.
- ScummVM/Nuvie (`legacy/scummvm/engines/ultima/nuvie`) is comparative reference only.
- Ultima VI Online (`legacy/ultima-vi-online`) is comparative reference only.
- Critical reference policy lives in `references/canonical-sources.md`.
- When local submodules are present, use local files for analysis; do not fetch remote copies for routine parity/comparison work.

## Scope

- Rendering parity (tile/object placement, layering, visibility/blackout, door thresholds).
- Interaction parity (verb targeting, movement boundaries, cursor behavior).
- Asset provenance parity (pristine baseline vs save-derived drift).

## Workflow

1. Confirm current runtime asset provenance.
2. Capture coordinate-level evidence in VirtueMachine.
3. Compare against legacy code first; use ScummVM/Nuvie and U6O only for clue generation.
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

## Step 3: Legacy and Comparative Evidence

- Validate coordinate decoding and status semantics against:
  - `legacy/u6-decompiled/SRC/u6.h`
  - relevant segment logic (`seg_0A33.c`, `seg_1184.c`, `seg_2FC1.c`, etc.)
- Use ScummVM Nuvie references only after legacy review, to gather hypotheses.
- Use Ultima VI Online references only to evaluate MMO-era implementation patterns; never as canonical behavior proof.
- Before implementing a fix, cite the legacy routine/data evidence that justifies it.

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
