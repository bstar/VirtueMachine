import assert from "node:assert/strict";
import {
  ENTITY_TYPE_ACTOR_MIN_RUNTIME,
  NPC_FLAG_DIRECTION_MASK_RUNTIME,
  NPC_FLAG_WALKING_RUNTIME,
  U6EntityLayerRuntime
} from "../sim/entity_layer_runtime.ts";

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

function writeEntity(bytes: Uint8Array, id: number, args: {
  assocIndex?: number;
  coordUse?: number;
  frame?: number;
  npcFlag?: number;
  origFrame?: number;
  origType?: number;
  qual?: number;
  status?: number;
  type: number;
  x?: number;
  y?: number;
  z?: number;
}): void {
  const status = (args.status ?? args.coordUse ?? 0) & 0xff;
  bytes[0x0000 + id] = status;
  bytes[0x0700 + id] = args.qual ?? 0;
  bytes[0x0800 + id] = 0x55;
  bytes[0x11f1 + id] = 0x22;
  bytes[0x12f1 + id] = 0x33;
  bytes[0x19f1 + id] = args.npcFlag ?? 0;
  const shapeType = ((args.frame ?? 0) << 10) | (args.type & 0x03ff);
  writeU16LE(bytes, 0x0400 + (id * 2), shapeType);
  const origShapeType = ((args.origFrame ?? args.frame ?? 0) << 10) | ((args.origType ?? args.type) & 0x03ff);
  writeU16LE(bytes, 0x15f1 + (id * 2), origShapeType);
  const pos = 0x0100 + (id * 3);
  if ((status & 0x18) !== 0) {
    writeU16LE(bytes, pos, args.assocIndex ?? 0);
    bytes[pos + 2] = 0;
  } else {
    const [raw0, raw1, raw2] = encodePackedCoord(args.x ?? 0, args.y ?? 0, args.z ?? 0);
    bytes[pos] = raw0;
    bytes[pos + 1] = raw1;
    bytes[pos + 2] = raw2;
  }
}

const baseTiles = new Uint16Array(0x400);
baseTiles[ENTITY_TYPE_ACTOR_MIN_RUNTIME] = 0x400;
baseTiles[ENTITY_TYPE_ACTOR_MIN_RUNTIME + 1] = 0x410;
baseTiles[0x100] = 0x200;

const bytes = new Uint8Array(0x1bff);
writeEntity(bytes, 5, {
  type: ENTITY_TYPE_ACTOR_MIN_RUNTIME + 1,
  frame: 2,
  origFrame: 1,
  npcFlag: NPC_FLAG_WALKING_RUNTIME | 0x05,
  qual: 0x44,
  x: 20,
  y: 21,
  z: 0
});
writeEntity(bytes, 4, {
  type: ENTITY_TYPE_ACTOR_MIN_RUNTIME,
  frame: 1,
  x: 12,
  y: 10,
  z: 0
});
writeEntity(bytes, 6, {
  coordUse: 0x18,
  assocIndex: 4,
  type: ENTITY_TYPE_ACTOR_MIN_RUNTIME,
  frame: 3,
  npcFlag: 0x03
});
writeEntity(bytes, 7, {
  type: 0x100,
  x: 1,
  y: 1,
  z: 0
});

const layer = new U6EntityLayerRuntime(baseTiles);
const parsed = layer.parseObjList(bytes);
assert.deepEqual(parsed.entries.map((entry) => entry.id), [4, 5]);
assert.equal(parsed.entries[0].x, 12);
assert.equal(parsed.entries[0].y, 10);
assert.equal(parsed.entries[0].tileId, 0x401);
assert.equal(parsed.entries[1].direction, 0x05 & NPC_FLAG_DIRECTION_MASK_RUNTIME);
assert.equal(parsed.entries[1].walkingFlag, true);
assert.equal(parsed.entries[1].origFrame, 1);
assert.deepEqual(Object.keys(parsed.entries[0]).sort(), [
  "baseTile",
  "direction",
  "frame",
  "id",
  "npcComMode",
  "npcFlag",
  "npcMode",
  "npcStatus",
  "order",
  "origFrame",
  "origType",
  "qual",
  "status",
  "tileId",
  "type",
  "walkingFlag",
  "x",
  "y",
  "z"
]);
assert.deepEqual(parsed.assocEntries.map((entry) => entry.id), [6]);
assert.equal(parsed.assocEntries[0].assocIndex, 4);
assert.equal(parsed.assocEntries[0].tileId, 0x403);
assert.deepEqual(Object.keys(parsed.assocEntries[0]).sort(), [
  "assocIndex",
  "baseTile",
  "coordUse",
  "direction",
  "frame",
  "id",
  "npcComMode",
  "npcFlag",
  "npcMode",
  "npcStatus",
  "order",
  "origFrame",
  "origType",
  "status",
  "tileId",
  "type",
  "walkingFlag"
]);

layer.load(bytes);
assert.equal(layer.totalLoaded, 2);
assert.equal(layer.entries[0].homeX, 12);
assert.equal(layer.entries[0].authoritative, false);
assert.equal(layer.entries[1].patrolPhase, 1);
assert.equal(layer.entitiesInView(0, 0, 0, 30, 30).map((entry) => entry.id).join(","), "4,5");
assert.equal(layer.entitiesInView(13, 0, 0, 30, 30).map((entry) => entry.id).join(","), "5");

const tileFlags = new Uint8Array(0x800);
const terrainType = new Uint8Array(0x800);
tileFlags[0x123] = 0x04;
terrainType[0x124] = 0x04;
tileFlags[0x321] = 0x04;
tileFlags[0x322] = 0x20;
tileFlags[0x400] = 0x80;
tileFlags[0x500] = 0xc0;
assert.equal(layer.tileBlocks(1, 2, 0, { tileAt: () => 0x123 }, tileFlags, terrainType, null), true);
assert.equal(layer.tileBlocks(1, 2, 0, { tileAt: () => 0x322 }, tileFlags, terrainType, null), true);
assert.equal(layer.tileBlocks(1, 2, 0, { tileAt: () => 0x124 }, new Uint8Array(0x800), terrainType, null), true);
assert.equal(layer.tileBlocks(1, 2, 0, { tileAt: () => 0 }, tileFlags, terrainType, {
  objectsAt: () => [{ tileId: 0x321 }]
}), true);
assert.equal(layer.tileBlocks(1, 2, 0, { tileAt: () => 0 }, tileFlags, terrainType, {
  objectsAt: (x, y) => (x === 2 && y === 2 ? [{ tileId: 0x400 }] : [])
}), true);
assert.equal(layer.tileBlocks(1, 2, 0, { tileAt: () => 0 }, tileFlags, terrainType, {
  objectsAt: (x, y) => (x === 2 && y === 3 ? [{ tileId: 0x500 }] : [])
}), true);
assert.equal(layer.tileBlocks(1, 2, 0, { tileAt: () => 0 }, tileFlags, terrainType, {
  objectsAt: () => [{ renderable: false, tileId: 0x321 }]
}), false);
assert.equal(layer.tileBlocks(1, 2, 0, null, tileFlags, terrainType, null), false);
assert.equal(layer.step(1, null, null, null, null, null), 0);

console.log("entity_layer_runtime_test: ok");
