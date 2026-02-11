# Legacy Submodule Update Procedure

Use this only when intentionally updating the pinned legacy baseline.

## Steps

1. In `legacy/u6-decompiled`, fetch upstream and checkout the target commit.
2. Return to repo root and stage the updated submodule pointer.
3. Add/update a decision entry in `docs/architecture/new/decision-log.md`.
4. Document compatibility impact (if any) in `docs/research/legacy-findings.md`.
5. Open PR with clear rationale for the bump.

## Required PR Notes

- old commit SHA
- new commit SHA
- reason for update
- expected impact on current port work
