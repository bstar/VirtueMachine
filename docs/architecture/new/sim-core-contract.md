# `sim-core` Contract (Draft)

## Purpose

Define a stable, deterministic gameplay runtime API that remains faithful to legacy mechanics while being platform-neutral.

## Core Requirements

1. Deterministic execution for identical initial state + command stream.
2. Fixed-tick stepping independent of render frame rate.
3. Serializable authoritative state for saves and multiplayer synchronization.
4. Explicit control over RNG source and seed.

## M1 Bootstrap API Surface

```c
int sim_init(SimState *state, const SimConfig *cfg);
int sim_step_ticks(SimState *state,
                   const SimCommand *commands,
                   size_t command_count,
                   uint32_t tick_count,
                   SimStepResult *out_result);
uint64_t sim_state_hash(const SimState *state);
```

Defined in:

- `modern/sim-core/include/sim_core.h`
- `modern/sim-core/src/sim_core.c`

## Why This Happens First

- Multiplayer needs deterministic command + tick replay.
- A larger viewport/UI must be presentation-only, not simulation authority.
- Faithful legacy behavior requires measurable regression checks (hash/replay), which this layer enables.
- This is the smallest possible executable slice that validates architecture decisions before larger port work.

## Determinism Policy

- All authoritative randomness uses `sim-core` RNG only.
- Time progression is tick-derived, not wall-clock-derived.
- Command ordering is stable and fully defined.
- Floating point should be avoided in authoritative gameplay paths.

## Testing Policy

- Replay tests: command log -> deterministic state hash checkpoints.
- Golden scenario tests for key systems (movement/combat/dialogue/save-load).
- Hash mismatch diagnostics include subsystem and tick context.

Current bootstrap test:

- `modern/sim-core/tests/test_replay.c`

## Legacy Mapping Requirement

For each implemented subsystem, add:

- source legacy files/functions
- behavioral invariants preserved
- known deviations and rationale

Reference:

- `../legacy/module-map.md`
- `../legacy/symbol-catalog.md`
