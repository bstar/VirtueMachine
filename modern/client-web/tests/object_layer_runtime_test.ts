import assert from "node:assert/strict";
import {
  U6ObjectLayerRuntime,
  isRenderableWorldObjectTypeRuntime,
  objectLayerAnchorKeyRuntime
} from "../sim/object_layer_runtime.ts";

function writeU16LE(bytes: Uint8Array, off: number, value: number): void {
  bytes[off] = value & 0xff;
  bytes[off + 1] = (value >> 8) & 0xff;
}

function encodePackedCoord(x: number, y: number, z: number): [number, number, number] {
  return [
    x & 0xff,
    ((x >> 8) & 0x03) | ((y & 0x3f) << 2),
    ((y >> 6) & 0x0f) | ((z & 0x0f) << 4)
  ];
}

function writeObjRecord(bytes: Uint8Array, index: number, args: {
  assocIndex?: number;
  frame?: number;
  status: number;
  type: number;
  x?: number;
  y?: number;
  z?: number;
}): void {
  const off = 2 + (index * 8);
  bytes[off] = args.status & 0xff;
  if ((args.status & 0x18) !== 0) {
    writeU16LE(bytes, off + 1, args.assocIndex ?? 0);
    bytes[off + 3] = 0;
  } else {
    const [raw0, raw1, raw2] = encodePackedCoord(args.x ?? 0, args.y ?? 0, args.z ?? 0);
    bytes[off + 1] = raw0;
    bytes[off + 2] = raw1;
    bytes[off + 3] = raw2;
  }
  writeU16LE(bytes, off + 4, ((args.frame ?? 0) << 10) | (args.type & 0x3ff));
}

const baseTiles = new Uint16Array(0x400);
baseTiles[0x07b] = 0x300;
baseTiles[0x080] = 0x400;
baseTiles[0x081] = 0x410;
baseTiles[0x153] = 0x500;
baseTiles[0x14f] = 0x600;

assert.equal(isRenderableWorldObjectTypeRuntime(0x080), true);
assert.equal(isRenderableWorldObjectTypeRuntime(0x153), false);
assert.equal(isRenderableWorldObjectTypeRuntime(0x14f), false);

const objblk = new Uint8Array(2 + (5 * 8));
writeU16LE(objblk, 0, 10);
writeObjRecord(objblk, 0, { status: 0, type: 0x07b, x: 5, y: 5, z: 0 });
writeObjRecord(objblk, 1, { status: 0, type: 0x080, frame: 2, x: 5, y: 6, z: 0 });
writeObjRecord(objblk, 2, { status: 0x10, type: 0x081, assocIndex: 0 });
writeObjRecord(objblk, 3, { status: 0x02, type: 0x080, x: 7, y: 8, z: 0 });
writeObjRecord(objblk, 4, { status: 0, type: 0x153, x: 9, y: 9, z: 0 });

const layer = new U6ObjectLayerRuntime(baseTiles);
const parsed = layer.parseObjBlk(objblk, 0x2a);
assert.equal(parsed.entries.length, 3);
assert.equal(parsed.entries[0].sourceArea, 0x2a);
assert.equal(parsed.entries[0].tileId, 0x300);
assert.equal(parsed.entries[0].assocChildCount, 1);
assert.equal(parsed.entries[0].assocChild0010Count, 1);
assert.equal(parsed.entries[2].renderable, false);
assert.deepEqual(Object.keys(parsed.entries[0]).sort(), [
  "assocChild0010Count",
  "assocChildCount",
  "assocIndex",
  "baseTile",
  "coordUse",
  "frame",
  "index",
  "legacyOrder",
  "order",
  "renderable",
  "sourceArea",
  "sourceIndex",
  "status",
  "tileId",
  "type",
  "x",
  "y",
  "z"
]);
assert.equal(parsed.assocEntries.length, 1);
assert.equal(parsed.assocEntries[0].assocObj?.index, 0);
assert.deepEqual(layer.parseObjBlk(new Uint8Array([0]), 0).entries, []);

