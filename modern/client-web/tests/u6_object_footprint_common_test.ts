import assert from "node:assert/strict";
import {
  isU6ImplicitSolidObjectTileRuntime,
  u6ObjectFootprintTilesRuntime
} from "../../common/u6_object_footprint.ts";

function flags(value: number) {
  return () => value;
}

assert.deepEqual(u6ObjectFootprintTilesRuntime(0, 0, 0x400, flags(0xc0)), [
  { x: 0, y: 0, tileId: 0x400 },
  { x: 1023, y: 0, tileId: 0x3ff },
  { x: 0, y: 1023, tileId: 0x3fe },
  { x: 1023, y: 1023, tileId: 0x3fd }
]);

assert.equal(isU6ImplicitSolidObjectTileRuntime(0x100, 0x400, flags(0x20)), true);
assert.equal(isU6ImplicitSolidObjectTileRuntime(0x100, 0x400, flags(0x80)), true);
assert.equal(isU6ImplicitSolidObjectTileRuntime(0x05f, 0x400, flags(0x80)), false);
assert.equal(isU6ImplicitSolidObjectTileRuntime(0x10f, 0x400, flags(0xe0)), false);

console.log("u6_object_footprint_common_test: ok");
