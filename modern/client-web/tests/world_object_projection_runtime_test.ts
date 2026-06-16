import assert from "node:assert/strict";
import {
  objectLayerProjectionActionsFromServerObjectsRuntime,
  objectLayerEntryFromServerObjectRuntime,
  targetObjectsFromServerObjectsRuntime
} from "../net/world_object_projection_runtime.ts";

assert.deepEqual(targetObjectsFromServerObjectsRuntime([{
  footprint: [{ x: 11, y: 10, z: 0 }],
  frame: 2,
  legacy_order: 123,
  object_key: "a1ai228",
  source_index: 0x228,
  status: 0,
  tile_id: 0x357,
  type: 0x0e8,
  x: 10,
  y: 10,
  z: 0
}, {
  frame: 0,
  object_key: "",
  type: 0x0e0
}]), [{
  footprint: [{ x: 11, y: 10, z: 0 }],
  frame: 2,
  index: 0x228,
  key: "a1ai228",
  legacy_order: 123,
  object_key: "a1ai228",
  order: 0x228,
  renderable: true,
  source_index: 0x228,
  status: 0,
  tile_id: 0x357,
  type: 0x0e8,
  x: 10,
  y: 10,
  z: 0
}]);

assert.equal(targetObjectsFromServerObjectsRuntime([{
  frame: 0,
  object_key: "inv:a1ai228:avatar:1",
  source_index: 0x228,
  status: 0,
  type: 0x0e8,
  x: 10,
  y: 10,
  z: 0
}])[0].legacy_order, 0x8228);

const layerBaseTiles = new Uint16Array(0x400);
layerBaseTiles[0x0e8] = 0x350;

assert.deepEqual(objectLayerEntryFromServerObjectRuntime({
  frame: 2,
  legacy_order: 123,
  object_key: "a1ai228",
  source_area: 0x1a,
  source_index: 0x228,
  status: 0,
  type: 0x0e8,
  x: 381,
  y: 409,
  z: 0
}, layerBaseTiles), {
  assocIndex: 0,
  baseTile: 0x350,
  coordUse: 0,
  frame: 2,
  index: 0x228,
  legacyOrder: 123,
  objectKey: "a1ai228",
  order: 0x228,
  renderable: true,
  sourceArea: 0x1a,
  sourceIndex: 0x228,
  status: 0,
  tileId: 0x352,
  type: 0x0e8,
  x: 381,
  y: 409,
  z: 0
});

assert.equal(objectLayerEntryFromServerObjectRuntime({
  frame: 2,
  object_key: "a1ai228",
  status: 0x10,
  type: 0x0e8
}, layerBaseTiles), null);

assert.deepEqual(objectLayerProjectionActionsFromServerObjectsRuntime([{
  frame: 2,
  object_key: "a1ai228",
  source_kind: "baseline",
  source_object_key: "a1ai228",
  status: 0,
  type: 0x0e8
}], layerBaseTiles, (key) => key === "a1ai228"), [{
  kind: "remove",
  object_key: "a1ai228"
}]);

assert.deepEqual(objectLayerProjectionActionsFromServerObjectsRuntime([{
  frame: 2,
  legacy_order: 123,
  object_key: "inv:a1ai228:avatar:1",
  source_kind: "spawned",
  source_object_key: "a1ai228",
  status: 0,
  type: 0x0e8,
  x: 381,
  y: 409,
  z: 0
}], layerBaseTiles, (key) => key === "a1ai228"), [{
  entry: {
    assocIndex: 0,
    baseTile: 0x350,
    coordUse: 0,
    frame: 2,
    index: 0xde13,
    legacyOrder: 123,
    objectKey: "inv:a1ai228:avatar:1",
    order: 0xde13,
    renderable: true,
    sourceArea: 0x3f,
    sourceIndex: 0xde13,
    status: 0,
    tileId: 0x352,
    type: 0x0e8,
    x: 381,
    y: 409,
    z: 0
  },
  kind: "upsert"
}]);

assert.deepEqual(objectLayerProjectionActionsFromServerObjectsRuntime(null, layerBaseTiles, () => false), []);

console.log("world_object_projection_runtime_test: ok");
