import assert from "node:assert/strict";
import {
  applyInventoryProjectionFromServerObjectsRuntime,
  applyHiddenWorldObjectsMetaToClientRuntime,
  collectWorldItemsForMaintenanceFromLayer,
  clearObjectTransientStateRuntime,
  applyTakeProjectionToInventoryRuntime,
  bindCriticalMaintenanceButtonRuntime,
  bindIntroPhaseButtonRuntime,
  criticalMaintenanceDiagRuntime,
  criticalMaintenanceFailureRuntime,
  dropThrowPlanRuntime,
  expiredWorldObjectKeysFromMetaRuntime,
  hiddenWorldObjectKeysFromMetaRuntime,
  hiddenWorldObjectLayerPlanRuntime,
  hiddenWorldObjectMetaUpdateRuntime,
  hiddenWorldObjectRowsFromMetaRuntime,
  hiddenWorldObjectVisibilityRuntime,
  introPhaseSetPresentationRuntime,
  introPhaseUpdateFailureRuntime,
  inventoryCountMapForDropValidationRuntime,
  inventoryDisplayEntriesFromObjectsRuntime,
  inventorySyncFailureDiagRuntime,
  inventoryIdentityFromServerObjectRuntime,
  inventoryItemFromTakeResponseRuntime,
  isHiddenWorldObjectKeyRuntime,
  inventoryObjectForDropSelectionRuntime,
  inventoryObjectsFromServerObjectsRuntime,
  inventoryProjectionFromServerObjectsRuntime,
  inventoryProjectionCountForObjectRuntime,
  inventoryProjectionStateFromServerObjectsRuntime,
  inventoryTileProjectionFromServerObjectsRuntime,
  hiddenWorldObjectVisibilityForClientRuntime,
  markHiddenWorldObjectClientStateRuntime,
  markedHiddenWorldObjectKeysRuntime,
  normalizeIntroPhaseRuntime,
  purgeExpiredHiddenWorldObjectKeysRuntime,
  removeHiddenWorldObjectsFromLayerRuntime,
  requestDropWorldObjectRuntime,
  requestIntroPhaseRuntime,
  requestWorldObjectsAtCell,
  requestTakeWorldObjectRuntime,
  requiredWorldObjectActorIdRuntime,
  serverObjectKeyForWorldObjectRuntime,
  setIntroPhaseRuntime,
  shouldHideServerWorldObjectFromLayerRuntime,
  sourceObjectKeyFromTakeResponseRuntime,
  takeProjectionFromResponseRuntime,
  runCriticalMaintenanceRuntime,
  worldInventorySourcesFromJsonRuntime,
  type WorldRuntimeInventoryObject
} from "../net/world_runtime.ts";

type NetWorldTestListener = {
  current?: () => void;
};

assert.equal(serverObjectKeyForWorldObjectRuntime({ object_key: " direct " }), "direct");
assert.equal(serverObjectKeyForWorldObjectRuntime({ objectKey: "camel" }), "camel");
assert.equal(serverObjectKeyForWorldObjectRuntime({ sourceArea: 5, index: 9 }), "a05i009");
assert.equal(serverObjectKeyForWorldObjectRuntime({ source_area: 0x2a, source_index: 0x1b }), "a2ai01b");
assert.equal(serverObjectKeyForWorldObjectRuntime({ sourceArea: "bad", index: 9 }), "");
assert.equal(serverObjectKeyForWorldObjectRuntime(null), "");
assert.equal(requiredWorldObjectActorIdRuntime(" avatar-1 "), "avatar-1");
assert.throws(() => requiredWorldObjectActorIdRuntime(""), /requires a character id/);
assert.throws(() => requiredWorldObjectActorIdRuntime(null), /requires a character id/);

assert.deepEqual(inventoryIdentityFromServerObjectRuntime({
  frame: 0,
  tile_id: 0x500,
  type: 0x120
}), {
  frame: 0,
  inventory_key: "0x120:0x00",
  stackable: false,
  tile_hex: "0x500",
  tile_id: 0x500,
  type: 0x120
});
assert.deepEqual(inventoryIdentityFromServerObjectRuntime({
  frame: 0,
  inventory_key: "server:key",
  tile_id: 0,
  type: 0x05a
}), {
  frame: 0,
  inventory_key: "server:key",
  stackable: true,
  tile_hex: undefined,
  tile_id: 0,
  type: 0x05a
});
assert.equal(inventoryIdentityFromServerObjectRuntime({ frame: "bad", type: 0x120 }), null);
assert.equal(inventoryIdentityFromServerObjectRuntime(null), null);

const hiddenKeys = new Set(["a1ai228"]);
const isHiddenForLayerTest = (key: string): boolean => hiddenKeys.has(key);
assert.equal(shouldHideServerWorldObjectFromLayerRuntime({
  object_key: "a1ai228",
  source_kind: "baseline"
}, isHiddenForLayerTest), true);
assert.equal(shouldHideServerWorldObjectFromLayerRuntime({
  object_key: "inv:a1ai228:avatar:1",
  source_kind: "spawned",
  source_object_key: "a1ai228"
}, isHiddenForLayerTest), false);
assert.equal(shouldHideServerWorldObjectFromLayerRuntime({
  object_key: "a1ai999",
  source_kind: "baseline_moved",
  source_object_key: "a1ai228"
}, isHiddenForLayerTest), true);

{
  const transientState = {
    doorOpenStates: { d1: true },
    removedObjectAtTick: { o1: 42 },
    removedObjectCount: 1,
    removedObjectKeys: { o1: true }
  };
  assert.equal(clearObjectTransientStateRuntime(transientState), true);
  assert.deepEqual(transientState, {
    doorOpenStates: {},
    removedObjectAtTick: {},
    removedObjectCount: 0,
    removedObjectKeys: {}
  });
  assert.equal(clearObjectTransientStateRuntime(null), false);
}

