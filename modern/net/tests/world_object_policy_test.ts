import assert from "node:assert/strict";
import {
  DEFAULT_PICKUP_RESPAWN_MS,
  LOOT_PICKUP_RESPAWN_MS,
  canPersistSnapshotInventoryKey,
  canTakeWorldObject,
  inventoryCloneKeyForTake,
  isBaselineWorldObject,
  pickupRespawnPolicyForObject,
  pushSpawnedWorldObject,
  sanitizeSnapshotInventoryBase64,
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
assert.equal(canTakeWorldObject({ type: 0x113 }), true, "potions should be takeable");
assert.equal(canTakeWorldObject({ type: 0x117 }), false, "tables must not be takeable");
assert.equal(canTakeWorldObject({ type: 0x104 }), false, "structural shadows must not be takeable");
assert.equal(canTakeWorldObject({ type: 0x14c }), false, "signs must not be takeable");
assert.equal(canTakeWorldObject({ type: 0x0e0 }), false, "foot rails must not be takeable");
{
  const typeWeights = new Uint8Array(0x400);
  typeWeights[0x113] = 3;
  typeWeights[0x132] = 0;
  typeWeights[0x058] = 0;
  assert.equal(canTakeWorldObject({ type: 0x113 }, typeWeights), true, "weighted potions should be takeable");
  assert.equal(canTakeWorldObject({ type: 0x132 }, typeWeights), false, "zero-weight fixtures must not be takeable");
  assert.equal(canTakeWorldObject({ type: 0x058 }, typeWeights), true, "gold remains takeable despite zero-weight exception");
}
assert.equal(canPersistSnapshotInventoryKey("0x113:0x00"), true, "potion inventory keys should persist");
assert.equal(canPersistSnapshotInventoryKey("0x117:0x04"), false, "table inventory keys should be scrubbed");
assert.equal(canPersistSnapshotInventoryKey("0x14c:0x03"), false, "sign inventory keys should be scrubbed");
assert.equal(canPersistSnapshotInventoryKey("0x0e0:0x03"), false, "foot rail inventory keys should be scrubbed");
assert.equal(canPersistSnapshotInventoryKey("not-a-type-key"), true, "unknown inventory key formats should be preserved");

const dirtySnapshotBase64 = Buffer.from(JSON.stringify({
  tick: 1,
  inventory: {
    "0x113:0x00": 1,
    "0x117:0x04": 2,
    "0x104:0x00": 1,
    "0x14c:0x03": 1,
    "0x0e0:0x03": 1
  }
}), "utf8").toString("base64");
const cleanSnapshot = JSON.parse(Buffer.from(sanitizeSnapshotInventoryBase64(dirtySnapshotBase64), "base64").toString("utf8"));
assert.deepEqual(cleanSnapshot.inventory, { "0x113:0x00": 1 });
assert.equal(sanitizeSnapshotInventoryBase64("not-json"), "not-json");

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
  source_kind: "spawned",
  status: 0x10,
  coord_use: 0x10,
  holder_kind: "npc",
  holder_id: "avatar",
  holder_key: "",
  type: 88,
  frame: 2,
  tile_id: 0x220,
  amount: 17,
  inventory_key: "0x058:0x02",
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
  inventory_key: "0x058:0x02",
  source_object_key: "",
  x: 10,
  y: 11,
  z: 1,
  source_kind: "spawned"
});

console.log("world_object_policy_test: ok");
