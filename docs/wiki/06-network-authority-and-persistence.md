# Network Authority and Persistence

## Why Authority Is Centralized

Legacy was local single-process authority. Modern multiplayer needs one source of truth.

Server authority prevents clients from drifting into different realities of the same room.

Current closure step:

- world-object interaction mutations (`take/drop/put/equip`) are now evaluated by a required compiled sim-core bridge, not ad hoc net-only logic.

## Server Authority Model

`modern/net/server.ts` provides host-authoritative world object state via:

- immutable baseline load (`objblk??` + `objlist`)
- runtime delta overlay (removed/moved/spawned)

## Baseline + Delta Composition

Effective world objects = baseline objects + deltas.

Delta file:

- `modern/net/data/world_object_deltas.json`
- interaction checkpoint log: `modern/net/data/world_interaction_log.json`

If visuals do not change after baseline fixes, check whether stale deltas are still overriding cells.

This is a frequent false-negative trap during parity work: baseline was fixed correctly, but live delta overlays still present old wrong placements.

## Runtime Data Files

Common files:

- `modern/net/data/world_snapshot.json`
- `modern/net/data/world_object_deltas.json`
- `modern/net/data/characters.json`
- `modern/net/data/users.json`

Operational note:

- these files are runtime artifacts and should generally not be committed as source changes unless intentionally updating seeded defaults/contracts

## Operational Nuance

Changing baseline files alone may not update a running server process until baseline reload or process restart.

Useful script:

- `modern/tools/reload_net_baseline.ts`

If parity changes seem ignored, use this order:

1. confirm baseline files changed
2. confirm runtime process reloaded baseline
3. confirm deltas are cleared or expected
4. confirm client session is reading post-reload authority

## Contract Intent

The network layer should not invent gameplay semantics. It should transport and persist authoritative state while preserving deterministic core behavior.

Practical contract additions:

- interaction mutation responses include `interaction_checkpoint` (`seq`, `hash`)
- replaying the same command stream after baseline reset is expected to produce the same checkpoint hash
- bridge binary requirement is explicit (`VM_SIM_CORE_INTERACT_REQUIRED=on` by default)

## Player-Visible Impact

This layer determines:

- whether two players see the same candle on the same table
- whether restarts preserve intended world changes
- whether old deltas silently override fresh baselines

## Why This Feels Like "Renderer Gaslighting"

From a player or tester view, stale authority can look like renderer incompetence:

- "I changed code but room did not change"
- "I reverted code but room is still wrong"
- "Behavior changed only after restart"

Those are often authority lifecycle issues, not composition logic issues.
