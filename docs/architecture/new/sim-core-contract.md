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
size_t sim_world_state_size(void);
int sim_world_serialize(const SimWorldState *world, uint8_t *out, size_t out_size);
int sim_world_deserialize(SimWorldState *world, const uint8_t *in, size_t in_size);
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
- `modern/sim-core/tests/test_world_state_io.c`
- `modern/sim-core/tests/test_objlist_compat.c`

## M2 Slice 1 Mapping

Current `SimWorldState` maps a vetted subset of legacy `D_2C4A` globals:

- quest/sleep flags
- time/date fields
- wind direction
- active party index
- map coordinates (`map_x`, `map_y`, `map_z`)
- combat/sound booleans

This is the first persisted/state-sync-ready boundary for save compatibility and multiplayer snapshots.

## M2 Slice 2 Compatibility Boundary

Legacy `savegame/objlist` support now has a dedicated boundary module:

- `modern/sim-core/include/u6_objlist.h`
- `modern/sim-core/src/u6_objlist.c`

Current constants:

- `U6_OBJLIST_TAIL_OFFSET = 0x1BF1`
- `U6_OBJLIST_TAIL_SIZE = 0x82`

These are based on fixed-size read/write ordering from `SRC/seg_0C9C.c` and the serialized
`D_2C4A..D_2CCB` world-state block length.

## Legacy Mapping Requirement

For each implemented subsystem, add:

- source legacy files/functions
- behavioral invariants preserved
- known deviations and rationale

Reference:

- `../legacy/module-map.md`
- `../legacy/symbol-catalog.md`
