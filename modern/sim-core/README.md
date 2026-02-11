# sim-core (M1 Bootstrap)

Authoritative simulation prototype with deterministic tick stepping.

## Files

- `include/sim_core.h`: API and simulation data types.
- `src/sim_core.c`: deterministic tick loop, command application, state hash.
- `tests/test_replay.c`: replay determinism + golden-hash regression check.
- `tests/test_world_state_io.c`: world state serialization/deserialization + hash invariants.

## Intent

This is not full gameplay yet. It establishes the deterministic execution contract required for:

- faithful legacy behavior regression checks
- UI decoupling from gameplay authority
- future lockstep multiplayer

## M2 Slice 1

`SimWorldState` now carries an initial legacy-backed world subset (from `D_2C4A` globals),
including time/date, map position, combat flag, and sound flag.
The module exposes explicit binary serialization helpers for stable save/network snapshots.
