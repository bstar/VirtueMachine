# VirtueMachine Technical Wiki

This wiki is a markdown-only, source-controlled architecture reference for Ultima VI in this repository.

## Why This Wiki Exists

This is not just a code map. It is a player-impact map.

- If a chair draws one cell off, this wiki should tell you which subsystem did it.
- If a server restart changes what appears on a table, this wiki should tell you why.
- If modern architecture diverges from legacy behavior, this wiki should document the cost and the reason.

Think of every chapter as answering three questions:

1. what the system does,
2. why it exists that way,
3. what the player sees when it is right or wrong.

## Project Context

VirtueMachine is not a single rewrite sprint. It is a long-running parity program:

- preserve original Ultima VI gameplay semantics,
- modernize runtime architecture so it is testable and operable,
- avoid cargo-cult visuals that look right in one room but fail elsewhere.

This wiki is the institutional memory for those tradeoffs.

## Philosophy and Non-Negotiables

### Canonical Behavior First

- “Looks right” is not enough.
- If behavior is unknown, we classify it as a gap, not a style decision.
- If behavior is known, implementation follows evidence, not convenience.

### No Visual Hacks as Final State

- Temporary probes are acceptable.
- Permanent “one-room fixes” are not.
- Any divergence must be explicit in the deviation ledger.

### Determinism Over Hand-Waving

- If a claim cannot survive replay/checkpoint or parity instrumentation, it is not trusted.
- Reproducible failures are preferred over unverifiable assumptions.

### Player-Impact Framing

- Every architecture decision should map to player-visible outcomes:
  - interaction correctness,
  - sprite layering correctness,
  - world-state consistency,
  - multiplayer/session integrity.

## Open-Source Lineage and Upstream Support

VirtueMachine stands on substantial public reverse-engineering and preservation work.

### `u6-decompiled` (Primary Canonical Anchor)

- Repository: `legacy/u6-decompiled`
- Role: first-line behavior evidence for DOS runtime semantics.
- Why it matters: this is where low-level routines and control flow are recovered, named, and inspected.

### Nuvie and ScummVM (Secondary Behavioral References)

- Role: comparative implementations that often expose practical interpretation details.
- Why they matter: they can confirm expected outcomes when decompiled intent is ambiguous.
- Constraint: they are secondary evidence in this project; they do not override direct legacy/source-data proof.

### Original Game Data as Ground Truth

- Runtime assets + savegame object blocks are treated as hard evidence, not incidental inputs.
- A significant share of parity bugs were provenance bugs (wrong baseline source) rather than rendering logic bugs.

## What It Took to Get Here

A lot of project effort was spent not on flashy features, but on deleting ambiguity:

- separating baseline provenance mistakes from renderer ordering mistakes,
- replacing ad hoc room edits with baseline/profile pipelines,
- introducing parity snapshots/hover reports so disagreements became inspectable,
- hardening API/client state sync so debugging was deterministic instead of anecdotal,
- documenting route behavior, persistence semantics, and failure modes in one place.

Many “visual bugs” turned out to be architecture/system boundary bugs:

- object baseline source selection,
- spill-cell inclusion windows (`viewW+1`/`viewH+1` edge effects),
- same-cell insertion precedence,
- hidden-cell suppression policy,
- server-authoritative vs client-local state responsibility.

The result is a project that can now explain *why* a fix works, not just that it appears to.

## Scope

- How original Ultima VI runtime behavior works (from decompiled evidence + data formats).
- How VirtueMachine is built today (`sim-core`, `client-web`, `net`, tooling).
- Where modern architecture intentionally diverges from legacy behavior.
- Where parity gaps remain and how to investigate them without ad hoc fixes.

## Read This First

