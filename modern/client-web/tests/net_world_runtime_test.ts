import assert from "node:assert/strict";
import {
  collectWorldItemsForMaintenanceFromLayer,
  hiddenWorldObjectKeysFromMetaRuntime,
  inventoryDisplayEntriesFromObjectsRuntime,
  inventoryItemFromTakeResponseRuntime,
  inventoryObjectsFromServerObjectsRuntime,
  inventoryProjectionFromServerObjectsRuntime,
  inventoryTileProjectionFromServerObjectsRuntime,
  normalizeIntroPhaseRuntime,
  requestDropWorldObjectRuntime,
  requestIntroPhaseRuntime,
  requestTakeWorldObjectRuntime,
  serverObjectKeyForWorldObjectRuntime,
  setIntroPhaseRuntime,
  shouldHideServerWorldObjectFromLayerRuntime,
  sourceObjectKeyFromTakeResponseRuntime,
  runCriticalMaintenanceRuntime,
  worldInventorySourcesFromJsonRuntime
} from "../net/world_runtime.ts";

assert.equal(serverObjectKeyForWorldObjectRuntime({ object_key: " direct " }), "direct");
assert.equal(serverObjectKeyForWorldObjectRuntime({ objectKey: "camel" }), "camel");
assert.equal(serverObjectKeyForWorldObjectRuntime({ sourceArea: 5, index: 9 }), "a05i009");
assert.equal(serverObjectKeyForWorldObjectRuntime({ source_area: 0x2a, source_index: 0x1b }), "a2ai01b");
assert.equal(serverObjectKeyForWorldObjectRuntime({ sourceArea: "bad", index: 9 }), "");
assert.equal(serverObjectKeyForWorldObjectRuntime(null), "");

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
assert.deepEqual(inventoryTileProjectionFromServerObjectsRuntime(decodedInventorySources), {
  "0x123:0x00": 0x345,
  "0x123:0x01": 0x346
});
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
    count: 5,
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
assert.deepEqual(hiddenWorldObjectKeysFromMetaRuntime({ hidden_objects: [
  { object_key: "expired", due_at_ms: 999 }
] }, 1000, 600), {});
assert.equal(hiddenWorldObjectKeysFromMetaRuntime({}, 1000, 600), null);

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

console.log("net_world_runtime_test: ok");
