import assert from "node:assert/strict";
import {
  performNetDropInventoryObjectRuntime,
  performNetGetAtCellRuntime,
  type WorldInteractionDiagRuntime,
  type WorldInteractionDropEffectRuntime,
  type WorldInteractionSimRuntime
} from "../net/world_interaction_runtime.ts";
import type {
  WorldRuntimeInventoryObject,
  WorldRuntimeJson,
  WorldRuntimeRequest,
  WorldRuntimeServerObject
} from "../net/world_runtime.ts";

function pickupObject(overrides: Partial<WorldRuntimeServerObject> = {}): WorldRuntimeServerObject {
  return {
    frame: 0,
    object_key: "world-mug",
    source_index: 7,
    status: 0,
    tile_id: 0x123,
    type: 0x123,
    x: 11,
    y: 10,
    z: 0,
    ...overrides
  };
}

function sim(): WorldInteractionSimRuntime {
  return {
    inventoryObjects: [],
    removedObjectKeys: {},
    world: {
      map_x: 10,
      map_y: 10,
      map_z: 0
    }
  };
}

function inventoryObject(objectKey: string): WorldRuntimeInventoryObject {
  return {
    amount: 1,
    frame: 0,
    holder_id: "actor-1",
    holder_key: "actor:actor-1",
    holder_kind: "actor",
    inventory_key: "0x123:0x00",
    object_key: objectKey,
    source_kind: "inventory_clone",
    source_object_key: "source-mug",
    status: 0,
    tile_id: 0x123,
    type: 0x123,
    x: 0,
    y: 0,
    z: 0
  };
}

const lookupDeps = {
  isLikelyPickupObjectType: () => true,
  isObjectRemoved: () => false
};

{
  const diags: WorldInteractionDiagRuntime[] = [];
  const taken: Array<{ key: string; tx: number; ty: number; tz: number }> = [];
  const out = await performNetGetAtCellRuntime({
    applyDiag: (diag) => diags.push(diag),
    fetchWorldObjectsAtCell: async (x, y, z) => {
      assert.deepEqual({ x, y, z }, { x: 11, y: 10, z: 0 });
      return { objects: [pickupObject()] };
    },
    isTerrainDamageTile: () => false,
    isTileIgnored: () => false,
    lookupDeps,
    sim: sim(),
    takeWorldObject: async (obj, tx, ty, tz) => {
      taken.push({ key: String(obj.object_key), tx, ty, tz });
    },
    tx: 11,
    ty: 10
  });
  assert.equal(out, true);
  assert.deepEqual(taken, [{ key: "world-mug", tx: 11, ty: 10, tz: 0 }]);
  assert.equal(diags.length, 1);
  assert.equal(diags[0].diagClass, "ok");
  assert.match(String(diags[0].diagText), /Get: taking 0x123 at 11,10,0/);
}

{
  const diags: WorldInteractionDiagRuntime[] = [];
  let takeCount = 0;
  const out = await performNetGetAtCellRuntime({
    applyDiag: (diag) => diags.push(diag),
    fetchWorldObjectsAtCell: async () => ({ objects: [] }),
    isTerrainDamageTile: () => false,
    isTileIgnored: () => false,
    lookupDeps,
    sim: sim(),
    takeWorldObject: async () => {
      takeCount += 1;
    },
    tx: 11,
    ty: 10
  });
  assert.equal(out, false);
  assert.equal(takeCount, 0);
  assert.equal(diags.length, 1);
  assert.equal(diags[0].diagClass, "warn");
  assert.match(String(diags[0].diagText), /nothing selectable/);
}

{
  const s = sim();
  s.inventoryObjects = [inventoryObject("inv-1")];
  const diags: WorldInteractionDiagRuntime[] = [];
  const effects: WorldInteractionDropEffectRuntime[] = [];
  const requests: Array<{ route: string; body: unknown; auth?: boolean }> = [];
  const out = await performNetDropInventoryObjectRuntime({
    actorId: "actor-1",
    applyDiag: (diag) => diags.push(diag),
    legacyHudSelection: { kind: "inventory", index: 0 },
    netRequest: (async (route, init, auth) => {
      requests.push({ route, body: JSON.parse(String(init?.body || "{}")), auth });
      return {
        ok: true,
        target: { object_key: "drop-1", tile_id: 0x123, type: 0x123, frame: 0 }
      } satisfies WorldRuntimeJson;
    }) as WorldRuntimeRequest,
    queueDropThrowEffect: (effect) => effects.push(effect),
    sim: s,
    syncInventoryProjection: async () => undefined,
    tx: 12,
    ty: 10
  });
  assert.equal(out?.target?.object_key, "drop-1");
  assert.equal(requests.length, 1);
  assert.equal(requests[0].route, "/api/world/objects/interact");
  assert.equal(requests[0].auth, true);
  assert.deepEqual(requests[0].body, {
    verb: "drop",
    target_key: "inv-1",
    actor_id: "actor-1",
    actor_x: 10,
    actor_y: 10,
    actor_z: 0,
    drop_x: 12,
    drop_y: 10,
    drop_z: 0
  });
  assert.deepEqual(effects, [{
    fromX: 10,
    fromY: 10,
    toX: 12,
    toY: 10,
    z: 0,
    landObject: { object_key: "drop-1", tile_id: 0x123, type: 0x123, frame: 0 }
  }]);
  assert.equal(diags.length, 1);
  assert.equal(diags[0].diagClass, "ok");
  assert.match(String(diags[0].diagText), /Drop: item placed at 12,10,0/);
}

{
  const s = sim();
  let syncCount = 0;
  await performNetDropInventoryObjectRuntime({
    actorId: "actor-1",
    applyDiag: () => undefined,
    legacyHudSelection: { kind: "inventory", index: 0 },
    netRequest: (async () => ({ ok: true, target: null })) as WorldRuntimeRequest,
    queueDropThrowEffect: () => undefined,
    sim: s,
    syncInventoryProjection: async () => {
      syncCount += 1;
      s.inventoryObjects = [inventoryObject("inv-after-sync")];
    },
    tx: 12,
    ty: 10
  });
  assert.equal(syncCount, 2, "drop should sync once before retrying selection and once after drop");
}

console.log("net_world_interaction_runtime_test: ok");
