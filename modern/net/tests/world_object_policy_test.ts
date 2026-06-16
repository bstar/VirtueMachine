import assert from "node:assert/strict";
import {
  DEFAULT_PICKUP_RESPAWN_MS,
  DEFAULT_DROPPED_CLONE_DESPAWN_MS,
  LOOT_PICKUP_RESPAWN_MS,
  applyBaselineTakeCloneRuntime,
  applySpawnedObjectLifecycleForInteractionRuntime,
  canPersistSnapshotInventoryKey,
  canTakeWorldObject,
  expireDueWorldObjectLifecycleDeltasRuntime,
  inventoryCloneKeyForTake,
  isBaselineWorldObject,
  normalizeWorldObjectAmountRuntime,
  pickupRespawnPolicyForObject,
  pushSpawnedWorldObject,
  sanitizeSnapshotInventoryBase64,
  sourceObjectKeyFromInventoryCloneKeyRuntime,
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

{
  const spawned = {
    object_key: "inv:a00i001:avatar:1",
    source_kind: "spawned",
    dropped_at_ms: 0,
    despawn_at_ms: 0
  } as Parameters<typeof applySpawnedObjectLifecycleForInteractionRuntime>[0];
  assert.deepEqual(applySpawnedObjectLifecycleForInteractionRuntime(spawned, "drop", 5000), {
    changed: true,
    dropped_at_ms: 5000,
    despawn_at_ms: 5000 + DEFAULT_DROPPED_CLONE_DESPAWN_MS
  });
  assert.equal(spawned.dropped_at_ms, 5000);
  assert.equal(spawned.despawn_at_ms, 5000 + DEFAULT_DROPPED_CLONE_DESPAWN_MS);
  assert.deepEqual(applySpawnedObjectLifecycleForInteractionRuntime(spawned, "take", 6000), {
    changed: true,
    dropped_at_ms: 0,
    despawn_at_ms: 0
  });
  assert.equal(spawned.dropped_at_ms, 0);
  assert.equal(spawned.despawn_at_ms, 0);
}

{
  const baseline = {
    object_key: "a00i001",
    source_kind: "baseline",
    dropped_at_ms: 10,
    despawn_at_ms: 20
  } as Parameters<typeof applySpawnedObjectLifecycleForInteractionRuntime>[0];
  assert.deepEqual(applySpawnedObjectLifecycleForInteractionRuntime(baseline, "drop", 5000), {
    changed: false,
    dropped_at_ms: 10,
    despawn_at_ms: 20
  });
  assert.equal(baseline.dropped_at_ms, 10);
  assert.equal(baseline.despawn_at_ms, 20);
}

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

{
  const state = {
    worldObjects: {
      active: [],
      deltas: {
        schema_version: 1 as const,
        removed: { a00i001: true, a00i002: true },
        moved: {},
        spawned: [{
          object_key: "inv:a00i010:avatar:1",
          source_object_key: "a00i010",
          source_area: 0,
          source_index: 0x10,
          status: 0,
          shape_type: 0x113,
          amount: 0,
          type: 0x113,
          frame: 0,
          tile_id: 0x450,
          x: 10,
          y: 11,
          z: 0,
          holder_kind: "none",
          holder_id: "",
          holder_key: "",
          dropped_at_ms: 1000,
          despawn_at_ms: 2000
        }, {
          object_key: "inv:a00i011:avatar:1",
          source_object_key: "a00i011",
          source_area: 0,
          source_index: 0x11,
          status: 0,
          shape_type: 0x113,
          amount: 0,
          type: 0x113,
          frame: 0,
          tile_id: 0x450,
          x: 12,
          y: 13,
          z: 0,
          holder_kind: "none",
          holder_id: "",
          holder_key: "",
          dropped_at_ms: 1000,
          despawn_at_ms: 5000
        }],
        respawns: {
          a00i001: {
            due_at_ms: 2000,
            taken_at_ms: 1000,
            respawn_ms: 1000,
            policy: "default"
          },
          a00i002: {
            due_at_ms: 5000,
            taken_at_ms: 1000,
            respawn_ms: 4000,
            policy: "default"
          }
        }
      }
    }
  };
  const result = expireDueWorldObjectLifecycleDeltasRuntime(state, 2500);
  assert.deepEqual(result, {
    changed: true,
    expired_object_keys: ["inv:a00i010:avatar:1"],
    matured_respawn_keys: ["a00i001"]
  });
  assert.equal(state.worldObjects.deltas.removed.a00i001, undefined);
  assert.equal(state.worldObjects.deltas.removed.a00i002, true);
  assert.equal(state.worldObjects.deltas.respawns.a00i001, undefined);
  assert.equal(state.worldObjects.deltas.respawns.a00i002?.due_at_ms, 5000);
  assert.deepEqual(
    state.worldObjects.deltas.spawned.map((obj) => obj.object_key),
    ["inv:a00i011:avatar:1"]
  );
  const noOp = expireDueWorldObjectLifecycleDeltasRuntime(state, 3000);
  assert.deepEqual(noOp, {
    changed: false,
    expired_object_keys: [],
    matured_respawn_keys: []
  });
}

assert.equal(
  inventoryCloneKeyForTake(
    { worldInteractionLog: { seq: 41 } },
    { object_key: "a00i001" },
    "avatar:1"
  ),
  "inv:a00i001:avatar:1:42"
);
assert.equal(
  inventoryCloneKeyForTake(
    {
      worldInteractionLog: { seq: 41 },
      worldObjects: {
        active: [{ object_key: "inv:a00i001:avatar:1:42" }],
        deltas: {
          schema_version: 1,
          moved: {},
          removed: {},
          respawns: {},
          spawned: [{
            amount: 0,
            frame: 0,
            holder_id: "avatar:1",
            holder_key: "",
            holder_kind: "npc",
            object_key: "inv:a00i001:avatar:1:42:2",
            shape_type: 0x123,
            source_area: 0,
            source_index: 1,
            source_object_key: "a00i001",
            status: 0x10,
            tile_id: 0x200,
            type: 0x123,
            x: 0,
            y: 0,
            z: 0
          }]
        }
      }
    },
    { object_key: "a00i001" },
    "avatar:1"
  ),
  "inv:a00i001:avatar:1:42:3"
);
assert.equal(sourceObjectKeyFromInventoryCloneKeyRuntime("inv:a00i001:avatar:1:42"), "a00i001");
assert.equal(sourceObjectKeyFromInventoryCloneKeyRuntime("inv:a00i001:"), "a00i001");
assert.equal(sourceObjectKeyFromInventoryCloneKeyRuntime("a00i001"), "");
assert.equal(sourceObjectKeyFromInventoryCloneKeyRuntime("inv:"), "");
assert.equal(sourceObjectKeyFromInventoryCloneKeyRuntime(null), "");
assert.equal(normalizeWorldObjectAmountRuntime(null), 0);
assert.equal(normalizeWorldObjectAmountRuntime(-1), 0);
assert.equal(normalizeWorldObjectAmountRuntime(17.9), 17);
assert.equal(normalizeWorldObjectAmountRuntime(0x1ffff), 0xffff);

{
  const target = {
    object_key: "a00i020",
    source_area: 0,
    source_index: 0x20,
    source_kind: "baseline",
    status: 0,
    shape_type: 0x113,
    amount: 0,
    type: 0x113,
    frame: 1,
    tile_id: 0x451,
    x: 20,
    y: 21,
    z: 0,
    holder_kind: "none",
    holder_id: "",
    holder_key: ""
  };
  const state = {
    worldInteractionLog: { seq: 41 },
    worldObjects: {
      active: [
        target,
        {
          object_key: "a00i021",
          source_area: 0,
          source_index: 0x21,
          source_kind: "baseline",
          status: 0,
          shape_type: 0x113,
          amount: 0,
          type: 0x113,
          frame: 0,
          tile_id: 0x450,
          x: 22,
          y: 23,
          z: 0,
          holder_kind: "none",
          holder_id: "",
          holder_key: ""
        },
        {
          object_key: "inv:a00i022:avatar:1",
          source_object_key: "a00i022",
          source_area: 0,
          source_index: 0x22,
          source_kind: "spawned",
          status: 0x08,
          shape_type: 0x113,
          amount: 0,
          type: 0x113,
          frame: 0,
          tile_id: 0x450,
          x: 20,
          y: 21,
          z: 0,
          holder_kind: "object",
          holder_id: "a00i020",
          holder_key: "a00i020"
        }
      ],
      deltas: {
        schema_version: 1 as const,
        removed: {} as Record<string, boolean>,
        moved: {},
        spawned: [{
          object_key: "inv:a00i022:avatar:1",
          source_object_key: "a00i022",
          source_area: 0,
          source_index: 0x22,
          status: 0x08,
          shape_type: 0x113,
          amount: 0,
          type: 0x113,
          frame: 0,
          tile_id: 0x450,
          x: 20,
          y: 21,
          z: 0,
          holder_kind: "object",
          holder_id: "a00i020",
          holder_key: "a00i020"
        }],
        respawns: {} as Record<string, {
          due_at_ms: number;
          policy: string;
          respawn_ms: number;
          taken_at_ms: number;
        }>
      }
    }
  };
  const result = applyBaselineTakeCloneRuntime(state, target, "avatar", {
    status: 0x10,
    holder_kind: "npc",
    holder_id: "avatar",
    holder_key: ""
  }, 1000);
  assert.equal(result.source, target);
  assert.equal(result.clone.object_key, "inv:a00i020:avatar:42");
  assert.equal(result.clone.source_object_key, "a00i020");
  assert.equal(result.clone.source_kind, "spawned");
  assert.equal(result.clone.status, 0x10);
  assert.equal(result.clone.holder_kind, "npc");
  assert.equal(result.clone.holder_id, "avatar");
  assert.equal(result.respawn.source_object_key, "a00i020");
  assert.equal(result.respawn.due_at_ms, 1000 + DEFAULT_PICKUP_RESPAWN_MS);
  assert.equal(state.worldObjects.deltas.removed.a00i020, true);
  assert.equal(state.worldObjects.deltas.respawns.a00i020?.due_at_ms, 1000 + DEFAULT_PICKUP_RESPAWN_MS);
  assert.deepEqual(state.worldObjects.deltas.spawned.map((obj) => obj.object_key), ["inv:a00i022:avatar:1", "inv:a00i020:avatar:42"]);
  assert.equal(state.worldObjects.deltas.spawned[0].holder_key, "inv:a00i020:avatar:42");
  assert.deepEqual(state.worldObjects.active.map((obj) => obj.object_key), ["a00i021", "inv:a00i022:avatar:1", "inv:a00i020:avatar:42"]);
  assert.equal(state.worldObjects.active[1].holder_key, "inv:a00i020:avatar:42");
}

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
  source_object_key: "a00i001",
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
assert.equal(state.worldObjects.deltas.spawned[0].source_object_key, "a00i001");
assert.equal(state.worldObjects.deltas.spawned[0].type, 88);
assert.equal(state.worldObjects.deltas.spawned[0].amount, 7);

pushSpawnedWorldObject(state, {
  object_key: "inv:a00i002:avatar:1:43",
  source_object_key: "a00i002",
  source_area: 2,
  source_index: 4,
  status: 0x10,
  shape_type: 0x1234,
  amount: -1,
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
assert.equal(state.worldObjects.deltas.spawned[1].amount, 0);

{
  const state = {
    worldObjects: {
      active: [],
      deltas: {
        schema_version: 1,
        moved: {},
        removed: {},
        spawned: [],
        respawns: {}
      }
    }
  } as Parameters<typeof pushSpawnedWorldObject>[0];
  pushSpawnedWorldObject(state, {
    object_key: "inv:a00i777:avatar:1:99",
    source_kind: "spawned",
    source_area: 2,
    source_index: 3,
    status: 0x10,
    shape_type: 0x1234,
    amount: 1,
    type: 0x113,
    frame: 0,
    tile_id: 0x220,
    x: 10,
    y: 11,
    z: 0,
    holder_kind: "npc",
    holder_id: "avatar",
    holder_key: ""
  });
  assert.equal(state.worldObjects.deltas.spawned[0].source_object_key, "a00i777");
}

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
  source_object_key: "src_1",
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
  despawn_at_ms: 0,
  dropped_at_ms: 0,
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
assert.equal(worldObjectInteractionPayload(payloadObject).source_object_key, "src_1");

assert.deepEqual(worldObjectTakeInventoryPayload(payloadObject, { object_key: "src_1" }), {
  object_key: "obj_1",
  source_object_key: "src_1",
  source_kind: "spawned",
  status: 0x10,
  coord_use: 0x10,
  despawn_at_ms: 0,
  dropped_at_ms: 0,
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
assert.equal(worldObjectTakeInventoryPayload({
  ...payloadObject,
  amount: -1
}, { object_key: "src_1" }).amount, 0);
assert.equal(worldObjectTakeInventoryPayload({
  ...payloadObject,
  amount: 0x1ffff
}, { object_key: "src_1" }).amount, 0xffff);

assert.deepEqual(worldObjectInventoryPayload(payloadObject), {
  object_key: "obj_1",
  status: 0x10,
  coord_use: 0x10,
  despawn_at_ms: 0,
  dropped_at_ms: 0,
  holder_kind: "npc",
  holder_id: "avatar",
  holder_key: "",
  type: 88,
  frame: 2,
  tile_id: 0x220,
  amount: 17,
  inventory_key: "0x058:0x02",
  source_object_key: "src_1",
  x: 10,
  y: 11,
  z: 1,
  source_kind: "spawned"
});
assert.equal(worldObjectInventoryPayload({
  ...payloadObject,
  amount: -1
}).amount, 0);
assert.equal(worldObjectInventoryPayload({
  ...payloadObject,
  amount: 0x1ffff
}).amount, 0xffff);
assert.equal(worldObjectInventoryPayload({
  ...payloadObject,
  object_key: "inv:a00i001:avatar:1:42:3",
  source_object_key: ""
}).source_object_key, "a00i001");

console.log("world_object_policy_test: ok");
