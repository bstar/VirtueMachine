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
size_t sim_state_snapshot_size(void);
int sim_state_snapshot_serialize(const SimState *state, uint8_t *out, size_t out_size);
int sim_state_snapshot_deserialize(SimState *state, const uint8_t *in, size_t in_size);
size_t sim_command_wire_size(void);
int sim_command_serialize(const SimCommand *cmd, uint8_t *out, size_t out_size);
int sim_command_deserialize(SimCommand *cmd, const uint8_t *in, size_t in_size);
int sim_command_stream_deserialize(SimCommand *out, size_t out_capacity, const uint8_t *in, size_t in_size, size_t *out_count);
int sim_write_replay_checkpoints(const SimState *initial_state,
                                 const SimCommand *commands,
                                 size_t command_count,
                                 uint32_t total_ticks,
                                 uint32_t checkpoint_interval,
                                 const char *path);
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
- `modern/sim-core/tests/test_u6_map.c`
- `modern/sim-core/tests/test_clock_rollover.c`
- `modern/sim-core/tests/test_snapshot_persistence.c`
- `modern/sim-core/tests/test_command_envelope.c`
- `modern/sim-core/tests/test_replay_checkpoints.c`

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

## M2 Slice 3 Compatibility Boundary

Legacy map/chunk read compatibility module:

- `modern/sim-core/include/u6_map.h`
- `modern/sim-core/src/u6_map.c`

Current behavior:

- `u6_map_load_window` mirrors key legacy `seg_101C` map window loads
- `u6_map_get_chunk_index_at` decodes packed 12-bit chunk indices
- `u6_chunk_read` reads `0x40` bytes per chunk
- `u6_map_get_tile_at` resolves tile via chunk lookup and in-chunk coordinates

## M2 Slice 4 Deterministic Clock Policy

Current explicit simulation clock policy:

- 4 ticks per minute
- 60 minutes per hour
- 24 hours per day
- 28 days per month
- 13 months per year

Rollover sequence is regression-tested. This is a deterministic baseline policy and may be tuned later if deeper legacy timing analysis reveals required adjustments.

## M2 Slice 5 Persistence Hardening

Snapshot API now uses a versioned binary envelope:

- magic: `U6MS`
- version: `1`
- fixed header size + payload size fields
- payload checksum (FNV-1a 32-bit)

Failure paths return explicit `SimPersistError` values:

- `SIM_PERSIST_ERR_NULL`
- `SIM_PERSIST_ERR_SIZE`
- `SIM_PERSIST_ERR_MAGIC`
- `SIM_PERSIST_ERR_VERSION`
- `SIM_PERSIST_ERR_CHECKSUM`

## M3 Slice 1 Command + Replay Boundary

Added stable command envelope and ingestion helpers:

- fixed command wire size: `16` bytes
- per-command serialize/deserialize
- stream decode helper with alignment/capacity/error checks

Added deterministic replay checkpoint writer:

- CSV output: `tick,hash`
- fixed interval stepping
- reproducible logs for scenario comparisons and desync debugging

## M3 Slice 2 Client Prototype Status

`modern/client-web` now consumes the command envelope/tick model and renders a first tile viewport.
Current implementation uses a JS-side compatibility reader for `map`/`chunks` and is an interim bridge.
Planned direction is shared data/logic boundaries with sim-core to avoid long-term duplication.

## Legacy Mapping Requirement

For each implemented subsystem, add:

- source legacy files/functions
- behavioral invariants preserved
- known deviations and rationale

Reference:

- `../legacy/module-map.md`
- `../legacy/symbol-catalog.md`