- [docs/wiki/01-legacy-runtime-anatomy.md](01-legacy-runtime-anatomy.md)
- [docs/wiki/02-modern-runtime-anatomy.md](02-modern-runtime-anatomy.md)
- [docs/wiki/08-deviation-ledger.md](08-deviation-ledger.md)
- [docs/wiki/13-reference-atlas.md](13-reference-atlas.md)
- [docs/wiki/14-api-ui-realtime-sync.md](14-api-ui-realtime-sync.md)
- [docs/wiki/15-api-endpoint-reference.md](15-api-endpoint-reference.md)

## Human + AI Development Model

VirtueMachine development uses a human-architect + AI-implementation loop.

### Roles

- Human (project owner): sets fidelity bar, validates gameplay truth, rejects superficial fixes, and defines canonical intent.
- AI agent: executes implementation iterations quickly, instruments the system, documents evidence trails, and applies cross-file refactors.

### Why This Matters

- Parity work has many false positives: something can look fixed while actually breaking another subsystem.
- Tight human review catches semantic mistakes early.
- AI speed shortens the loop from hypothesis -> patch -> instrumentation -> correction.

### Process Shaping Effects

This collaboration style changed the project architecture in practice:

- stronger emphasis on diagnostics over guesswork,
- explicit deviation logging instead of implicit behavior drift,
- preference for root-cause fixes once enough evidence accumulates,
- continuous documentation updates as part of implementation, not post-hoc.

In short: the collaboration is opinionated toward canonical correctness, not cosmetic progress.

## Reading Tracks

If you are new to this codebase, pick one track and follow it in order.

### Track A: "Why does this room look wrong?"

1. [docs/wiki/04-object-baseline-provenance.md](04-object-baseline-provenance.md)
2. [docs/wiki/03-rendering-pipeline-deep-dive.md](03-rendering-pipeline-deep-dive.md)
3. [docs/wiki/07-parity-engineering-workflow.md](07-parity-engineering-workflow.md)
4. [docs/wiki/08-deviation-ledger.md](08-deviation-ledger.md)

### Track B: "Why did multiplayer/state regress?"

1. [docs/wiki/05-determinism-and-replay.md](05-determinism-and-replay.md)
2. [docs/wiki/06-network-authority-and-persistence.md](06-network-authority-and-persistence.md)
3. [docs/wiki/14-api-ui-realtime-sync.md](14-api-ui-realtime-sync.md)
4. [docs/wiki/02-modern-runtime-anatomy.md](02-modern-runtime-anatomy.md)
5. [docs/wiki/15-api-endpoint-reference.md](15-api-endpoint-reference.md)

### Track C: "I need to make a faithful engine change"

1. [docs/wiki/01-legacy-runtime-anatomy.md](01-legacy-runtime-anatomy.md)
2. [docs/wiki/03-rendering-pipeline-deep-dive.md](03-rendering-pipeline-deep-dive.md)
3. [docs/wiki/08-deviation-ledger.md](08-deviation-ledger.md)
4. [docs/wiki/09-testing-and-tooling-index.md](09-testing-and-tooling-index.md)

## Full Table of Contents

1. [docs/wiki/01-legacy-runtime-anatomy.md](01-legacy-runtime-anatomy.md)
2. [docs/wiki/02-modern-runtime-anatomy.md](02-modern-runtime-anatomy.md)
3. [docs/wiki/03-rendering-pipeline-deep-dive.md](03-rendering-pipeline-deep-dive.md)
4. [docs/wiki/04-object-baseline-provenance.md](04-object-baseline-provenance.md)
5. [docs/wiki/05-determinism-and-replay.md](05-determinism-and-replay.md)
6. [docs/wiki/06-network-authority-and-persistence.md](06-network-authority-and-persistence.md)
7. [docs/wiki/07-parity-engineering-workflow.md](07-parity-engineering-workflow.md)
8. [docs/wiki/08-deviation-ledger.md](08-deviation-ledger.md)
9. [docs/wiki/09-testing-and-tooling-index.md](09-testing-and-tooling-index.md)
10. [docs/wiki/10-glossary.md](10-glossary.md)
11. [docs/wiki/11-parity-case-studies.md](11-parity-case-studies.md)
12. [docs/wiki/12-canonical-completion-roadmap.md](12-canonical-completion-roadmap.md)
13. [docs/wiki/13-reference-atlas.md](13-reference-atlas.md)
14. [docs/wiki/14-api-ui-realtime-sync.md](14-api-ui-realtime-sync.md)
15. [docs/wiki/15-api-endpoint-reference.md](15-api-endpoint-reference.md)

