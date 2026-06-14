import assert from "node:assert/strict";
import { OBJ_COORD_USE_LOCXYZ } from "../../common/u6_object_constants.ts";
import {
  buildObjectAnchorIndex,
  canNpcStepInto,
  objectBlocksCell,
  objectFootprintCells
} from "../world_object_collision.ts";

const flags = new Uint8Array(0x800);
flags[0x220] = 0x80;

assert.deepEqual(
  objectFootprintCells({ x: 10, y: 20, z: 0, tile_id: 0x220 }, flags),
  [
    { x: 10, y: 20, z: 0, tile_id: 0x220 },
    { x: 9, y: 20, z: 0, tile_id: 0x21f }
  ]
);

const bed = {
  object_key: "a00i001",
  coord_use: OBJ_COORD_USE_LOCXYZ,
  type: 0x0a3,
  frame: 0,
  tile_id: 0x200,
  x: 30,
  y: 40,
  z: 0
};
assert.equal(objectBlocksCell(bed, 30, 40, 0, flags), true);
assert.equal(objectBlocksCell(bed, 31, 40, 0, flags), false);

const state: any = {
  mapRuntime: {
    tileAt: () => 0x001
  },
  worldObjects: {
    terrainType: new Uint8Array(0x800),
    tileFlags: flags,
    active: [bed],
    activeByAnchor: buildObjectAnchorIndex([bed])
  }
};
assert.equal(canNpcStepInto(state, { to_x: 30, to_y: 40, to_z: 0 }), false);
assert.equal(canNpcStepInto(state, { to_x: 31, to_y: 40, to_z: 0 }), true);

state.worldObjects.terrainType[0x001] = 0x04;
assert.equal(canNpcStepInto(state, { to_x: 31, to_y: 40, to_z: 0 }), false);

console.log("world_object_collision_test: ok");
