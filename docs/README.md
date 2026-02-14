# VirtueMachine Documentation

This documentation system keeps legacy reverse-engineering context and modern architecture decisions connected, so we can preserve gameplay behavior while evolving the client.

## Goals

- Preserve critical understanding of the decompiled DOS codebase.
- Keep modern web architecture separate but explicitly linked to legacy behavior.
- Track symbol renames and confidence so we do not lose provenance.
- Document decisions as we discover hidden mechanics.

## Structure

- `docs/development-plan.md`: detailed execution plan, milestones, quality gates.
- `docs/progress.md`: live milestone/sprint checklist and current status.
- `docs/wiki/`: markdown-only technical wiki + static markdown web UI (`docs/wiki/index.html`).
- `docs/architecture/legacy/`: what the original game does and how we know it.
- `docs/architecture/new/`: modern system architecture and contracts.
- `docs/research/`: incremental findings during reverse-engineering/porting.
- `docs/templates/`: repeatable templates for findings and symbol mapping.
- `legacy/u6-decompiled/`: read-only legacy source mirror (submodule).

## Wiki UI

- Open `docs/wiki/index.html` in a browser, or serve repo root with any static server.
- The UI renders only local `.md` files under `docs/wiki/` and deep-links by hash route.
- The wiki includes a right-side **Reference Atlas** panel powered by `docs/wiki/terms.json`.
- Term links use `[[term:Name]]` (or `[[Name]]`) in markdown to focus entries in the side panel.
- Code path links and inline code-path references open a syntax-themed in-page code overlay viewer.
- Wiki theme auto-syncs with the debug panel theme via localStorage key `vm_theme`.

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