const decodedInventorySources = worldInventorySourcesFromJsonRuntime([
  { type: 0x123, frame: 0, tile_id: 0x345 },
  { type: 0x123, frame: 0 },
  { type: 0x123, frame: 1, tile_id: 0x346 },
  { type: "bad", frame: 1 },
  null
]);
assert.deepEqual(inventoryProjectionFromServerObjectsRuntime(decodedInventorySources), {
  "0x123:0x00": 2,
  "0x123:0x01": 1
});
assert.equal(inventoryProjectionCountForObjectRuntime(null), 0);
assert.equal(inventoryProjectionCountForObjectRuntime({ type: 0x120, frame: 0, amount: 99 }), 1);
assert.equal(inventoryProjectionCountForObjectRuntime({ type: 0x05a, frame: 0, amount: 3 }), 3);
assert.equal(inventoryProjectionCountForObjectRuntime({ type: 0x05a, frame: 0, amount: 0 }), 1);
assert.equal(inventoryProjectionCountForObjectRuntime({ type: 0x05a, frame: 0, amount: -1 }), 1);
assert.equal(inventoryProjectionCountForObjectRuntime({ type: 0x05a, frame: 0, amount: 0x1ffff }), 0xffff);
assert.equal(inventoryProjectionCountForObjectRuntime({ type: 0x05a, frame: 1, amount: 3 }), 1);
assert.deepEqual(inventoryProjectionFromServerObjectsRuntime([
  { type: 0x120, frame: 0, amount: 99 },
  { type: 0x120, frame: 0, amount: 1 },
  { type: 0x05a, frame: 0, amount: 2 },
  { type: 0x05a, frame: 0, amount: 3 },
  { type: 0x05a, frame: 1, amount: 7 }
]), {
  "0x120:0x00": 2,
  "0x05a:0x00": 5,
  "0x05a:0x01": 1
});
assert.deepEqual(inventoryProjectionFromServerObjectsRuntime([
  { type: 0x120, frame: 0, inventory_key: "server:cup:a", amount: 1 },
  { type: 0x120, frame: 0, inventory_key: "server:cup:a", amount: 1 }
]), {
  "server:cup:a": 2
});
assert.deepEqual(inventoryTileProjectionFromServerObjectsRuntime([
  { type: 0x120, frame: 0, inventory_key: "server:cup:a", tile_id: 0x500 }
]), {
  "server:cup:a": 0x500
});
assert.deepEqual(inventoryTileProjectionFromServerObjectsRuntime(decodedInventorySources), {
  "0x123:0x00": 0x345,
  "0x123:0x01": 0x346
});
assert.deepEqual(inventoryObjectsFromServerObjectsRuntime([
  {
    amount: -1,
    frame: 0,
    object_key: "inv:a00i001:avatar:amount-negative",
    tile_id: 0x500,
    type: 0x120
  },
  {
    amount: 0x1ffff,
    frame: 0,
    object_key: "inv:a00i001:avatar:amount-oversized",
    tile_id: 0x500,
    type: 0x05a
  }
]).map((obj) => obj.amount), [0, 0xffff]);
assert.deepEqual(inventoryProjectionStateFromServerObjectsRuntime([
  {
    amount: 1,
    frame: 0,
    holder_id: "avatar",
    inventory_key: "0x120:0x00",
    object_key: "inv:a00i001:avatar:1",
    source_object_key: "a00i001",
    status: 0x10,
    tile_id: 0x500,
    type: 0x120
  },
  {
    amount: 1,
    frame: 0,
    holder_id: "avatar",
    inventory_key: "0x120:0x00",
    object_key: "inv:a00i002:avatar:2",
    source_object_key: "a00i002",
    status: 0x10,
    tile_id: 0x500,
    type: 0x120
  },
  null,
  { frame: "bad", type: 0x120 }
]), {
  inventory: { "0x120:0x00": 2 },
  inventoryObjects: [
    {
      amount: 1,
      frame: 0,
      holder_id: "avatar",
      holder_key: "",
      holder_kind: "",
      inventory_key: "0x120:0x00",
      object_key: "inv:a00i001:avatar:1",
      source_kind: "",
      source_object_key: "a00i001",
      status: 0x10,
      tile_id: 0x500,
      type: 0x120,
      x: 0,
      y: 0,
      z: 0
    },
    {
      amount: 1,
      frame: 0,
      holder_id: "avatar",
      holder_key: "",
      holder_kind: "",
      inventory_key: "0x120:0x00",
      object_key: "inv:a00i002:avatar:2",
      source_kind: "",
      source_object_key: "a00i002",
      status: 0x10,
      tile_id: 0x500,
      type: 0x120,
      x: 0,
      y: 0,
      z: 0
    }
  ],
  inventoryTiles: { "0x120:0x00": 0x500 }
});
{
  const sim = {
    inventory: { stale: 1 },
    inventoryObjects: [],
    inventoryTiles: { stale: 0x111 }
  };
  const projection = applyInventoryProjectionFromServerObjectsRuntime(sim, [{
    amount: 1,
    frame: 0,
    holder_id: "avatar",
    inventory_key: "0x120:0x00",
    object_key: "inv:a00i001:avatar:1",
    source_object_key: "a00i001",
    status: 0x10,
    tile_id: 0x500,
    type: 0x120
  }]);
  assert.deepEqual(projection, {
    inventory: { "0x120:0x00": 1 },
    inventoryObjects: [{
      amount: 1,
      frame: 0,
      holder_id: "avatar",
      holder_key: "",
      holder_kind: "",
      inventory_key: "0x120:0x00",
      object_key: "inv:a00i001:avatar:1",
      source_kind: "",
      source_object_key: "a00i001",
      status: 0x10,
      tile_id: 0x500,
      type: 0x120,
      x: 0,
      y: 0,
      z: 0
    }],
    inventoryTiles: { "0x120:0x00": 0x500 }
  });
  assert.deepEqual(sim, projection);
  assert.equal(applyInventoryProjectionFromServerObjectsRuntime(null, []), null);
}
{
  const sim = {
    inventory: { stale: 1 },
    inventoryObjects: [{
      amount: 1,
      frame: 0,
      holder_id: "avatar",
      holder_key: "",
      holder_kind: "npc",
      inventory_key: "0x120:0x00",
      object_key: "stale-clone",
      source_kind: "spawned",
      source_object_key: "stale-source",
      status: 0x10,
      tile_id: 0x500,
      type: 0x120,
      x: 0,
      y: 0,
      z: 0
    }],
    inventoryTiles: { stale: 0x111 }
  };
  const projection = applyInventoryProjectionFromServerObjectsRuntime(sim, [
    {
      amount: 1,
      frame: 0,
      holder_id: "avatar",
      holder_kind: "npc",
      inventory_key: "0x120:0x00",
      object_key: "inv:a00i001:avatar:1",
      source_kind: "spawned",
      source_object_key: "a00i001",
      status: 0x10,
      tile_id: 0x500,
      type: 0x120
    },
    {
      amount: 1,
      frame: 0,
      holder_id: "avatar",
      holder_kind: "npc",
      inventory_key: "0x120:0x00",
      object_key: "inv:a00i002:avatar:2",
      source_kind: "spawned",
      source_object_key: "a00i002",
      status: 0x10,
      tile_id: 0x500,
      type: 0x120
    }
  ]);
  assert.deepEqual(projection?.inventory, { "0x120:0x00": 2 });
  assert.deepEqual(projection?.inventoryObjects.map((obj) => obj.object_key), [
    "inv:a00i001:avatar:1",
    "inv:a00i002:avatar:2"
  ]);
  assert.deepEqual(inventoryDisplayEntriesFromObjectsRuntime(sim.inventoryObjects).map((entry) => ({
    key: entry.key,
    object_key: entry.object_key,
    stackable: entry.stackable
  })), [{
    key: "inv:a00i001:avatar:1",
    object_key: "inv:a00i001:avatar:1",
    stackable: false
  }, {
    key: "inv:a00i002:avatar:2",
    object_key: "inv:a00i002:avatar:2",
    stackable: false
  }]);
  const afterDropProjection = applyInventoryProjectionFromServerObjectsRuntime(sim, []);
  assert.deepEqual(afterDropProjection, {
    inventory: {},
    inventoryObjects: [],
    inventoryTiles: {}
  });
  assert.deepEqual(sim, afterDropProjection);
}
assert.deepEqual(inventoryObjectsFromServerObjectsRuntime([
  {
    amount: 3,
    frame: 2,
    holder_id: "avatar",
    holder_kind: "npc",
    inventory_key: "0x113:0x02",
    object_key: "inv:a01i002:avatar:1",
    source_object_key: "a01i002",
    status: 0x10,
    tile_id: 0x914,
    type: 0x113,
    x: 11,
    y: 12,
    z: 0
  },
  { type: 0x123, frame: 0 }
]), [{
  amount: 3,
  frame: 2,
  holder_id: "avatar",
  holder_key: "",
  holder_kind: "npc",
  inventory_key: "0x113:0x02",
  object_key: "inv:a01i002:avatar:1",
  source_kind: "",
  source_object_key: "a01i002",
  status: 0x10,
  tile_id: 0x914,
  type: 0x113,
  x: 11,
  y: 12,
  z: 0
}]);
assert.deepEqual(inventoryDisplayEntriesFromObjectsRuntime([
  {
    amount: 0,
    frame: 0,
    holder_id: "avatar",
    holder_key: "",
    holder_kind: "npc",
    inventory_key: "0x120:0x00",
    object_key: "cup-1",
    source_kind: "spawned",
    source_object_key: "a00i001",
    status: 0x10,
    tile_id: 0x500,
    type: 0x120,
    x: 0,
    y: 0,
    z: 0
  },
  {
    amount: 0,
    frame: 0,
    holder_id: "avatar",
    holder_key: "",
    holder_kind: "npc",
    inventory_key: "0x120:0x00",
    object_key: "cup-2",
    source_kind: "spawned",
    source_object_key: "a00i002",
    status: 0x10,
    tile_id: 0x500,
    type: 0x120,
    x: 0,
    y: 0,
    z: 0
  },
  {
    amount: 2,
    frame: 0,
    holder_id: "avatar",
    holder_key: "",
    holder_kind: "npc",
    inventory_key: "0x05a:0x00",
    object_key: "torch-stack-a",
    source_kind: "spawned",
    source_object_key: "a00i003",
    status: 0x10,
    tile_id: 0x240,
    type: 0x05a,
    x: 0,
    y: 0,
    z: 0
  },
  {
    amount: 3,
    frame: 0,
    holder_id: "avatar",
    holder_key: "",
    holder_kind: "npc",
    inventory_key: "0x05a:0x00",
    object_key: "torch-stack-b",
    source_kind: "spawned",
    source_object_key: "a00i004",
    status: 0x10,
    tile_id: 0x240,
    type: 0x05a,
    x: 0,
    y: 0,
    z: 0
  },
  {
    amount: -1,
    frame: 0,
    holder_id: "avatar",
    holder_key: "",
    holder_kind: "npc",
    inventory_key: "0x05a:0x00",
    object_key: "negative-torch-count",
    source_kind: "spawned",
    source_object_key: "a00i006",
    status: 0x10,
    tile_id: 0x240,
    type: 0x05a,
    x: 0,
    y: 0,
    z: 0
  },
  {
    amount: 1,
    frame: 1,
    holder_id: "avatar",
    holder_key: "",
    holder_kind: "npc",
    inventory_key: "0x05a:0x01",
    object_key: "torch-lit",
    source_kind: "spawned",
    source_object_key: "a00i005",
    status: 0x10,
    tile_id: 0x241,
    type: 0x05a,
    x: 0,
    y: 0,
    z: 0
  }
]), [
  {
    count: 1,
    frame: 0,
    inventory_key: "0x120:0x00",
    key: "cup-1",
    object_key: "cup-1",
    stackable: false,
    tile_hex: "0x500",
    tile_id: 0x500,
    type: 0x120
  },
  {
    count: 1,
    frame: 0,
    inventory_key: "0x120:0x00",
    key: "cup-2",
    object_key: "cup-2",
    stackable: false,
    tile_hex: "0x500",
    tile_id: 0x500,
    type: 0x120
  },
  {
    count: 6,
    frame: 0,
    inventory_key: "0x05a:0x00",
    key: "0x05a:0x00",
    stackable: true,
    tile_hex: "0x240",
    tile_id: 0x240,
    type: 0x05a
  },
  {
    count: 1,
    frame: 1,
    inventory_key: "0x05a:0x01",
    key: "torch-lit",
    object_key: "torch-lit",
    stackable: false,
    tile_hex: "0x241",
    tile_id: 0x241,
    type: 0x05a
  }
]);
const dropSelectionObjects = inventoryObjectsFromServerObjectsRuntime([
  {
    amount: 1,
    frame: 0,
    inventory_key: "0x120:0x00",
    object_key: "cup-1",
    tile_id: 0x500,
    type: 0x120
  },
  {
    amount: 1,
    frame: 0,
    inventory_key: "0x120:0x00",
    object_key: "cup-2",
    tile_id: 0x500,
    type: 0x120
  },
  {
    amount: 2,
    frame: 0,
    inventory_key: "0x05a:0x00",
    object_key: "torch-stack-a",
    tile_id: 0x240,
    type: 0x05a
  },
  {
    amount: 3,
    frame: 0,
    inventory_key: "0x05a:0x00",
    object_key: "torch-stack-b",
    tile_id: 0x240,
    type: 0x05a
  }
]);
assert.equal(
  inventoryObjectForDropSelectionRuntime(dropSelectionObjects, { kind: "inventory", index: 1 })?.object_key,
  "cup-2"
);
assert.equal(
  inventoryObjectForDropSelectionRuntime(dropSelectionObjects, { kind: "inventory", index: 2 })?.object_key,
  "torch-stack-a"
);
assert.equal(
  inventoryObjectForDropSelectionRuntime(dropSelectionObjects, null)?.object_key,
  "cup-1"
);
assert.equal(inventoryObjectForDropSelectionRuntime([], { kind: "inventory", index: 0 }), null);
assert.deepEqual(
  inventoryCountMapForDropValidationRuntime({ "0x120:0x00": 2 }, dropSelectionObjects),
  { "0x120:0x00": 2 }
);
assert.deepEqual(
  inventoryCountMapForDropValidationRuntime({}, dropSelectionObjects),
  {
    "0x120:0x00": 2,
    "0x05a:0x00": 5
  }
);

