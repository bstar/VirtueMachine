# Parity Engineering Workflow (No More Whack-a-Mole)

## Why This Workflow Exists

Without a sequence, parity work degrades into emotional room-by-room tweaking.

This workflow forces classification first, then proof, then fixes.

## Required Sequence

1. Classify issue type:
- source-data provenance
- decode/model bug
- composition-order bug
- visibility-rule bug
- interaction-rule bug

2. Prove data provenance.

3. Reproduce with coordinate-level evidence (hover reports + object records).

4. Validate against legacy routine behavior.

5. Add or update deterministic tests/probes before broad rollout.

Sequence discipline is what prevents "hero debugging" from becoming regression debt.

## Minimum Evidence for a Fix

- affected coordinates
- before/after object records
- legacy routine reference (file + function)
- explicit statement whether change is faithful or intentional divergence

If one of these is missing, the fix may still work locally but is not maintainable.

## Preferred Tools

- `./modern/tools/sync_assets.sh`
- `./modern/tools/compare_objblk_sets.sh`
- `./modern/tools/test_client_web_render_composition.sh`
- `./modern/tools/ci_required_tests.sh`

## Stop Conditions

Pause and re-classify when:

- one-room fixes break another room
- repeated one-cell adjustments oscillate
- behavior differs between baseline snapshots with no code changes

That almost always indicates provenance/state-layer issues.

## Escalation Path For Stubborn Bugs

When stop conditions trigger, escalate deliberately:

1. freeze code churn for that surface
2. gather canonical evidence from legacy + installed data
3. run provenance and authority checks
4. re-open renderer hypotheses only after upstream truth is stable

This costs less time than repeated speculative patching.

## Player-Visible Impact

Following this sequence reduces:

- endless regressions between neighboring rooms
- false confidence from local visual hacks
- time lost retesting unchanged root causes

It turns parity from guesswork into an engineering loop.

## Review Standard ("Would an Ultima VI Architect Approve?")

A parity patch should pass this bar:

- faithful behavior claim is anchored to legacy evidence
- no unexplained room-specific offsets
- no hidden coupling side effects (doors, walls, spill artifacts)
- repeatable via tooling, not only manual screenshots
