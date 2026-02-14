# Determinism, Replay, and State Integrity

## Why Determinism Exists

Modern architecture requires deterministic authority to support:

- multiplayer synchronization
- desync detection
- reproducible bug triage

Determinism is the difference between "I think I fixed it" and "I can prove exactly what changed."

## Determinism Surfaces

- fixed tick stepping
- stable command envelope
- state hashing
- snapshot serialization with version/checksum

These are defensive layers against "non-reproducible confidence" where two runs appear similar but are not state-equivalent.

Primary contract: `docs/architecture/new/sim-core-contract.md`

## Replay Tooling

- command stream replay in `sim-core`
- checkpoint CSV generation
- test coverage in `modern/sim-core/tests/*`

Representative required test entrypoint:

- `./modern/tools/ci_required_tests.sh`

Replay value in practice:

- converts anecdotal bug reports into exact input histories
- lets you bisect behavior changes at tick boundaries
- proves whether a rendering issue is deterministic downstream of stable state

## Snapshot Integrity

Current envelope includes:

- magic/version
- payload size
- checksum

This catches corruption and invalid restores early.

It also protects operational workflows: bad payloads fail fast instead of poisoning runtime with partial state.

## Relationship to Rendering

Renderer can be wrong while sim remains deterministic. Keep these concerns separated:

- simulation correctness (deterministic state)
- composition correctness (legacy-like visual output)

## Player-Visible Impact

When determinism is healthy:

- multiplayer movement stays consistent
- bug reports can be reproduced from exact command streams
- save/load behavior is stable across sessions

When it is not:

- phantom desyncs appear
- visual debugging becomes noise because state truth keeps moving

## Determinism Triage Questions

Ask these before changing logic:

1. Does replay with identical command stream reproduce exactly?
2. Does state hash diverge before or after the visual artifact appears?
3. Is divergence local (render only) or authoritative (sim/net state)?

If you cannot answer these, you are not ready to patch behavior safely.