assert.equal(decodedInventorySources.length, 4);
assert.deepEqual(worldInventorySourcesFromJsonRuntime(null), []);
assert.deepEqual(inventoryProjectionFromServerObjectsRuntime(null), {});
assert.deepEqual(inventoryTileProjectionFromServerObjectsRuntime(null), {});

assert.deepEqual(hiddenWorldObjectKeysFromMetaRuntime({
  hidden_objects: [
    { object_key: "a00i001", due_at_ms: 2000 },
    { object_key: "a00i002", due_at_ms: 9000 },
    { object_key: "a00i003" },
    { object_key: "" },
    null
  ]
}, 1000, 600), {
  a00i001: 2000,
  a00i002: 9000,
  a00i003: 1600
});
assert.deepEqual(hiddenWorldObjectRowsFromMetaRuntime({
  hidden_objects: [
    { object_key: " a00i003 ", due_at_ms: 2000.8 },
    { object_key: "a00i002", due_at_ms: 2000 },
    { object_key: "a00i001" },
    { object_key: "expired", due_at_ms: 1000 }
  ]
}, 1000, 600), [
  { due_at_ms: 1600, object_key: "a00i001" },
  { due_at_ms: 2000, object_key: "a00i002" },
  { due_at_ms: 2000, object_key: "a00i003" }
]);
assert.equal(hiddenWorldObjectRowsFromMetaRuntime({}, 1000, 600), null);
assert.deepEqual(hiddenWorldObjectKeysFromMetaRuntime({ hidden_objects: [
  { object_key: "expired", due_at_ms: 999 }
] }, 1000, 600), {});
assert.equal(hiddenWorldObjectKeysFromMetaRuntime({}, 1000, 600), null);
assert.deepEqual(expiredWorldObjectKeysFromMetaRuntime({
  expired_objects: [" a00i004 ", "", null, "a00i005"]
}), ["a00i004", "a00i005"]);
assert.deepEqual(expiredWorldObjectKeysFromMetaRuntime({}), []);
assert.deepEqual(hiddenWorldObjectMetaUpdateRuntime({
  expired_objects: [" a00i004 "],
  hidden_objects: [
    { object_key: "a00i002", due_at_ms: 2500 },
    { object_key: "expired", due_at_ms: 1000 }
  ]
}, 1000, 600), {
  expiredObjectKeys: ["a00i004"],
  hiddenWorldObjectKeys: { a00i002: 2500 }
});
assert.deepEqual(hiddenWorldObjectMetaUpdateRuntime(null, 1000, 600), {
  expiredObjectKeys: [],
  hiddenWorldObjectKeys: null
});
assert.deepEqual(hiddenWorldObjectLayerPlanRuntime({
  expired_objects: ["a00i004", "a00i002"],
  hidden_objects: [
    { object_key: "a00i002", due_at_ms: 2500 },
    { object_key: "a00i003", due_at_ms: 2600 },
    { object_key: "expired", due_at_ms: 1000 }
  ]
}, 1000, 600), {
  hiddenWorldObjectKeys: {
    a00i002: 2500,
    a00i003: 2600
  },
  removeObjectKeys: ["a00i004", "a00i002", "a00i003"]
});
assert.deepEqual(markedHiddenWorldObjectKeysRuntime({
  a00i001: 2000
}, " a00i002 ", 9000, 1000, 600), {
  a00i001: 2000,
  a00i002: 9000
});
assert.deepEqual(markedHiddenWorldObjectKeysRuntime({}, "a00i003", 0, 1000, 600), {
  a00i003: 1600
});
assert.deepEqual(markedHiddenWorldObjectKeysRuntime({ a00i001: 2000 }, "", 9000, 1000, 600), {
  a00i001: 2000
});
assert.deepEqual(purgeExpiredHiddenWorldObjectKeysRuntime({
  a00i001: 999,
  a00i002: 1000,
  a00i003: 1001
}, 1000), {
  expiredKeys: ["a00i001", "a00i002"],
  hiddenWorldObjectKeys: { a00i003: 1001 }
});
assert.equal(isHiddenWorldObjectKeyRuntime({ a00i001: 1001 }, "a00i001", 1000), true);
assert.equal(isHiddenWorldObjectKeyRuntime({ a00i001: 1000 }, "a00i001", 1000), false);
assert.equal(isHiddenWorldObjectKeyRuntime({ a00i001: 1001 }, "", 1000), false);
assert.deepEqual(hiddenWorldObjectVisibilityRuntime({
  a00i001: 999,
  a00i002: 1001
}, "a00i002", 1000), {
  expiredKeys: ["a00i001"],
  hidden: true,
  hiddenWorldObjectKeys: { a00i002: 1001 }
});
{
  const state = { hiddenWorldObjectKeys: { a00i001: 2000 } };
  assert.deepEqual(markHiddenWorldObjectClientStateRuntime(state, " a00i002 ", 0, 1000, 600), {
    a00i001: 2000,
    a00i002: 1600
  });
  assert.deepEqual(state.hiddenWorldObjectKeys, {
    a00i001: 2000,
    a00i002: 1600
  });
}
{
  const removed: string[] = [];
  const layer = {
    removeRuntimeEntryByAuthoritativeKey: (key: string) => removed.push(key)
  };
  assert.deepEqual(removeHiddenWorldObjectsFromLayerRuntime(layer, {
    a00i001: 2000,
    a00i002: 3000
  }), ["a00i001", "a00i002"]);
  assert.deepEqual(removed, ["a00i001", "a00i002"]);
  assert.deepEqual(removeHiddenWorldObjectsFromLayerRuntime(null, { a00i003: 4000 }), ["a00i003"]);
}
{
  const state = { hiddenWorldObjectKeys: { old: 9000 } };
  const removed: string[] = [];
  const plan = applyHiddenWorldObjectsMetaToClientRuntime({
    fallbackRespawnMs: 600,
    layer: {
      removeRuntimeEntryByAuthoritativeKey: (key: string) => removed.push(key)
    },
    meta: {
      expired_objects: ["a00i004"],
      hidden_objects: [
        { object_key: "a00i002", due_at_ms: 2500 },
        { object_key: "expired", due_at_ms: 999 }
      ]
    },
    nowMs: 1000,
    state
  });
  assert.deepEqual(plan, {
    hiddenWorldObjectKeys: { a00i002: 2500 },
    removeObjectKeys: ["a00i004", "a00i002"]
  });
  assert.deepEqual(removed, ["a00i004", "a00i002"]);
  assert.deepEqual(state.hiddenWorldObjectKeys, { a00i002: 2500 });
}
{
  const state = { hiddenWorldObjectKeys: { a00i001: 999, a00i002: 1001 } };
  assert.deepEqual(hiddenWorldObjectVisibilityForClientRuntime(state, "a00i002", 1000), {
    expiredKeys: ["a00i001"],
    hidden: true,
    hiddenWorldObjectKeys: { a00i002: 1001 }
  });
  assert.deepEqual(state.hiddenWorldObjectKeys, { a00i002: 1001 });
}