## Operating Principles

- Legacy code and data are authoritative for behavior.
- Modern systems may improve architecture, but not silently change gameplay semantics.
- Every meaningful deviation must be documented in [docs/wiki/08-deviation-ledger.md](08-deviation-ledger.md).
- No visual hacks before source/provenance classification.

## What "Comprehensive" Means Here

Comprehensive does not mean copy-pasting decompiled code. It means each subsystem chapter answers:

1. architecture intent
2. legacy behavior anchor
3. modern implementation boundary
4. known failure signatures
5. player-visible consequences
6. evidence and tools used to verify claims

When a chapter misses one of these, the wiki is incomplete and should be extended.

## How To Read This Wiki Effectively

Use this sequence when diagnosing a bug:

1. confirm provenance:
   is this from baseline data, dynamic runtime state, or composition logic?
2. confirm ordering:
   source order, insertion precedence, and spill behavior.
3. confirm authority:
   client-local state vs server-authoritative state.
4. confirm determinism:
   does replay/parity instrumentation agree?

Skipping these steps is the fastest way to create “fixes” that regress other rooms.

## Architecture Philosophy In One Paragraph

VirtueMachine is trying to be faithful to Ultima VI semantics while modernizing operational shape.  
That means deterministic core, inspectable rendering, and multiplayer-ready persistence are allowed, but gameplay semantics are not negotiable without explicit ledger entries.  
The goal is not museum emulation and not freeform reinterpretation. The goal is a faithful, testable, operable engine.

## Canonical Evidence Ladder

1. Legacy decompiled source, anchored by concrete files such as:
   `legacy/u6-decompiled/SRC/seg_0903.c`, `legacy/u6-decompiled/SRC/seg_1184.c`, and `legacy/u6-decompiled/SRC/u6.h`
2. Original game data files in `~/projects/ULTIMA6/ultima6`
3. Runtime instrumentation from VirtueMachine hover/parity reports
4. ScummVM/Nuvie as secondary clue source only

## Relationship Between Docs and Code

This wiki is not a marketing layer and not optional reading.

- It is a working contract between implementation and expected behavior.
- If code changes but docs do not, project knowledge quality degrades.
- If docs claim behavior that code cannot reproduce, docs are wrong and must be corrected.

## Future MMO Direction (Planned, Not Final)

VirtueMachine is expected to grow into an MMO-capable Ultima VI experience, while preserving core single-player progression semantics.

### Design Intent So Far

- Inspired in part by Ultima VI Online operational ideas.
- Players should still be able to:
  - run quests,
  - level up,
  - and fully complete the game arc.
- Critical items are intended to recover when altered/missing, with a target respawn/recovery window of roughly 5 minutes.

### Visual/UI Stance

- VirtueMachine intends to keep the smaller legacy view, frame, and original-style UI presentation.
- This is a deliberate stylistic choice to stay visually closer to classic Ultima VI.
- If a player wants broader modernized interface presentation, Ultima VI Online and Nuvie/ScummVM remain better options.

### Project Openness

- Anyone can download the project and run their own server.
- Forking is expected and welcome.
- Contributions may be accepted in the future, but the roadmap remains intentionally flexible.

### Development Phase Notice

- The project is still in heavy development.
- Until `1.0`, formal bug-report intake and broad external contribution flow are intentionally deferred.
- Priority remains canonical behavior completion and architecture stabilization.

## Wiki Maintenance Contract

When behavior changes in code, update at minimum:

- the relevant system chapter
- the deviation ledger (if behavior changed)
- the tooling index (if new probes/tests/scripts were added)
- this home page when project-level philosophy/process evolves
