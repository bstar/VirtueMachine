import assert from "node:assert/strict";
import { decodeRuntimeTileflagSlicesRuntime } from "../assets/runtime_asset_tileflags.ts";

function patternedBuffer(length: number): ArrayBuffer {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = i & 0xff;
  }
  return bytes.buffer;
}

function byteRange(length: number, start: number, end: number): number[] {
  return Array.from(new Uint8Array(patternedBuffer(length).slice(start, end)));
}

{
  const slices = decodeRuntimeTileflagSlicesRuntime(true, patternedBuffer(0x1c00));
  assert.deepEqual(Array.from(slices.terrainType ?? []), byteRange(0x1c00, 0, 0x800));
  assert.deepEqual(Array.from(slices.tileFlags ?? []), byteRange(0x1c00, 0x800, 0x1000));
  assert.deepEqual(Array.from(slices.typeWeights ?? []), byteRange(0x1c00, 0x1000, 0x1400));
  assert.deepEqual(Array.from(slices.tileFlags2 ?? []), byteRange(0x1c00, 0x1400, 0x1c00));
}

{
  const slices = decodeRuntimeTileflagSlicesRuntime(true, patternedBuffer(0x1800));
  assert.equal(slices.typeWeights, null);
  assert.deepEqual(Array.from(slices.terrainType ?? []), byteRange(0x1800, 0, 0x800));
  assert.deepEqual(Array.from(slices.tileFlags ?? []), byteRange(0x1800, 0x800, 0x1000));
  assert.deepEqual(Array.from(slices.tileFlags2 ?? []), byteRange(0x1800, 0x1000, 0x1800));
}

{
  const slices = decodeRuntimeTileflagSlicesRuntime(true, patternedBuffer(0x1000));
  assert.equal(slices.typeWeights, null);
  assert.equal(slices.tileFlags2, null);
  assert.deepEqual(Array.from(slices.terrainType ?? []), byteRange(0x1000, 0, 0x800));
  assert.deepEqual(Array.from(slices.tileFlags ?? []), byteRange(0x1000, 0x800, 0x1000));
}

{
  const slices = decodeRuntimeTileflagSlicesRuntime(true, patternedBuffer(0x800));
  assert.equal(slices.typeWeights, null);
  assert.equal(slices.tileFlags2, null);
  assert.deepEqual(Array.from(slices.terrainType ?? []), byteRange(0x800, 0, 0x800));
  assert.deepEqual(Array.from(slices.tileFlags ?? []), byteRange(0x800, 0, 0x800));
}

assert.deepEqual(decodeRuntimeTileflagSlicesRuntime(false, patternedBuffer(0x1c00)), {
  terrainType: null,
  tileFlags: null,
  typeWeights: null,
  tileFlags2: null
});
assert.deepEqual(decodeRuntimeTileflagSlicesRuntime(true, patternedBuffer(0x7ff)), {
  terrainType: null,
  tileFlags: null,
  typeWeights: null,
  tileFlags2: null
});

console.log("runtime_asset_tileflags_test: ok");
