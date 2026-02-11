# Ultima VI Port Documentation

This documentation system keeps legacy reverse-engineering context and modern architecture decisions connected, so we can preserve gameplay behavior while evolving the client.

## Goals

- Preserve critical understanding of the decompiled DOS codebase.
- Keep modern web architecture separate but explicitly linked to legacy behavior.
- Track symbol renames and confidence so we do not lose provenance.
- Document decisions as we discover hidden mechanics.

## Structure

- `docs/development-plan.md`: detailed execution plan, milestones, quality gates.
- `docs/progress.md`: live milestone/sprint checklist and current status.
- `docs/architecture/legacy/`: what the original game does and how we know it.
- `docs/architecture/new/`: modern system architecture and contracts.
- `docs/research/`: incremental findings during reverse-engineering/porting.
- `docs/templates/`: repeatable templates for findings and symbol mapping.
- `legacy/u6-decompiled/`: read-only legacy source mirror (submodule).

## Documentation Rules

1. Every modern behavior-affecting decision links to at least one legacy source reference.
2. Every renamed symbol records:
   - original identifier
   - proposed meaning
   - confidence level
   - evidence (code refs, runtime behavior, test evidence)
3. Ambiguous areas remain marked as hypotheses until validated.
4. Keep legacy facts and modernization decisions in separate files, connected by links.
5. Treat `legacy/u6-decompiled/SRC/` as pristine read-only baseline; implement ported code under `modern/`.

## Policy

- `docs/policies/pristine-legacy-policy.md`
- `docs/policies/legacy-submodule-update.md`
- `docs/policies/sandbox-escalation-policy.md`
