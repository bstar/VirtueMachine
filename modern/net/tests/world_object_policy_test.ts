import assert from "node:assert/strict";
import {
  DEFAULT_PICKUP_RESPAWN_MS,
  LOOT_PICKUP_RESPAWN_MS,
  inventoryCloneKeyForTake,
  isBaselineWorldObject,
  pickupRespawnPolicyForObject,
  pushSpawnedWorldObject,
  worldObjectInteractionPayload,
  worldObjectInventoryPayload,
  worldObjectTakeInventoryPayload
} from "../world_object_policy.ts";

assert.deepEqual(
  pickupRespawnPolicyForObject({ type: 0x123 }),
  { policy: "default", respawn_ms: DEFAULT_PICKUP_RESPAWN_MS }
);
assert.deepEqual(
  pickupRespawnPolicyForObject({ type: 88 }),
  { policy: "loot_slow", respawn_ms: LOOT_PICKUP_RESPAWN_MS }
);
assert.deepEqual(
  pickupRespawnPolicyForObject({ type: 89 }),
  { policy: "loot_slow", respawn_ms: LOOT_PICKUP_RESPAWN_MS }
);
assert.deepEqual(
  pickupRespawnPolicyForObject({ type: 98 }),
  { policy: "loot_slow", respawn_ms: LOOT_PICKUP_RESPAWN_MS }
);

assert.equal(isBaselineWorldObject({ source_kind: "baseline" }), true);
assert.equal(isBaselineWorldObject({ source_kind: "baseline_moved" }), true);
assert.equal(isBaselineWorldObject({ source_kind: "spawned" }), false);

assert.equal(
  inventoryCloneKeyForTake(
    { worldInteractionLog: { seq: 41 } },
    { object_key: "a00i001" },
    "avatar:1"
  ),
  "inv:a00i001:avatar:1:42"
);

const state = {
  worldObjects: {
    active: [],
    deltas: {
      schema_version: 1,
      moved: {},
      spawned: [],
      respawns: {}
    }
  }
} as Parameters<typeof pushSpawnedWorldObject>[0];
pushSpawnedWorldObject(state, {
  object_key: "inv:a00i001:avatar:1:42",
  source_area: 2,
  source_index: 3,
  status: 0x10,
  shape_type: 0x1234,
  amount: 7,
  type: 88,
  frame: 1,
  tile_id: 0x220,
  x: 10,
  y: 11,
  z: 0,
  holder_kind: "npc",
  holder_id: "avatar",
  holder_key: ""
});
assert.equal(state.worldObjects.deltas.spawned.length, 1);
assert.equal(state.worldObjects.deltas.spawned[0].object_key, "inv:a00i001:avatar:1:42");
assert.equal(state.worldObjects.deltas.spawned[0].type, 88);

const payloadObject = {
  object_key: "obj_1",
  status: 0x10,
  holder_kind: "npc",
  holder_id: "avatar",
  holder_key: "",
  type: 88,
  frame: 2,
  tile_id: 0x220,
  amount: 17,
  x: 10,
  y: 11,
  z: 1,
  source_kind: "spawned"
};

assert.deepEqual(worldObjectInteractionPayload(payloadObject, {
  assocChain: ["obj_1", 7],
  blockedBy: "wall",
  rootAnchorKey: "root_1",
  sourceObject: { object_key: "src_1" }
}), {
  object_key: "obj_1",
  source_object_key: "src_1",
  status: 0x10,
  coord_use: 0x10,
  holder_kind: "npc",
  holder_id: "avatar",
  holder_key: "",
  type: 88,
  frame: 2,
  tile_id: 0x220,
  x: 10,
  y: 11,
  z: 1,
  assoc_chain: ["obj_1", "7"],
  root_anchor_key: "root_1",
  blocked_by: "wall"
});

assert.deepEqual(worldObjectTakeInventoryPayload(payloadObject, { object_key: "src_1" }), {
  object_key: "obj_1",
  source_object_key: "src_1",
  status: 0x10,
  coord_use: 0x10,
  holder_kind: "npc",
  holder_id: "avatar",
  holder_key: "",
  type: 88,
  frame: 2,
  tile_id: 0x220,
  x: 10,
  y: 11,
  z: 1
});

assert.deepEqual(worldObjectInventoryPayload(payloadObject), {
  object_key: "obj_1",
  status: 0x10,
  coord_use: 0x10,
  holder_kind: "npc",
  holder_id: "avatar",
  holder_key: "",
  type: 88,
  frame: 2,
  tile_id: 0x220,
  amount: 17,
  x: 10,
  y: 11,
  z: 1,
  source_kind: "spawned"
});

console.log("world_object_policy_test: ok");