assert.deepEqual(inventoryItemFromTakeResponseRuntime({
  inventory_item: { frame: 2, object_key: " inv ", tile_id: 0x347, type: 0x123 },
  target: { frame: 1, object_key: "target", type: 0x122 }
}, { frame: 0, object_key: "fallback", type: 0x121 }), { frame: 2, object_key: "inv", tile_id: 0x347, type: 0x123 });
assert.deepEqual(inventoryItemFromTakeResponseRuntime({
  target: { frame: 1, object_key: "target", type: 0x122 }
}, { frame: 0, object_key: "fallback", type: 0x121 }), { frame: 1, object_key: "target", type: 0x122 });
assert.deepEqual(inventoryItemFromTakeResponseRuntime(null, { frame: 0, object_key: "fallback", type: 0x121 }), {
  frame: 0,
  object_key: "fallback",
  type: 0x121
});
assert.equal(sourceObjectKeyFromTakeResponseRuntime({
  inventory_item: { frame: 2, object_key: "inv:a01i002:avatar:1", source_object_key: "a01i002", type: 0x123 },
  respawn: { source_object_key: "a01i002" },
  target: { frame: 2, object_key: "inv:a01i002:avatar:1", source_object_key: "a01i002", type: 0x123 }
}, { frame: 2, object_key: "inv:a01i002:avatar:1", source_object_key: "a01i002", type: 0x123 }, {
  object_key: "a01i002"
}), "a01i002");
assert.equal(sourceObjectKeyFromTakeResponseRuntime({
  target: { frame: 1, object_key: "runtime-object", type: 0x122 }
}, { frame: 1, object_key: "runtime-object", type: 0x122 }, {
  object_key: "runtime-object"
}), "runtime-object");
assert.deepEqual(takeProjectionFromResponseRuntime({
  inventory_item: {
    frame: 2,
    inventory_key: "0x113:0x02",
    object_key: "inv:a01i002:avatar:1",
    source_object_key: "a01i002",
    tile_id: 0x347,
    type: 0x113
  },
  respawn: { due_at_ms: 2000, source_object_key: "a01i002" }
}, {
  frame: 2,
  object_key: "a01i002",
  source_area: 1,
  source_index: 2,
  type: 0x113
}), {
  hide_source: true,
  inventory_item: {
    frame: 2,
    inventory_key: "0x113:0x02",
    object_key: "inv:a01i002:avatar:1",
    source_object_key: "a01i002",
    tile_id: 0x347,
    type: 0x113
  },
  inventory_object: {
    amount: 0,
    frame: 2,
    holder_id: "",
    holder_key: "",
    holder_kind: "",
    inventory_key: "0x113:0x02",
    object_key: "inv:a01i002:avatar:1",
    source_kind: "",
    source_object_key: "a01i002",
    status: 0,
    tile_id: 0x347,
    type: 0x113,
    x: 0,
    y: 0,
    z: 0
  },
  inventory_tile_id: 0x347,
  inventory_tile_key: "0x113:0x02",
  remove_source_object_key: "a01i002",
  remove_taken_object_key: "",
  source_object_key: "a01i002",
  source_respawn_due_at_ms: 2000
});
assert.equal(takeProjectionFromResponseRuntime({
  target: {
    frame: 0,
    object_key: "inv:a01i002:avatar:1",
    source_object_key: "a01i002",
    type: 0x113
  }
}, {
  frame: 0,
  object_key: "inv:a01i002:avatar:1",
  source_area: 1,
  source_index: 2,
  type: 0x113
}).remove_taken_object_key, "inv:a01i002:avatar:1");
{
  const sim = {
    inventory: { "0x113:0x02": 1 },
    inventoryObjects: [{
      amount: 1,
      frame: 2,
      holder_id: "avatar",
      holder_key: "",
      holder_kind: "avatar",
      inventory_key: "0x113:0x02",
      object_key: "inv:a01i002:avatar:1",
      source_kind: "spawned",
      source_object_key: "a01i002",
      status: 0x10,
      tile_id: 0x111,
      type: 0x113,
      x: 0,
      y: 0,
      z: 0
    }],
    inventoryTiles: {},
    removedObjectAtTick: {},
    removedObjectKeys: {},
    tick: 99
  };
  const projection = takeProjectionFromResponseRuntime({
    inventory_item: {
      frame: 2,
      inventory_key: "0x113:0x02",
      object_key: "inv:a01i002:avatar:1",
      source_object_key: "a01i002",
      tile_id: 0x347,
      type: 0x113
    }
  }, {
    frame: 2,
    object_key: "a01i002",
    source_area: 1,
    source_index: 2,
    type: 0x113
  });
  assert.deepEqual(applyTakeProjectionToInventoryRuntime(sim, projection, {
    frame: 2,
    order: 7,
    type: 0x113,
    x: 10,
    y: 11,
    z: 0
  }), {
    count: 2,
    inventoryKey: "0x113:0x02",
    inventoryObjectKey: "inv:a01i002:avatar:1",
    inventoryTileId: 0x347,
    inventoryTileKey: "0x113:0x02"
  });
  assert.equal(sim.inventoryObjects.length, 1);
  assert.equal(sim.inventoryObjects[0].tile_id, 0x347);
  assert.deepEqual(sim.inventoryTiles, { "0x113:0x02": 0x347 });
  assert.deepEqual(sim.inventory, { "0x113:0x02": 2 });
  assert.deepEqual(sim.removedObjectAtTick, { "10,11,0,7,275": 99 });
}
{
  const sim = {
    inventory: {},
    inventoryObjects: [] as WorldRuntimeInventoryObject[],
    inventoryTiles: {},
    removedObjectAtTick: {},
    removedObjectKeys: {},
    tick: 100
  };
  const firstProjection = takeProjectionFromResponseRuntime({
    inventory_item: {
      frame: 0,
      inventory_key: "0x120:0x00",
      object_key: "inv:a00i001:avatar:1",
      source_object_key: "a00i001",
      tile_id: 0x500,
      type: 0x120
    }
  }, {
    frame: 0,
    object_key: "a00i001",
    source_area: 0,
    source_index: 1,
    type: 0x120
  });
  const secondProjection = takeProjectionFromResponseRuntime({
    inventory_item: {
      frame: 0,
      inventory_key: "0x120:0x00",
      object_key: "inv:a00i002:avatar:2",
      source_object_key: "a00i002",
      tile_id: 0x500,
      type: 0x120
    }
  }, {
    frame: 0,
    object_key: "a00i002",
    source_area: 0,
    source_index: 2,
    type: 0x120
  });
  applyTakeProjectionToInventoryRuntime(sim, firstProjection, {
    frame: 0,
    order: 1,
    type: 0x120,
    x: 10,
    y: 11,
    z: 0
  });
  applyTakeProjectionToInventoryRuntime(sim, secondProjection, {
    frame: 0,
    order: 2,
    type: 0x120,
    x: 10,
    y: 12,
    z: 0
  });
  assert.deepEqual(sim.inventory, { "0x120:0x00": 2 });
  assert.deepEqual(sim.inventoryObjects.map((obj) => obj.object_key), [
    "inv:a00i001:avatar:1",
    "inv:a00i002:avatar:2"
  ]);
  assert.deepEqual(inventoryDisplayEntriesFromObjectsRuntime(sim.inventoryObjects).map((entry) => entry.key), [
    "inv:a00i001:avatar:1",
    "inv:a00i002:avatar:2"
  ]);
  assert.deepEqual(Object.keys(sim.removedObjectKeys).sort(), [
    "10,11,0,1,288",
    "10,12,0,2,288"
  ]);
}
assert.deepEqual(dropThrowPlanRuntime({
  durationMs: 360,
  fromX: 10,
  fromY: 10,
  landObject: null,
  nowMs: 1000,
  toX: 11,
  toY: 10,
  z: 0
}), { kind: "apply_now", landObject: null });
assert.deepEqual(dropThrowPlanRuntime({
  durationMs: 360,
  fromX: 10,
  fromY: 10,
  landObject: { object_key: "drop-1", tile_id: 0x285, type: 0x078, frame: 0 },
  nowMs: 1000,
  toX: 10,
  toY: 10,
  z: 0
}), {
  kind: "apply_now",
  landObject: { object_key: "drop-1", tile_id: 0x285, type: 0x078, frame: 0 }
});
assert.deepEqual(dropThrowPlanRuntime({
  durationMs: 360,
  fromX: 10,
  fromY: 10,
  landObject: { object_key: "drop-1", tile_id: 0x285, type: 0x078, frame: 0 },
  nowMs: 1000,
  toX: 11,
  toY: 10,
  z: 0
}), {
  effect: {
    endMs: 1360,
    fromX: 10,
    fromY: 10,
    landObject: { object_key: "drop-1", tile_id: 0x285, type: 0x078, frame: 0 },
    objectKey: "drop-1",
    startMs: 1000,
    tileId: 0x285,
    toX: 11,
    toY: 10,
    z: 0
  },
  kind: "animate"
});

