import assert from "node:assert/strict";
import { U6AnimDataRuntime } from "../sim/anim_data_runtime.ts";

const maxAnim = 32;
const bytes = new Uint8Array(2 + (maxAnim * 2) + (maxAnim * 2) + maxAnim + maxAnim);
const dv = new DataView(bytes.buffer);
const offBase = 2;
const offStart = offBase + (maxAnim * 2);
const offMask = offStart + (maxAnim * 2);
const offShift = offMask + maxAnim;

dv.setUint16(0, 1, true);
dv.setUint16(offBase, 0x0100, true);
dv.setUint16(offStart, 0x0200, true);
bytes[offMask] = 0x06;
bytes[offShift] = 1;

const anim = U6AnimDataRuntime.fromBytes(bytes);
assert.ok(anim);
assert.equal(anim.hasBaseTile(0x0100), true);
assert.equal(anim.hasBaseTile(0x0101), false);
assert.equal(anim.animatedTile(0x0101, 7), 0x0101);
assert.equal(anim.animatedTile(0x0100, 6), 0x0203);

anim.setByBaseTile(0x0100, 2);
assert.equal(anim.animatedTile(0x0100, 6), 0x0200);

anim.setByBaseTile(0x0100, 0);
assert.equal(anim.animatedTile(0x0100, 6), 0x0200);

assert.equal(U6AnimDataRuntime.fromBytes(new Uint8Array([1])), null);

console.log("anim_data_runtime_test: ok");
