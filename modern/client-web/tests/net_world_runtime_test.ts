import assert from "node:assert/strict";
import {
  collectWorldItemsForMaintenanceFromLayer,
  inventoryItemFromTakeResponseRuntime,
  inventoryProjectionFromServerObjectsRuntime,
  normalizeIntroPhaseRuntime,
  requestIntroPhaseRuntime,
  requestTakeWorldObjectRuntime,
  serverObjectKeyForWorldObjectRuntime,
  setIntroPhaseRuntime,
  runCriticalMaintenanceRuntime,
  worldInventorySourcesFromJsonRuntime
} from "../net/world_runtime.ts";

assert.equal(serverObjectKeyForWorldObjectRuntime({ object_key: " direct " }), "direct");
assert.equal(serverObjectKeyForWorldObjectRuntime({ objectKey: "camel" }), "camel");
assert.equal(serverObjectKeyForWorldObjectRuntime({ sourceArea: 5, index: 9 }), "a05i009");
assert.equal(serverObjectKeyForWorldObjectRuntime({ source_area: 0x2a, source_index: 0x1b }), "a2ai01b");
assert.equal(serverObjectKeyForWorldObjectRuntime({ sourceArea: "bad", index: 9 }), "");
assert.equal(serverObjectKeyForWorldObjectRuntime(null), "");

const decodedInventorySources = worldInventorySourcesFromJsonRuntime([
  { type: 0x123, frame: 0 },
  { type: 0x123, frame: 0 },
  { type: 0x123, frame: 1 },
  { type: "bad", frame: 1 },
  null
]);
assert.deepEqual(inventoryProjectionFromServerObjectsRuntime(decodedInventorySources), {
  "0x123:0x00": 2,
  "0x123:0x01": 1
});
assert.equal(decodedInventorySources.length, 4);
assert.deepEqual(worldInventorySourcesFromJsonRuntime(null), []);
assert.deepEqual(inventoryProjectionFromServerObjectsRuntime(null), {});

assert.deepEqual(inventoryItemFromTakeResponseRuntime({
  inventory_item: { frame: 2, object_key: " inv ", type: 0x123 },
  target: { frame: 1, object_key: "target", type: 0x122 }
}, { frame: 0, object_key: "fallback", type: 0x121 }), { frame: 2, object_key: "inv", type: 0x123 });
assert.deepEqual(inventoryItemFromTakeResponseRuntime({
  target: { frame: 1, object_key: "target", type: 0x122 }
}, { frame: 0, object_key: "fallback", type: 0x121 }), { frame: 1, object_key: "target", type: 0x122 });
assert.deepEqual(inventoryItemFromTakeResponseRuntime(null, { frame: 0, object_key: "fallback", type: 0x121 }), {
  frame: 0,
  object_key: "fallback",
  type: 0x121
});

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
