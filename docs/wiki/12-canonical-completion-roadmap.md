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

## Risk Register

### Highest-Risk Remaining Gaps

- same-cell chain-association semantics under mixed support and inventory object sets
- sparse edge conditions where obscurity and visibility suppression overlap
- legacy flow semantics not yet fully encoded outside room rendering

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

## Why This Roadmap Prevents Future Grind

Without closure milestones, teams keep solving symptoms in local contexts.
With closure milestones, each fix retires a class of failures.

That is the difference between endless parity triage and architectural completion.
