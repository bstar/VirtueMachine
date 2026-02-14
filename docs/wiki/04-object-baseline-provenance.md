# Object Baseline Provenance (Most Common Root Cause)

## Why Provenance Beats Patching

Most recurring room bugs are not rendering math errors. They are wrong source truth.

If you debug composition before proving baseline provenance, you'll burn hours "fixing" symptoms that reappear elsewhere.

## Problem Class

Many historical parity bugs were not renderer math bugs; they were baseline source bugs.

Symptoms include:

- items consistently one cell off
- stacks appearing at wrong bench/table endpoints
- fixes that “work” in one room and break another

## Ground Truth Sources

Potential sources from original install:

- root `objblk??` + `objlist` (preferred if present)
- `lzobjblk` (compressed canonical object-block stream)
- `savegame/objblk??` + `savegame/objlist` (may be user-mutated state)

Historical context:

- many shipped/install states include both canonical and mutated-looking object sources
- naive asset import can silently pick the "closest-looking" file and still be wrong
- canonical ordering/mapping inside compressed streams is not guaranteed to match alphabetical filename assumptions

## Current Canonical Selection Policy

Implemented in `modern/tools/sync_assets.sh`:

1. use root `objblk??` if present
2. else decode `lzobjblk` into `objblk??` via `modern/tools/extract_lzobjblk_savegame.js`
3. else fallback to `savegame/objblk??`

## `lzobjblk` Nuance

`lzobjblk` is not guaranteed to be stored in naive `aa..hh` segment order.

Extractor behavior:

- decompresses U6 LZW stream
- splits 64 segments by internal `(count + count*8)` boundaries
- infers each segment’s true area ID from embedded object coordinates
- writes correctly mapped `objblk??` filenames

Without this mapping step, extracted blocks can be valid but assigned to wrong areas.

This is one of the highest-leverage fixes in the project because it corrects an entire object baseline class across many rooms at once.

## Verification Playbook

- run `./modern/tools/sync_assets.sh /home/bstar/projects/ULTIMA6/ultima6`
- confirm reported world object source
- inspect target cells via hover report
- if parity still off, compare decoded `objblk??` records before changing renderer logic

Recommended evidence bundle for each provenance incident:

1. source selected by `sync_assets.sh`
2. coordinate-level before/after records from affected area block
3. hover report at affected cell(s)
4. statement confirming server delta state (clean or overridden)

## Anti-Pattern

Do not patch object offsets per room before provenance is proven. That creates unstable visual hacks.

## Player-Visible Impact

Wrong baseline provenance causes:

- believable but wrong object placements
- item stacks at bench endpoints
- fixes in one room that regress another

Correct provenance instantly resolves entire classes of "one cell off" reports.

## Provenance Smell Tests

If you see these patterns, suspect provenance first:

- bug appears in many unrelated indoor rooms after "small" renderer change
- same fix behaves differently after server reset
- one installation reproduces and another does not with same code
- Nuvie/ScummVM behavior matches neither your current baseline nor your patch intent

Treat these as data-truth alarms, not rendering invitations.