layer.addEntries(parsed);
assert.equal(layer.totalLoaded, 3);
assert.equal(layer.objectsAt(5, 5, 0)[0].frame, 1);
assert.equal(layer.objectsAt(5, 5, 0)[0].tileId, 0x301);
assert.deepEqual(layer.objectsInWindowLegacyOrder(5, 5, 2, 2, 0).map((obj) => obj.index), [0, 1]);

const removedKey = objectLayerAnchorKeyRuntime(parsed.entries[1]);
const filtered = new U6ObjectLayerRuntime(baseTiles, (obj) => objectLayerAnchorKeyRuntime(obj) === removedKey);
filtered.addEntries(parsed);
assert.deepEqual(filtered.objectsAt(5, 6, 0).map((obj) => obj.index), []);
assert.equal(filtered.objectsAt(5, 5, 0)[0].frame, 0);

const fetched = new U6ObjectLayerRuntime(baseTiles);
await fetched.loadOutdoor(async (name) => {
  if (name === "objblkaa") {
    return {
      ok: true,
      arrayBuffer: async () => objblk.buffer.slice(objblk.byteOffset, objblk.byteOffset + objblk.byteLength)
    };
  }
  return { ok: false, arrayBuffer: async () => new ArrayBuffer(0) };
});
assert.equal(fetched.filesLoaded, 1);
assert.equal(fetched.totalLoaded, 3);

fetched.upsertRuntimeEntry({
  assocIndex: 0,
  baseTile: 0x400,
  coordUse: 0,
  frame: 2,
  index: 0xf001,
  legacyOrder: 0x7001,
  objectKey: "inv:a00i001:avatar:1",
  order: 0xf001,
  renderable: true,
  sourceArea: 0x3f,
  sourceIndex: 0xf001,
  status: 0,
  tileId: 0x402,
  type: 0x080,
  x: 10,
  y: 11,
  z: 0
});
assert.equal(fetched.objectsAt(10, 11, 0).some((obj) => obj.objectKey === "inv:a00i001:avatar:1"), true);
fetched.upsertRuntimeEntry({
  assocIndex: 0,
  baseTile: 0x400,
  coordUse: 0,
  frame: 2,
  index: 0xf001,
  legacyOrder: 0x7001,
  objectKey: "inv:a00i001:avatar:1",
  order: 0xf001,
  renderable: true,
  sourceArea: 0x3f,
  sourceIndex: 0xf001,
  status: 0,
  tileId: 0x402,
  type: 0x080,
  x: 12,
  y: 13,
  z: 0
});
assert.equal(fetched.objectsAt(10, 11, 0).some((obj) => obj.objectKey === "inv:a00i001:avatar:1"), false);
assert.equal(fetched.objectsAt(12, 13, 0).some((obj) => obj.objectKey === "inv:a00i001:avatar:1"), true);
fetched.removeRuntimeEntryByObjectKey("inv:a00i001:avatar:1");
assert.equal(fetched.objectsAt(12, 13, 0).some((obj) => obj.objectKey === "inv:a00i001:avatar:1"), false);
fetched.upsertRuntimeEntry({
  assocIndex: 0,
  baseTile: 0x400,
  coordUse: 0,
  frame: 2,
  index: 0x01f,
  legacyOrder: 0x701f,
  order: 0x01f,
  renderable: true,
  sourceArea: 0x1a,
  sourceIndex: 0x01f,
  status: 0,
  tileId: 0x402,
  type: 0x080,
  x: 14,
  y: 15,
  z: 0
});
assert.equal(fetched.objectsAt(14, 15, 0).some((obj) => obj.sourceArea === 0x1a && obj.sourceIndex === 0x01f), true);
fetched.removeRuntimeEntryByServerKey("a1ai01f");
assert.equal(fetched.objectsAt(14, 15, 0).some((obj) => obj.sourceArea === 0x1a && obj.sourceIndex === 0x01f), false);

console.log("object_layer_runtime_test: ok");
