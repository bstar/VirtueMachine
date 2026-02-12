# New Architecture Docs

This directory defines the modern implementation architecture for browser delivery, UI evolution, and multiplayer readiness.

## Files

- `system-overview.md`: high-level subsystem boundaries and data flow.
- `sim-core-contract.md`: authoritative simulation API and determinism guarantees.
- `multiplayer-state-contract.md`: login/session and server-authoritative character/world state model.
- `audio-safe-rollout-checklist.md`: staged audio integration plan with UI-stability guardrails.

## Rules

- Every behavior-sensitive design decision links to legacy evidence in `../legacy/`.
- Any intentional deviation from legacy behavior must be explicit and justified.
