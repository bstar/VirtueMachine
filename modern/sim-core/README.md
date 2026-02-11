# sim-core (M1 Bootstrap)

Authoritative simulation prototype with deterministic tick stepping.

## Files

- `include/sim_core.h`: API and simulation data types.
- `src/sim_core.c`: deterministic tick loop, command application, state hash.
- `tests/test_replay.c`: replay determinism + golden-hash regression check.

## Intent

This is not full gameplay yet. It establishes the deterministic execution contract required for:

- faithful legacy behavior regression checks
- UI decoupling from gameplay authority
- future lockstep multiplayer
