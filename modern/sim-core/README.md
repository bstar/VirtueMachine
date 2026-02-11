# sim-core (M1 Bootstrap)

Authoritative simulation prototype with deterministic tick stepping.

## Files

- `include/sim_core.h`: API and simulation data types.
- `include/u6_objlist.h`: legacy `savegame/objlist` compatibility constants and helpers.
- `src/sim_core.c`: deterministic tick loop, command application, state hash.
- `src/u6_objlist.c`: extract/patch helpers for the legacy `objlist` tail block.
- `tests/test_replay.c`: replay determinism + golden-hash regression check.
- `tests/test_world_state_io.c`: world state serialization/deserialization + hash invariants.
- `tests/test_objlist_compat.c`: legacy `objlist` compatibility and malformed-input checks.

## Intent

This is not full gameplay yet. It establishes the deterministic execution contract required for:

- faithful legacy behavior regression checks
- UI decoupling from gameplay authority
- future lockstep multiplayer

## M2 Slice 1

`SimWorldState` now carries an initial legacy-backed world subset (from `D_2C4A` globals),
including time/date, map position, combat flag, and sound flag.
The module exposes explicit binary serialization helpers for stable save/network snapshots.

This slice also adds a strict `objlist` tail compatibility boundary:

- parse mapped fields from legacy tail bytes
- patch mapped fields back into tail bytes without altering unknown fields
