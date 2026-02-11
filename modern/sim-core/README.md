# sim-core (M1 Bootstrap)

Authoritative simulation prototype with deterministic tick stepping.

## Files

- `include/sim_core.h`: API and simulation data types.
- `include/u6_objlist.h`: legacy `savegame/objlist` compatibility constants and helpers.
- `include/u6_map.h`: legacy `map`/`chunks` read-only compatibility API.
- `src/sim_core.c`: deterministic tick loop, command application, state hash.
- `src/u6_objlist.c`: extract/patch helpers for the legacy `objlist` tail block.
- `src/u6_map.c`: read-only map window loading, chunk index decode, chunk/tile reads.
- `tests/test_replay.c`: replay determinism + golden-hash regression check.
- `tests/test_world_state_io.c`: world state serialization/deserialization + hash invariants.
- `tests/test_objlist_compat.c`: legacy `objlist` compatibility and malformed-input checks.
- `tests/test_u6_map.c`: synthetic fixture validation for map/chunk compatibility.
- `tests/test_clock_rollover.c`: deterministic minute/hour/day/month/year rollover regression tests.
- `tests/test_snapshot_persistence.c`: versioned snapshot roundtrip + corruption/error-path tests.
- `tests/test_command_envelope.c`: command wire envelope serialize/deserialize tests.
- `tests/test_replay_checkpoints.c`: deterministic replay checkpoint log generation tests.

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

## M2 Slice 3

Added a minimal read-only `map`/`chunks` compatibility boundary modeled after legacy
`seg_101C` access patterns:

- load map window data (`z=0` 4x0x180 blocks, `z>0` 0x600 block at legacy offset)
- decode packed 12-bit chunk indices
- read chunks as 8x8 tile blocks (`0x40` bytes)
- resolve a tile at `(x, y, z)` via chunk lookup

## M2 Slice 4

Clock semantics are now explicit and deterministic:

- 4 ticks per simulated minute
- 60 minutes per hour
- 24 hours per day
- 28 days per month
- 13 months per year

Rollover behavior is covered by dedicated tests.

## M2 Slice 5

Persistence API hardening:

- versioned binary snapshot header (`magic`, `version`, `sizes`, `checksum`)
- strict deserialize validation and error codes
- deterministic snapshot roundtrip/hash invariants
- malformed/corrupt input rejection tests

## M3 Slice 1

Command pipeline and replay tooling baseline:

- fixed-size command wire envelope (for client/network ingestion boundary)
- command stream decode helper with strict validation
- replay checkpoint log writer (`tick,hash`) for deterministic scenario comparison
