# Network Authority and Persistence

## Why Authority Is Centralized

Legacy was local single-process authority. Modern multiplayer needs one source of truth.

Server authority prevents clients from drifting into different realities of the same room.

Current closure step:

- world-object interaction mutations (`take/drop/put/equip`) are now evaluated by a required compiled sim-core bridge, not ad hoc net-only logic.

## Server Authority Model

`modern/net/server.ts` provides host-authoritative world object state via:

- immutable baseline load (`objblk??` + `objlist`) from `modern/assets/pristine/savegame`
- runtime delta overlay (`removed`, `moved`, `spawned`, `respawns`)

The browser must use the same object baseline provenance as the server. If the client loads a
different savegame object block set, object keys can drift even when the visible room looks
similar. Example failure: the server hid `a1ai228`, but the renderer still drew the same-looking
jug from a different baseline index. Treat client/server baseline mismatch as an authority bug,
not a sprite bug.

## Baseline + Delta Composition

Effective world objects = baseline objects + deltas.

Delta file:

- `modern/net/data/world_object_deltas.json`
- interaction checkpoint log: `modern/net/data/world_interaction_log.json`

Delta meanings:

- `removed[key] = true`: the baseline source object is temporarily hidden.
- `respawns[key]`: when a hidden baseline source object may return.
- `spawned[]`: persistent runtime objects, including inventory clones and dropped clones.
- `moved[key]`: persistent moved baseline object state.

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

## Pickup, Inventory Clone, and Respawn Contract

Taking a baseline world object is not a move of the baseline object. It is a clone operation:

1. The baseline source object remains the canonical parent identity.
2. The source key is added to `removed`.
3. A `respawns[source_key]` entry records when that source may reappear.
4. A new spawned clone is created for the actor inventory.
5. The clone receives a unique key shaped like `inv:<source_key>:<actor_id>:<seq>`.
6. The clone stores `source_object_key = <source_key>` for provenance.

Default source respawn is 10 minutes. Slow loot currently uses 60 minutes for narrow loot ids
such as gold and chests.

Inventory clones are independent objects. They must not alias the baseline source key. Multiple
copies of the same source type are valid unless an explicit future rule forbids a specific class
of object.

## Drop and Despawn Contract

Dropping a carried clone moves the clone back to `LOCXYZ` world coordinates. The original source
object remains hidden until its own respawn window completes.

Dropped clone rules:

- dropped clones keep their `inv:` object key
- dropped clones keep `source_object_key` for provenance
- dropped clones become visible world objects immediately after the throw/land effect
- dropped clones receive `dropped_at_ms` and `despawn_at_ms`
- default dropped-clone despawn is 10 minutes

Do not hide dropped clones just because their `source_object_key` is hidden. A hidden source
means the original baseline object is unavailable; it does not make independently spawned clones
invisible.

## Inventory Safety Invariants

Held avatar inventory is persisted as spawned clone objects, not as legacy snapshot inventory
counters.

For held inventory clones:

- `status` coord-use must be inventory (`0x10`)
- `object_key` should start with `inv:`
- `source_object_key` must be present
- `object_key` must not equal `source_object_key`
- `holder_kind` should be `npc`
- `holder_id` must identify the owning avatar/character
- `dropped_at_ms` and `despawn_at_ms` must be zero while held

Runtime guardrail:

- `inventorySafetyIssuesForSpawnedWorldObjectsRuntime(...)` reports held-clone invariant
  violations.
- `modern/net/tests/world_object_state_runtime_test.ts` covers valid held clones and broken
  examples.

Operational audit:

- inspect `modern/net/data/world_object_deltas.json`
- held inventory rows live in `spawned[]` with coord-use `0x10`
- a healthy avatar inventory should have no held rows with drop/despawn timers

## Implementation Boundary

Canonical object identity and interaction legality stay anchored to legacy object data plus the
compiled sim-core bridge. MMO-only lifecycle behavior is layered around that result:

- `modern/net/world_object_policy.ts`: server-side clone, respawn, and despawn mutations.
- `modern/net/server.ts`: endpoint orchestration, persistence, and object index refresh.
- `modern/client-web/net/world_runtime.ts`: typed client projection helpers for take/drop,
  inventory object selection, and hidden-parent visibility state.
- `modern/client-web/net/world_object_projection_runtime.ts`: pure projection from server world
  rows into client target/object-layer updates.

When debugging pickup/drop bugs, prefer changing these boundary modules with focused tests before
touching renderer code or legacy-derived object ordering. A baseline object being hidden and an
`inv:` clone being visible are both correct at the same time.

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
- whether inventory survives server restart without corrupting source objects

## Why This Feels Like "Renderer Gaslighting"

From a player or tester view, stale authority can look like renderer incompetence:

- "I changed code but room did not change"
- "I reverted code but room is still wrong"
- "Behavior changed only after restart"

Those are often authority lifecycle issues, not composition logic issues.

## Candidate Codex Skill

A project-specific `world-persistence` skill would be useful. It should trigger on requests about:

- inventory persistence, pickup/drop bugs, respawn/despawn behavior
- client/server object mismatch
- source-object versus clone-object identity
- world-object delta audits

Recommended skill contents:

- a concise `SKILL.md` with the investigation workflow
- a reference file containing this persistence contract
- optional scripts for auditing `world_object_deltas.json` and querying `/api/world/objects`

Before creating the actual skill, choose an install location. For auto-discovery, use
`${CODEX_HOME:-$HOME/.codex}/skills/world-persistence`.