{
  const requested: string[] = [];
  const out = await requestWorldObjectsAtCell(305, 360, 0, async (route, init, auth) => {
    requested.push(`${route}:${init?.method}:${auth}`);
    return { ok: true, objects: [] };
  });
  assert.deepEqual(requested, [
    "/api/world/objects?x=305&y=360&z=0&radius=1&limit=256&projection=footprint&include_footprint=1:GET:true"
  ]);
  assert.deepEqual(out, { ok: true, objects: [] });
}

{
  const requested: string[] = [];
  const out = await requestTakeWorldObjectRuntime({
    actorId: "avatar-1",
    actorX: 307,
    actorY: 347,
    actorZ: 0,
    target: { sourceArea: 5, index: 9 }
  }, async (route, init, auth) => {
    requested.push(`${route}:${init?.method}:${auth}:${String(init?.body || "")}`);
    return { ok: true };
  });
  assert.deepEqual(requested, [
    "/api/world/objects/interact:POST:true:{\"verb\":\"take\",\"target_key\":\"a05i009\",\"actor_id\":\"avatar-1\",\"actor_x\":307,\"actor_y\":347,\"actor_z\":0}"
  ]);
  assert.deepEqual(out, { ok: true });
}

await assert.rejects(
  () => requestTakeWorldObjectRuntime({
    actorId: "",
    actorX: 0,
    actorY: 0,
    actorZ: 0,
    target: { sourceArea: 5, index: 9 }
  }, async () => ({})),
  /requires a character id/
);

