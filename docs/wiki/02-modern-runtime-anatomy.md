# Modern Runtime Anatomy (VirtueMachine)

## Why We Split The Runtime

The DOS original was one engine body. VirtueMachine is a set of organs with explicit contracts.

- `sim-core` protects deterministic truth.
- `client-web` handles presentation and probes.
- `net` handles persistence and multiplayer authority.

This separation is not cosmetic. It is what lets us debug parity without destroying determinism.

## Architectural Split

VirtueMachine deliberately separates concerns that were intertwined in DOS code:

- `modern/sim-core`: deterministic authority boundary
- `modern/client-web`: presentation, input capture, local probes
- `modern/net`: auth + server authority + persistence for multiplayer workflows

Reference: `docs/architecture/new/system-overview.md`

## `sim-core`

Purpose:

- fixed-tick deterministic stepping
- serializable state envelopes
- stable command wire format
- replay/hash/checkpoint diagnostics

Key files:

- `modern/sim-core/include/sim_core.h`
- `modern/sim-core/src/sim_core.c`
- `modern/sim-core/include/u6_objblk.h`
- `modern/sim-core/src/u6_objblk.c`
- `modern/sim-core/include/u6_objlist.h`
- `modern/sim-core/src/u6_objlist.c`

Design intent:

- strict determinism over convenience
- explicit serialization contract over ad hoc in-memory persistence
- code paths that are testable without browser/network dependencies

## `client-web`

Purpose:

- map/object composition for viewport
- hover and parity reporting
- command generation and UX

Key files:

- `modern/client-web/app.js`
- `modern/client-web/render_composition.js`

Important boundaries:

- `buildBaseTileBuffersCurrent(...)` for background/base tile staging
- `buildOverlayCells(...)` / `buildOverlayCellsModel(...)` for object overlays
- hover reporter (VirtueMachine hover report generation)

Design intent:

- expose composition internals so parity work is measurable
- keep rendering experimentation isolated from state authority
- preserve enough diagnostics to reason about hidden/open/occluder interactions

## `net`

Purpose:

- login/session identity
- authoritative world-object baseline + deltas
- persistence files under `modern/net/data/`

Key file:

- `modern/net/server.js`

Important world-object model:

- baseline objects loaded from configured `objblk?? + objlist`
- runtime deltas as removed/moved/spawned overlays

Design intent:

- keep baseline immutable at runtime
- make mutations explicit as deltas
- preserve recoverability and auditability of live world changes

## Asset Pipeline

Primary script:

- `modern/tools/sync_assets.sh`

Now supports canonical object baseline resolution:

1. root `objblk??` if present
2. `lzobjblk` extraction
3. `savegame/objblk??` fallback

Extractor:

- `modern/tools/extract_lzobjblk_savegame.js`

## Practical Takeaway

Modern architecture is intentionally cleaner, but parity depends on reproducing legacy data provenance and composition rules, not just rendering similar tiles.

## Player-Visible Impact

When boundaries are respected:

- multiplayer stays stable
- reloads are predictable
- visual fixes do not randomly break interaction

When boundaries leak:

- a "visual" bug might really be stale network deltas
- a "data" bug might be blamed on renderer ordering

## Architecture Tradeoffs (Explicit)

### What We Gain Versus Legacy

- repeatable replay and test harnesses
- authoritative multiplayer and persistence boundaries
- easier subsystem ownership and review

### What We Risk Versus Legacy

- semantic drift hidden behind cleaner abstractions
- boundary bugs where one layer makes assumptions legacy code did not make
- accidental "fixes" that improve one room while regressing systemic behavior

## Canonical Alignment Rule

Modern structure is allowed to differ.  
Modern behavior is not allowed to drift silently.

If a change cannot be explained in terms of legacy semantics plus an explicit modern rationale, it belongs in the deviation ledger before merge.
