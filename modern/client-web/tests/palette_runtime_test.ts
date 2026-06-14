import assert from "node:assert/strict";
import {
  buildLegacyPaletteFrameRuntime,
  buildPackedIntroPalettesRuntime,
  buildPaletteFromU6PalRuntime,
  buildStartupPaletteForMenuRuntime,
  cloneRgbPaletteRuntime,
  rotatePaletteRangeInPlaceRuntime,
  type RgbPaletteRuntime
} from "../assets/palette_runtime.ts";

function numberedPalette(): RgbPaletteRuntime {
  return Array.from({ length: 256 }, (_, i) => [i, i + 1, i + 2]);
}

const palBytes = new Uint8Array(256 * 3);
palBytes[0] = 1;
palBytes[1] = 2;
palBytes[2] = 63;
palBytes[3] = 80;
assert.deepEqual(buildPaletteFromU6PalRuntime(palBytes)[0], [4, 8, 252]);
assert.deepEqual(buildPaletteFromU6PalRuntime(palBytes)[1], [255, 0, 0]);
assert.deepEqual(buildPaletteFromU6PalRuntime(new Uint8Array([1, 2, 3]))[1], [0, 0, 0]);

const base = numberedPalette();
const clone = cloneRgbPaletteRuntime(base);
clone[1][0] = 99;
assert.equal(base[1][0], 1);

const frame = buildLegacyPaletteFrameRuntime(base, 1);
assert.ok(frame);
assert.deepEqual(frame[0xe1], base[0xe7]);
assert.deepEqual(frame[0xe0], base[0xe6]);
assert.deepEqual(frame[0xe9], base[0xef]);
assert.deepEqual(frame[0xf0], base[0xf3]);
assert.deepEqual(frame[0xf5], base[0xf4]);
assert.deepEqual(frame[0xfa], base[0xf9]);
assert.deepEqual(buildLegacyPaletteFrameRuntime(null, 1), null);

const startup = buildStartupPaletteForMenuRuntime(base, 0);
assert.ok(startup);
assert.deepEqual(startup[14], [252, 252, 84]);
assert.deepEqual(startup[33], [248, 200, 0]);
assert.deepEqual(base[14], [14, 15, 16]);
assert.equal(buildStartupPaletteForMenuRuntime(base.slice(0, 32), 0), null);

const rotating = numberedPalette();
rotatePaletteRangeInPlaceRuntime(rotating, 2, 4, 1);
assert.deepEqual(rotating.slice(2, 6), [
  [5, 6, 7],
  [2, 3, 4],
  [3, 4, 5],
  [4, 5, 6]
]);
rotatePaletteRangeInPlaceRuntime(rotating, 2, 4, -1);
assert.deepEqual(rotating.slice(2, 6), [
  [2, 3, 4],
  [3, 4, 5],
  [4, 5, 6],
  [5, 6, 7]
]);

function setPackedIntroColor(bytes: Uint8Array, paletteIndex: number, colorIndex: number, rgb6: [number, number, number]): void {
  const stride = 0x240;
  const srcOff = paletteIndex * stride;
  for (let j = 0; j < 3; j += 1) {
    const bitPos = (colorIndex * 3 * 6) + (j * 6);
    const bytePos = srcOff + (bitPos >> 3);
    const shift = bitPos & 7;
    const value = rgb6[j] & 0x3f;
    const mask = 0x3f << shift;
    const current = (bytes[bytePos] ?? 0) | ((bytes[bytePos + 1] ?? 0) << 8);
    const next = (current & ~mask) | (value << shift);
    bytes[bytePos] = next & 0xff;
    bytes[bytePos + 1] = (next >> 8) & 0xff;
  }
}

const packed = new Uint8Array(0x240 * 2);
setPackedIntroColor(packed, 1, 7, [1, 2, 63]);
const packedPalettes = buildPackedIntroPalettesRuntime(packed);
assert.equal(packedPalettes.length, 2);
assert.deepEqual(packedPalettes[1][7], [4, 8, 252]);

console.log("palette_runtime_test: ok");
