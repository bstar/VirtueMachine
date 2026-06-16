import assert from "node:assert/strict";
import {
  isImplicitSolidObjectTileRuntime,
  objectFootprintTilesRuntime
} from "../sim/object_footprint_runtime.ts";
import {
  isLikelyPickupObjectTypeRuntime,
  isSolidEnvTypeRuntime
} from "../sim/object_types_runtime.ts";

const flags = (value: number) => () => value;

assert.deepEqual(objectFootprintTilesRuntime(8, 9, 0x400, flags(0)), [
  { x: 8, y: 9, tileId: 0x400 }
]);

assert.deepEqual(objectFootprintTilesRuntime(0, 0, 0x400, flags(0x80)), [
  { x: 0, y: 0, tileId: 0x400 },
  { x: 1023, y: 0, tileId: 0x3ff }
]);

assert.deepEqual(objectFootprintTilesRuntime(0, 0, 0x400, flags(0x40)), [
  { x: 0, y: 0, tileId: 0x400 },
  { x: 0, y: 1023, tileId: 0x3ff }
]);

assert.deepEqual(objectFootprintTilesRuntime(0, 0, 0x400, flags(0xc0)), [
  { x: 0, y: 0, tileId: 0x400 },
  { x: 1023, y: 0, tileId: 0x3ff },
  { x: 0, y: 1023, tileId: 0x3fe },
  { x: 1023, y: 1023, tileId: 0x3fd }
]);

assert.equal(isImplicitSolidObjectTileRuntime(0x100, 0x400, flags(0x20)), true);
assert.equal(isImplicitSolidObjectTileRuntime(0x100, 0x400, flags(0x80)), true);
assert.equal(isImplicitSolidObjectTileRuntime(0x100, 0x400, flags(0x40)), true);
assert.equal(isImplicitSolidObjectTileRuntime(0x100, 0x400, flags(0x00)), false);

assert.equal(isImplicitSolidObjectTileRuntime(0x10f, 0x400, flags(0xe0)), false);
assert.equal(isImplicitSolidObjectTileRuntime(0x12a, 0x400, flags(0xe0)), false);
assert.equal(isImplicitSolidObjectTileRuntime(0x05f, 0x400, flags(0x80)), false);
assert.equal(isImplicitSolidObjectTileRuntime(0x100, 0x400, flags(0x90)), false);
assert.equal(isSolidEnvTypeRuntime(0x097), false, "legacy book type must not be classified as solid environment");
assert.equal(isLikelyPickupObjectTypeRuntime(0x097), true, "legacy book type should remain pickable");
assert.equal(isSolidEnvTypeRuntime(0x0fa), true, "square table type must be a solid environment object");
assert.equal(isLikelyPickupObjectTypeRuntime(0x104), false, "shadow objects must not be picked up");
assert.equal(isLikelyPickupObjectTypeRuntime(0x103), false, "table-leg objects must not be picked up");
assert.equal(isLikelyPickupObjectTypeRuntime(0x14c), false, "sign objects must not be picked up");
assert.equal(isLikelyPickupObjectTypeRuntime(0x0e0), false, "foot rail fixtures must not be picked up");
assert.equal(isLikelyPickupObjectTypeRuntime(0x090), true, "ordinary inventory objects should remain pickable");
{
  const typeWeights = new Uint8Array(0x400);
  typeWeights[0x113] = 3;
  typeWeights[0x132] = 0;
  typeWeights[0x058] = 0;
  assert.equal(isLikelyPickupObjectTypeRuntime(0x113, typeWeights), true, "weighted potions should remain pickable");
  assert.equal(isLikelyPickupObjectTypeRuntime(0x132, typeWeights), false, "zero-weight fixtures must not be picked up");
  assert.equal(isLikelyPickupObjectTypeRuntime(0x058, typeWeights), true, "gold remains pickable despite zero-weight exception");
}

console.log("object_footprint_runtime_test: ok");
