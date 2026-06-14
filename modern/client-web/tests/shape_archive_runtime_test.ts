import assert from "node:assert/strict";
import {
  decodePortraitFromArchiveRuntime,
  decodeU6CursorPtrRuntime,
  decodeU6ShapeFromBufferRuntime,
  decodeU6ShpArchiveRuntime
} from "../assets/shape_archive_runtime.ts";

const identity = (bytes: Uint8Array) => bytes;

function makeShapeRaw(): Uint8Array {
  const bytes = new Uint8Array(8 + 2 + 2 + 2 + 3 + 2);
  const dv = new DataView(bytes.buffer);
  dv.setUint16(0, 0, true);
  dv.setUint16(2, 2, true);
  dv.setUint16(4, 0, true);
  dv.setUint16(6, 0, true);
  let off = 8;
  dv.setUint16(off, 6, true);
  off += 2;
  dv.setInt16(off, -2, true);
  off += 2;
  dv.setInt16(off, 0, true);
  off += 2;
  bytes.set([7, 8, 9], off);
  off += 3;
  dv.setUint16(off, 0, true);
  return bytes;
}

function makeShapeEncoded(): Uint8Array {
  const bytes = new Uint8Array(8 + 2 + 2 + 2 + 5 + 2);
  const dv = new DataView(bytes.buffer);
  dv.setUint16(0, 0, true);
  dv.setUint16(2, 3, true);
  dv.setUint16(4, 0, true);
  dv.setUint16(6, 0, true);
  let off = 8;
  dv.setUint16(off, 9, true);
  off += 2;
  dv.setInt16(off, -3, true);
  off += 2;
  dv.setInt16(off, 0, true);
  off += 2;
  bytes[off++] = 5;
  bytes[off++] = 4;
  bytes[off++] = 4;
  bytes[off++] = 5;
  bytes[off++] = 6;
  dv.setUint16(off, 0, true);
  return bytes;
}

const rawShape = decodeU6ShapeFromBufferRuntime(makeShapeRaw());
assert.equal(rawShape?.width, 3);
assert.equal(rawShape?.height, 1);
assert.equal(rawShape?.hotX, 2);
assert.deepEqual(Array.from(rawShape?.pixels ?? []), [7, 8, 9]);

const encodedShape = decodeU6ShapeFromBufferRuntime(makeShapeEncoded());
assert.deepEqual(Array.from(encodedShape?.pixels ?? []), [4, 4, 5, 6]);
assert.equal(decodeU6ShapeFromBufferRuntime(new Uint8Array([1, 2, 3])), null);

const shapeA = makeShapeRaw();
const shapeB = makeShapeEncoded();
const shp = new Uint8Array(12 + shapeA.length + shapeB.length);
const shpDv = new DataView(shp.buffer);
shpDv.setUint32(4, 12, true);
shpDv.setUint32(8, 12 + shapeA.length, true);
shp.set(shapeA, 12);
shp.set(shapeB, 12 + shapeA.length);
const archive = decodeU6ShpArchiveRuntime(shp, identity);
assert.equal(archive.length, 2);
assert.deepEqual(Array.from(archive[0]?.pixels ?? []), [7, 8, 9]);
assert.deepEqual(Array.from(archive[1]?.pixels ?? []), [4, 4, 5, 6]);

const cursorPayload = makeShapeRaw();
const cursorFileSize = 12 + cursorPayload.length;
const cursor = new Uint8Array(cursorFileSize);
const cursorDv = new DataView(cursor.buffer);
cursorDv.setUint32(0, cursorFileSize, true);
cursorDv.setUint32(4, 12, true);
cursorDv.setUint32(8, 0, true);
cursor.set(cursorPayload, 12);
const cursors = decodeU6CursorPtrRuntime(cursor, identity);
assert.equal(cursors.length, 1);
assert.deepEqual(Array.from(cursors[0].pixels), [7, 8, 9]);

const portraitPayload = new Uint8Array(56 * 64);
portraitPayload.fill(0x2a);
const portraitArchive = new Uint8Array(4 + portraitPayload.length);
new DataView(portraitArchive.buffer).setUint32(0, 4, true);
portraitArchive.set(portraitPayload, 4);
const portrait = decodePortraitFromArchiveRuntime(portraitArchive, identity, 0);
assert.equal(portrait?.width, 56);
assert.equal(portrait?.height, 64);
assert.equal(portrait?.pixels[0], 0x2a);
assert.equal(decodePortraitFromArchiveRuntime(portraitArchive, identity, 1), null);

console.log("shape_archive_runtime_test: ok");
