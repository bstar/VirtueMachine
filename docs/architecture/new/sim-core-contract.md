# `sim-core` Contract (Draft)

## Purpose

Define a stable, deterministic gameplay runtime API that remains faithful to legacy mechanics while being platform-neutral.

## Core Requirements

1. Deterministic execution for identical initial state + command stream.
2. Fixed-tick stepping independent of render frame rate.
3. Serializable authoritative state for saves and multiplayer synchronization.
4. Explicit control over RNG source and seed.

## Draft API Surface

```c
typedef struct SimConfig SimConfig;
typedef struct SimState SimState;
typedef struct SimCommand SimCommand;
typedef struct SimStepResult SimStepResult;

int sim_init(SimState* state, const SimConfig* cfg);
int sim_load_game(SimState* state, const char* save_slot_path);
int sim_save_game(const SimState* state, const char* save_slot_path);

int sim_queue_command(SimState* state, const SimCommand* cmd);
int sim_step_ticks(SimState* state, int tick_count, SimStepResult* out_result);

uint64_t sim_state_hash(const SimState* state);
void sim_shutdown(SimState* state);
```

## Determinism Policy

- All authoritative randomness uses `sim-core` RNG only.
- Time progression is tick-derived, not wall-clock-derived.
- Command ordering is stable and fully defined.
- Floating point should be avoided in authoritative gameplay paths.

## Testing Policy

- Replay tests: command log -> deterministic state hash checkpoints.
- Golden scenario tests for key systems (movement/combat/dialogue/save-load).
- Hash mismatch diagnostics include subsystem and tick context.

## Legacy Mapping Requirement

For each implemented subsystem, add:

- source legacy files/functions
- behavioral invariants preserved
- known deviations and rationale

Reference:

- `../legacy/module-map.md`
- `../legacy/symbol-catalog.md`
