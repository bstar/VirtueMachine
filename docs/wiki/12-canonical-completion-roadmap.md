# Canonical Completion Roadmap

This chapter defines what "finished enough to trust" means for canonical faithfulness.

It is not a feature wishlist. It is a parity closure plan.

## Definition Of Done (Canonical Faithfulness)

The system is canonically trustworthy when:

1. object provenance is deterministic and auditable for all supported installs
2. render composition rules match legacy behavior for validated room suites
3. same-cell ordering edge cases are resolved with evidence-backed semantics
4. network authority does not silently override canonical baseline expectations
5. remaining deviations are explicitly documented and justified

## Milestone 1: Provenance Closure

Deliverables:

- formalized source selection matrix for all known install layouts
- extraction/mapping verification artifacts for `lzobjblk`
- CI checks that fail on ambiguous provenance configuration

Player impact:

- broad elimination of systemic one-cell shifts across static decor

## Milestone 2: Composition Semantics Closure

Deliverables:

- validated source-window behavior (`+1` row/column semantics)
- spill behavior parity validated across edge and corner conditions
- same-cell insertion behavior verified on high-risk room suites

Player impact:

- stable furniture/support layering
- consistent object placement on benches/tables and wall contexts

## Milestone 3: Authority Lifecycle Closure

Deliverables:

- explicit baseline reload lifecycle with clear operational tooling
- deterministic delta application/clearing semantics
- diagnostics that show active baseline hash + delta revision to client

Player impact:

- fewer "fix not visible" incidents
- consistent behavior across restart and multi-session workflows

## Milestone 4: Legacy Flow Closure

Deliverables:

- startup/title/menu flow provenance mapping against legacy behavior
- documented intentional divergences for modern UX where required

Player impact:

- complete game-feel continuity beyond room visuals

## Milestone 5: UI Parity Harness And Mechanics Gate

Deliverables:

- deterministic UI parity mode with fixed camera/frame and scripted panel state captures
- panel-specific regression suites for:
  - inventory
  - paperdoll/equipment
  - party management
  - message log/scrollback
- canonical-vs-modern UI taxonomy:
  - `canonical_ui`: game-faithful panels and behavior
  - `modern_ui`: account/user-management and other non-legacy affordances
- CI snapshot + interaction-probe checks so mechanics work cannot bypass panel regressions
- legacy-code-first acceptance criteria for panel slices when canonical screenshots are unavailable

Player impact:

- confidence that newly implemented gameplay systems land on stable, testable UI behavior
- fewer regressions in high-frequency panel interactions (inventory/equip/party/messaging)

Evidence policy for this milestone:

- primary: legacy decompiled routine/symbol evidence and deterministic probe outputs
- secondary: screenshot parity packs (optional in early slices, required later when reference captures are available)

## Risk Register

### Highest-Risk Remaining Gaps

- same-cell chain-association semantics under mixed support and inventory object sets
- nested container-chain accessibility rules (contained-in-contained ownership/root-anchor behavior)
- sparse edge conditions where obscurity and visibility suppression overlap
- legacy flow semantics not yet fully encoded outside room rendering
- lack of deterministic visual harness coverage for panel-heavy mechanics before rollout

### Medium Risks

- install/profile mismatch in user-provided game data
- operational errors from stale runtime net data

### Low Risks

- cosmetic UI differences in debug tooling

## Governance Model

For each canonical change:

1. classify layer
2. produce evidence bundle
3. implement minimal faithful change
4. update tests/probes
5. update deviation ledger/wiki

No step is optional if the intent is long-term parity confidence.

## Current Closure Status (World Objects Track)

Recently closed:

- canonical coord-use status transition module (`LOCXYZ/CONTAINED/INVEN/EQUIP`) with exhaustive matrix tests
- server-authoritative interaction mutation endpoint (`take/drop/put/equip`)
- deterministic interaction checkpoint hashing and replay-equivalence contract test
- required sim-core compiled interaction decision bridge for net mutation semantics (default required mode)

Next closure target:

- assoc/container-chain semantic closure:
  - parent-chain traversal with cycle/missing-parent guards (`closed` via sim-core `u6_assoc_chain`)
  - chain accessibility constraints for `take` from contained stacks (`closed` in interaction endpoint + contract tests)
  - interaction precondition decisions moved into sim-core bridge (`closed`; container block + container cycle policy no longer decided in net JS)
  - diagnostics surfacing (`assoc_chain`, `root_anchor`, `blocked_by`) now sourced from sim-core batch bridge in `/api/world/objects`
  - `/api/world/objects` selection/filtering (`projection`, `radius`, `limit`, canonical order) now sourced from sim-core world-query bridge
  - deterministic test fixtures for nested chains (`in progress`, expanded corpus pending)

Parallel ambitious track (mechanics gate):

- UI parity harness rollout (U0-U5):
  - deterministic parity mode
  - inventory/paperdoll/party/message-log harnesses
  - canonical-vs-modern UI tagging and enforcement
  - started: legacy-code UI canonical anchor matrix + extractor/test guard

## Why This Roadmap Prevents Future Grind

Without closure milestones, teams keep solving symptoms in local contexts.
With closure milestones, each fix retires a class of failures.

That is the difference between endless parity triage and architectural completion.
