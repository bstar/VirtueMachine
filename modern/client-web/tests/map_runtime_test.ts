import assert from "node:assert/strict";
import { U6MapRuntime } from "../sim/map_runtime.ts";

function writePackedChunkPair(bytes: Uint8Array, off: number, left: number, right: number): void {
  const packed = ((right & 0x0fff) << 4) | (left & 0x000f);
  bytes[off] = packed & 0xff;
  bytes[off + 1] = (packed >> 8) & 0xff;
}

const chunks = new Uint8Array(96 * 0x40);

chunks[0x32 * 0x40] = 0x22;
chunks[3 * 0x40] = 0x33;
chunks[4 * 0x40] = 0x44;
chunks[0x54 * 0x40] = 0x44;
chunks[5 * 0x40] = 0x55;
chunks[0x45 * 0x40] = 0x66;

const map = new Uint8Array(0x7000);
writePackedChunkPair(map, 0, 2, 3);
writePackedChunkPair(map, 1 * 0x180, 4, 5);

const dungeonZ1Off = ((1 + 1 + 1) << 9) + 0x5a00;
writePackedChunkPair(map, dungeonZ1Off, 5, 4);

const runtime = new U6MapRuntime(map, chunks);

assert.equal(runtime.mkMapId(0, 0), 0);
assert.equal(runtime.mkMapId(128, 0), 1);
assert.equal(runtime.tileAt(0, 0, 0), 0x22);
assert.equal(runtime.tileAt(128, 0, 0), 0x44);
assert.equal(runtime.tileAt(0, 0, 1), 0x66);

const highBranchMap = new Uint8Array(0x7000);
writePackedChunkPair(highBranchMap, 1, 0, 3);
writePackedChunkPair(highBranchMap, 1 * 0x180 + 1, 0, 5);
writePackedChunkPair(highBranchMap, dungeonZ1Off + 1, 0, 4);
const highBranchRuntime = new U6MapRuntime(highBranchMap, chunks);
assert.equal(highBranchRuntime.tileAt(8, 0, 0), 0x33);
assert.equal(highBranchRuntime.tileAt(136, 0, 0), 0x55);
assert.equal(highBranchRuntime.tileAt(8, 0, 1), 0x44);

writePackedChunkPair(map, 2 * 0x180, 7, 9);
assert.equal(new U6MapRuntime(map, new Uint8Array(8 * 0x40)).tileAt(264, 0, 0), 0);

console.log("map_runtime_test: ok");
