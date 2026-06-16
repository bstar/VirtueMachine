import assert from "node:assert/strict";
import {
  addObjectToInventoryRuntime,
  decrementInventoryKeyRuntime,
  firstInventoryKeyRuntime,
  inventoryKeyForObjectRuntime,
  markObjectRemovedRuntime,
  objectAnchorKeyRuntime,
  pickObjectIntoInventoryRuntime,
  resolveObjectByInventoryAnchorRuntime
} from "../sim/inventory_runtime.ts";

const portable = { frame: 2, order: 3, type: 0x10f, x: 10, y: 20, z: 0 };
assert.equal(objectAnchorKeyRuntime(portable), "10,20,0,3,271");
assert.equal(inventoryKeyForObjectRuntime(portable), "0x10f:0x02");

{
  const sim = { tick: 44 };
  markObjectRemovedRuntime(sim, portable);
  assert.deepEqual(sim, {
    tick: 44,
    removedObjectAtTick: { "10,20,0,3,271": 44 },
    removedObjectCount: 1,
    removedObjectKeys: { "10,20,0,3,271": 1 }
  });
}

{
  const sim = {};
  assert.equal(addObjectToInventoryRuntime(sim, portable), "0x10f:0x02");
  assert.equal(addObjectToInventoryRuntime(sim, portable), "0x10f:0x02");
  assert.equal(firstInventoryKeyRuntime(sim), "0x10f:0x02");
  assert.equal(decrementInventoryKeyRuntime(sim, "0x10f:0x02"), 1);
  assert.equal(decrementInventoryKeyRuntime(sim, "0x10f:0x02"), 0);
  assert.equal(firstInventoryKeyRuntime(sim), "");
}

{
  const sim = { tick: 55 };
  const source = { frame: 0, order: 9, type: 0x120, x: 30, y: 31, z: 0 };
  const item = { frame: 1, type: 0x113 };
  assert.deepEqual(pickObjectIntoInventoryRuntime(sim, item, source), {
    count: 1,
    inventoryKey: "0x113:0x01"
  });
  assert.deepEqual(pickObjectIntoInventoryRuntime(sim, item, source), {
    count: 2,
    inventoryKey: "0x113:0x01"
  });
  assert.deepEqual(sim, {
    inventory: { "0x113:0x01": 2 },
    removedObjectAtTick: { "30,31,0,9,288": 55 },
    removedObjectCount: 1,
    removedObjectKeys: { "30,31,0,9,288": 1 },
    tick: 55
  });
}

{
  const exact = { frame: 0, order: 7, type: 0x123, x: 1, y: 2, z: 0 };
  const sameType = { frame: 1, order: 8, type: 0x123, x: 1, y: 2, z: 0 };
  assert.equal(resolveObjectByInventoryAnchorRuntime({
    anchor: exact,
    objectsAt: () => [sameType, exact]
  }), exact);
}

{
  const anchor = { frame: 0, order: 7, type: 0x123, x: 1, y: 2, z: 0 };
  const sameType = { frame: 1, order: 8, type: 0x123, x: 1, y: 2, z: 0 };
  assert.equal(resolveObjectByInventoryAnchorRuntime({
    anchor,
    objectsAt: () => [sameType]
  }), sameType);
}

{
  const anchor = { frame: 0, order: 7, type: 0x200, x: 1, y: 2, z: 0 };
  const chair = { frame: 0, order: 8, type: 0x147, x: 1, y: 2, z: 0 };
  assert.equal(resolveObjectByInventoryAnchorRuntime({
    anchor,
    objectsAt: () => [chair],
    isChairObject: (obj) => obj === anchor || (Number(obj?.type) & 0x3ff) === 0x147
  }), chair);
}

assert.equal(resolveObjectByInventoryAnchorRuntime({
  anchor: null,
  objectsAt: () => []
}), null);

console.log("inventory_runtime_test: ok");
