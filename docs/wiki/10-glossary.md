# Glossary

## Why This Glossary Exists

Parity debugging gets expensive when teams use the same words for different layers.

This glossary locks terminology so reports, fixes, and tests refer to the same thing.

## Interactive Term Jump

Use these to load detailed cards in the side Reference Atlas panel:

- [[term:Canonical]], [[term:Parity]], [[term:Baseline]], [[term:Delta]]
- [[term:objblk]], [[term:objlist]], [[term:lzobjblk]]
- [[term:Overlay]], [[term:Spill]], [[term:Occluder]], [[term:Floor Tile]]
- [[term:Source Window]], [[term:SourceType]], [[term:Chain Insertion]], [[term:Same-Cell Tie Ordering]]
- [[term:LOCXYZ]], [[term:CONTAINED]], [[term:INVEN]], [[term:EQUIP]]
- [[term:Determinism]], [[term:Replay]], [[term:State Hash]]
- [[term:Authority]], [[term:Baseline Reload]], [[term:Hover Report]], [[term:Parity Snapshot]]

## `objblk??`

Outdoor area object-block files containing static world object records (`count + 8-byte records`).

Why it matters:

- these are the backbone of static world placement
- when these are wrong, every downstream layer can appear guilty

## `objlist`

Legacy object/NPC/status aggregate file that includes a fixed world-tail block used by compatibility boundaries.

Why it matters:

- it carries non-trivial global context used by compatibility boundaries
- mismatching `objlist` with `objblk??` source epochs can produce confusing hybrid states

## `lzobjblk`

Compressed canonical outdoor object-block stream in some installs. Must be decompressed and correctly mapped to area IDs.

Why it matters:

- this is often the most canonical source in modern installs
- incorrect area mapping during extraction creates believable but wrong room layouts

## LOCXYZ / CONTAINED / INVEN / EQUIP

Legacy coordinate-use/status modes encoded in object status bits.

## Spill

Rendering of adjacent cell tile fragments for wide/tall objects, driven by tile flags.

Why it matters:

- many "off by one cell" visuals are actually correct anchors with wrong spill behavior (or vice versa)

## Baseline

Immutable source dataset for world objects before runtime deltas are applied.

Why it matters:

- baseline errors are systemic, not local
- local visual patches cannot safely compensate for wrong baseline truth

## Delta

Runtime modifications to baseline object placement/state (removed, moved, spawned).

Why it matters:

- stale deltas can override correct baseline fixes and mask progress

## Parity

Degree of behavioral/visual faithfulness to validated legacy semantics and data.

Why it matters:

- parity is not aesthetics; it is a fidelity contract
- "close enough" visual matches can still violate gameplay expectations

## Canonical

Preferred source of truth (legacy code + canonical data formats), above inferred or ad hoc behavior.

Why it matters:

- canonical evidence resolves disputes quickly
- without canonical anchors, debugging becomes preference-driven

## Player-Visible Impact

Shared vocabulary improves fix speed:

- less confusion in hover report interpretation
- fewer wrong-layer fixes
- clearer handoff between rendering, net, and sim-core work
