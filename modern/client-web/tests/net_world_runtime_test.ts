import assert from "node:assert/strict";
import {
  collectWorldItemsForMaintenanceFromLayer,
  runCriticalMaintenanceRuntime
} from "../net/world_runtime.ts";

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
