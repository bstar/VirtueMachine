import assert from "node:assert/strict";
import {
  decodeLegacyPixmapRuntime,
  decodeLookLzdEntriesRuntime
} from "../assets/legacy_pixmap_runtime.ts";

const identity = (bytes: Uint8Array) => bytes;

const pixmapBytes = new Uint8Array([
  2, 0,
  2, 0,
  1, 2,
  3, 4,
  0xff
]);
const pixmap = decodeLegacyPixmapRuntime(pixmapBytes, identity);
assert.equal(pixmap?.width, 2);
assert.equal(pixmap?.height, 2);
assert.deepEqual(Array.from(pixmap?.pixels ?? []), [1, 2, 3, 4]);
assert.equal(decodeLegacyPixmapRuntime(new Uint8Array([2, 0, 2, 0, 1]), identity), null);
assert.equal(decodeLegacyPixmapRuntime(null, identity), null);

const lookBytes = new Uint8Array([
  0x34, 0x12, 0x20, 0x42, 0x6f, 0x6f, 0x74, 0x20, 0,
  0x35, 0x12, 0,
  0x36, 0x12, 0x53, 0x68, 0x69, 0x65, 0x6c, 0x64
]);
assert.deepEqual(decodeLookLzdEntriesRuntime(lookBytes, identity), [
  { tileId: 0x1234, text: "Boot" },
  { tileId: 0x1236, text: "Shield" }
]);
assert.deepEqual(decodeLookLzdEntriesRuntime(new Uint8Array([1, 2]), identity), []);

console.log("legacy_pixmap_runtime_test: ok");