await assert.rejects(
  () => requestTakeWorldObjectRuntime({
    actorId: "avatar-1",
    actorX: 0,
    actorY: 0,
    actorZ: 0,
    target: {}
  }, async () => ({})),
  /target object has no authoritative key/
);

{
  const requested: string[] = [];
  const out = await requestDropWorldObjectRuntime({
    actorId: "avatar-1",
    actorX: 10,
    actorY: 10,
    actorZ: 0,
    dropX: 11,
    dropY: 12,
    dropZ: 0,
    targetKey: "inv:a05i009:avatar-1:1"
  }, async (route, init, auth) => {
    requested.push(`${route}:${init?.method}:${auth}:${String(init?.body || "")}`);
    return { ok: true };
  });
  assert.deepEqual(requested, [
    "/api/world/objects/interact:POST:true:{\"verb\":\"drop\",\"target_key\":\"inv:a05i009:avatar-1:1\",\"actor_id\":\"avatar-1\",\"actor_x\":10,\"actor_y\":10,\"actor_z\":0,\"drop_x\":11,\"drop_y\":12,\"drop_z\":0}"
  ]);
  assert.deepEqual(out, { ok: true });
}

await assert.rejects(
  () => requestDropWorldObjectRuntime({
    actorId: "",
    actorX: 0,
    actorY: 0,
    actorZ: 0,
    targetKey: "inv:a05i009:avatar-1:1"
  }, async () => ({})),
  /requires a character id/
);

