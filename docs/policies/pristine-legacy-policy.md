# Pristine Legacy Source Policy

## Scope

This policy applies to the original decompiled code under `legacy/u6-decompiled/SRC/`.

## Rule

`legacy/u6-decompiled/SRC/` is read-only from a project workflow perspective.

- No refactors in place.
- No symbol renames in place.
- No formatting changes in place.
- No behavior edits in place.

Allowed exceptions:

- None by default.
- If an exception is ever required, it must be explicitly approved and documented in `docs/architecture/new/decision-log.md`.

## Submodule Pinning

- `legacy/u6-decompiled` is pinned to a specific commit by this repository.
- Do not update the submodule pointer casually.
- Any pointer bump must be an explicit, reviewed change with rationale and compatibility notes.

## Porting Workflow

1. Read and analyze legacy code in `legacy/u6-decompiled/SRC/`.
2. Document findings in:
   - `docs/research/legacy-findings.md`
   - `docs/architecture/legacy/symbol-catalog.md`
3. Implement modern equivalents under `modern/` only.
4. Link each modern module back to legacy provenance in docs.

## Why

- Preserve provenance and auditability of reverse-engineered behavior.
- Reduce accidental semantic drift in the historical baseline.
- Keep modernization and experimentation isolated.
