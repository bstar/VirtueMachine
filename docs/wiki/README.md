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

## Architecture Philosophy In One Paragraph

VirtueMachine is trying to be faithful to Ultima VI semantics while modernizing operational shape.  
That means deterministic core, inspectable rendering, and multiplayer-ready persistence are allowed, but gameplay semantics are not negotiable without explicit ledger entries.  
The goal is not museum emulation and not freeform reinterpretation. The goal is a faithful, testable, operable engine.

## Canonical Evidence Ladder

1. `legacy/u6-decompiled/SRC/*.c` and `legacy/u6-decompiled/SRC/*.h`
2. Original game data files in `/home/bstar/projects/ULTIMA6/ultima6`
3. Runtime instrumentation from VirtueMachine hover/parity reports
4. ScummVM/Nuvie as secondary clue source only

## Wiki Maintenance Contract

When behavior changes in code, update at minimum:

- the relevant system chapter
- the deviation ledger (if behavior changed)
- the tooling index (if new probes/tests/scripts were added)