await assert.rejects(
  () => requestDropWorldObjectRuntime({
    actorId: "avatar-1",
    actorX: 0,
    actorY: 0,
    actorZ: 0,
    targetKey: ""
  }, async () => ({})),
  /inventory object has no authoritative key/
);

assert.equal(normalizeIntroPhaseRuntime("pre_intro"), "pre_intro");
assert.equal(normalizeIntroPhaseRuntime("PRE_INTRO"), "pre_intro");
assert.equal(normalizeIntroPhaseRuntime("bad"), "post_intro");
assert.deepEqual(introPhaseSetPresentationRuntime("pre_intro"), {
  diagClass: "diag ok",
  diagText: "Intro phase set to pre_intro.",
  statusLevel: "online",
  statusText: "Intro phase: pre_intro"
});
assert.deepEqual(introPhaseUpdateFailureRuntime("Login required"), {
  diagClass: "diag warn",
  diagText: "Intro phase update failed: Login required",
  statusLevel: "error",
  statusText: "Intro phase update failed: Login required"
});
{
  const listener: NetWorldTestListener = {};
  const statuses: string[] = [];
  const diags: string[] = [];
  const requested: string[] = [];
  let currentPhase = "post_intro";
  assert.equal(bindIntroPhaseButtonRuntime({
    button: {
      addEventListener(type: "click", fn: () => void) {
        assert.equal(type, "click");
        listener.current = fn;
      }
    },
    currentPhase: () => currentPhase,
    errorMessage: (err) => err instanceof Error ? err.message : String(err),
    isAuthenticated: () => true,
    requestedPhase: () => "pre_intro",
    setIntroPhase: async (phase) => {
      requested.push(phase);
      currentPhase = "pre_intro";
    },
    setStatus: (level, text) => statuses.push(`${level}:${text}`),
    setDiag: (diag) => diags.push(`${diag.diagClass}:${diag.diagText}`)
  }), true);
  assert(listener.current, "intro phase listener should be bound");
  listener.current();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(requested, ["pre_intro"]);
  assert.deepEqual(statuses, ["online:Intro phase: pre_intro"]);
  assert.deepEqual(diags, ["diag ok:Intro phase set to pre_intro."]);
}
{
  const listener: NetWorldTestListener = {};
  const statuses: string[] = [];
  const diags: string[] = [];
  assert.equal(bindIntroPhaseButtonRuntime({
    button: {
      addEventListener(_type: "click", fn: () => void) {
        listener.current = fn;
      }
    },
    currentPhase: () => "post_intro",
    errorMessage: (err) => err instanceof Error ? err.message : String(err),
    isAuthenticated: () => false,
    requestedPhase: () => "pre_intro",
    setIntroPhase: async () => {
      throw new Error("unexpected");
    },
    setStatus: (level, text) => statuses.push(`${level}:${text}`),
    setDiag: (diag) => diags.push(`${diag.diagClass}:${diag.diagText}`)
  }), true);
  assert(listener.current, "unauthenticated intro phase listener should be bound");
  listener.current();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(statuses, ["error:Intro phase update failed: Login required"]);
  assert.deepEqual(diags, ["diag warn:Intro phase update failed: Login required"]);
  assert.equal(bindIntroPhaseButtonRuntime({
    button: null,
    currentPhase: () => "post_intro",
    errorMessage: String,
    isAuthenticated: () => true,
    requestedPhase: () => "pre_intro",
    setIntroPhase: async () => {},
    setStatus: () => {},
    setDiag: () => {}
  }), false);
}

{
  const requested: string[] = [];
  const result = await requestIntroPhaseRuntime("pre_intro", async (route, init, auth) => {
    requested.push(`${route}:${init?.method}:${auth}`);
    return { intro_state: { phase: "post_intro" } };
  });
  assert.deepEqual(requested, ["/api/world/intro-state:GET:true"]);
  assert.equal(result.phase, "post_intro");
  assert.deepEqual(result.out, { intro_state: { phase: "post_intro" } });
}

{
  const result = await requestIntroPhaseRuntime("pre_intro", async () => ({}));
  assert.equal(result.phase, "pre_intro");
}

{
  const requested: string[] = [];
  const result = await setIntroPhaseRuntime("PRE_INTRO", async (route, init, auth) => {
    requested.push(`${route}:${init?.method}:${auth}:${String(init?.body || "")}`);
    return { intro_state: { phase: "post_intro" } };
  });
  assert.deepEqual(requested, [
    "/api/world/intro-state:PUT:true:{\"phase\":\"pre_intro\"}"
  ]);
  assert.equal(result.phase, "post_intro");
}

const items = collectWorldItemsForMaintenanceFromLayer({
  byCoord: new Map([
    [
      "1,2,0",
      [
        { type: 0x123, x: 1, y: 2, z: 0 },
        { type: 0x045, x: 3, y: 4, z: 1 }
      ]
    ]
  ])
});
assert.deepEqual(items, [
  { item_id: "item_type_0x123", reachable: true, at: { x: 1, y: 2, z: 0 } },
  { item_id: "item_type_0x045", reachable: true, at: { x: 3, y: 4, z: 1 } }
]);

const statusRows: string[] = [];
const diagRows: string[] = [];
let loginCount = 0;
let resetCount = 0;
let statCount = 0;
const netState = {
  token: "",
  maintenanceInFlight: false,
  recoveryEventCount: 2,
  lastMaintenanceTick: 0
};

const events = await runCriticalMaintenanceRuntime(netState, {}, {
  currentTick: () => 123,
  collectWorldItems: () => items,
  login: async () => {
    loginCount += 1;
    netState.token = "token";
  },
  request: async (route, init, auth) => {
    assert.equal(route, "/api/world/critical-items/maintenance");
    assert.equal(auth, true);
    const body = JSON.parse(String(init?.body || "{}"));
    assert.equal(body.tick, 123);
    assert.equal(body.world_items.length, 2);
    return {
      events: [
        { item_id: "item_type_0x123" },
        { item_id: "item_type_0x045" }
      ]
    };
  },
  resetBackgroundFailures: () => {
    resetCount += 1;
  },
  updateCriticalRecoveryStat: () => {
    statCount += 1;
  },
  setStatus: (level, text) => {
    statusRows.push(`${level}:${text}`);
  },
  setDiag: (kind, text) => {
    diagRows.push(`${kind}:${text}`);
  }
});

assert.equal(loginCount, 1);
assert.equal(resetCount, 1);
assert.equal(statCount, 1);
assert.equal(netState.maintenanceInFlight, false);
assert.equal(netState.recoveryEventCount, 4);
assert.equal(netState.lastMaintenanceTick, 123);
assert.equal(events.length, 2);
assert.deepEqual(statusRows, [
  "sync:Running critical maintenance...",
  "online:Maintenance recovered 2 item(s)"
]);
assert.deepEqual(diagRows, [
  "ok:Critical maintenance emitted 2 recovery event(s)."
]);

assert.deepEqual(
  criticalMaintenanceFailureRuntime(new Error("offline"), (err) => err instanceof Error ? err.message : String(err)),
  {
    diagClass: "diag warn",
    diagText: "Critical maintenance failed: offline",
    statusLevel: "error",
    statusText: "Maintenance failed: offline"
  }
);
assert.deepEqual(criticalMaintenanceDiagRuntime("ok", "Recovered."), {
  diagClass: "diag ok",
  diagText: "Recovered."
});
assert.deepEqual(criticalMaintenanceDiagRuntime("warn", "Failed."), {
  diagClass: "diag warn",
  diagText: "Failed."
});
{
  const listener: NetWorldTestListener = {};
  let runCount = 0;
  const statuses: string[] = [];
  const diags: string[] = [];
  assert.equal(bindCriticalMaintenanceButtonRuntime({
    button: {
      addEventListener(type: "click", fn: () => void) {
        assert.equal(type, "click");
        listener.current = fn;
      }
    },
    run: async () => {
      runCount += 1;
    },
    errorMessage: (err) => err instanceof Error ? err.message : String(err),
    setStatus: (level, text) => statuses.push(`${level}:${text}`),
    setDiag: (diag) => diags.push(`${diag.diagClass}:${diag.diagText}`)
  }), true);
  assert(listener.current, "critical maintenance listener should be bound");
  listener.current();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(runCount, 1);
  assert.deepEqual(statuses, []);
  assert.deepEqual(diags, []);
}
{
  const listener: NetWorldTestListener = {};
  const statuses: string[] = [];
  const diags: string[] = [];
  assert.equal(bindCriticalMaintenanceButtonRuntime({
    button: {
      addEventListener(_type: "click", fn: () => void) {
        listener.current = fn;
      }
    },
    run: async () => {
      throw new Error("offline");
    },
    errorMessage: (err) => err instanceof Error ? err.message : String(err),
    setStatus: (level, text) => statuses.push(`${level}:${text}`),
    setDiag: (diag) => diags.push(`${diag.diagClass}:${diag.diagText}`)
  }), true);
  assert(listener.current, "failing critical maintenance listener should be bound");
  listener.current();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(statuses, ["error:Maintenance failed: offline"]);
  assert.deepEqual(diags, ["diag warn:Critical maintenance failed: offline"]);
}
assert.equal(bindCriticalMaintenanceButtonRuntime({
  button: null,
  run: async () => {},
  errorMessage: String,
  setStatus: () => {},
  setDiag: () => {}
}), false);

assert.deepEqual(inventorySyncFailureDiagRuntime("offline"), {
  diagClass: "diag warn",
  diagText: "Inventory sync failed: offline"
});

console.log("net_world_runtime_test: ok");
