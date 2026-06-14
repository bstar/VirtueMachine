import assert from "node:assert/strict";
import { U6TileSetRuntime } from "../render/tile_set_runtime.ts";
import type { RgbPaletteRuntime } from "../assets/palette_runtime.ts";

class FakeContext2D {
  lastImageData: ImageData | null = null;

  createImageData(width: number, height: number): ImageData {
    return {
      width,
      height,
      colorSpace: "srgb",
      data: new Uint8ClampedArray(width * height * 4)
    } as ImageData;
  }

  putImageData(img: ImageData): void {
    this.lastImageData = img;
  }
}

class FakeCanvas {
  width = 0;
  height = 0;
  ctx = new FakeContext2D();

  getContext(kind: string): FakeContext2D | null {
    return kind === "2d" ? this.ctx : null;
  }
}

const created: FakeCanvas[] = [];
const canvasFactory = {
  createElement(tagName: "canvas"): HTMLCanvasElement {
    assert.equal(tagName, "canvas");
    const canvas = new FakeCanvas();
    created.push(canvas);
    return canvas as unknown as HTMLCanvasElement;
  }
};

function makeTileIndex(values: number[]): Uint8Array {
  const bytes = new Uint8Array(values.length * 2);
  const dv = new DataView(bytes.buffer);
  values.forEach((value, i) => dv.setUint16(i * 2, value, true));
  return bytes;
}

const tileIndex = makeTileIndex([0, 0, 16]);
const maskType = new Uint8Array(2048);
maskType[2] = 10;
const tiles = new Uint8Array(280);
for (let i = 0; i < 256; i += 1) {
  tiles[i] = i & 0xff;
}
tiles[4] = 0xe0;
tiles[255] = 0xff;

const pixelBlockOff = 16 * 16;
tiles[pixelBlockOff] = 0;
tiles[pixelBlockOff + 1] = 0;
tiles[pixelBlockOff + 2] = 0;
tiles[pixelBlockOff + 3] = 3;
tiles[pixelBlockOff + 4] = 7;
tiles[pixelBlockOff + 5] = 8;
tiles[pixelBlockOff + 6] = 9;
tiles[pixelBlockOff + 7] = 0;
tiles[pixelBlockOff + 8] = 0;
tiles[pixelBlockOff + 9] = 0;

const palette: RgbPaletteRuntime = Array.from({ length: 256 }, (_, i) => [i, i + 1, i + 2]);
const tileSet = new U6TileSetRuntime(
  tileIndex,
  maskType,
  tiles,
  new Uint8Array(),
  canvasFactory,
  (_mask, _tileId, palIdx) => palIdx === 0xff
);

assert.equal(tileSet.maskTypeFor(2), 10);
assert.equal(tileSet.maskTypeFor(-1), 0);
assert.equal(tileSet.getTileOffset(2), 256);
assert.equal(tileSet.getTileOffset(99), -1);

const raw = tileSet.decodeTilePixels(0);
assert.equal(raw[0], 0);
assert.equal(raw[4], 0xe0);
assert.strictEqual(tileSet.decodeTilePixels(0), raw);

const block = tileSet.decodeTilePixels(2);
assert.deepEqual(Array.from(block.slice(0, 5)), [7, 8, 9, 0xff, 0xff]);
assert.equal(tileSet.tileUsesLegacyPaletteFx(0), true);
assert.equal(tileSet.tileUsesLegacyPaletteFx(2), false);
assert.equal(tileSet.tileUsesLegacyPaletteFx(2), false);

const canvasA = tileSet.tileCanvas(0, palette, "a");
const canvasA2 = tileSet.tileCanvas(0, palette, "a");
const canvasB = tileSet.tileCanvas(0, palette, "b");
assert.ok(canvasA);
assert.equal(canvasA?.width, 16);
assert.equal(canvasA?.height, 16);
assert.strictEqual(canvasA2, canvasA);
assert.notStrictEqual(canvasB, canvasA);
assert.equal(created.length, 2);

const data = created[0].ctx.lastImageData?.data;
assert.ok(data);
assert.deepEqual(Array.from(data.slice(0, 8)), [
  0, 1, 2, 255,
  1, 2, 3, 255
]);
const p255 = 255 * 4;
assert.equal(data[p255 + 3], 0);

console.log("tile_set_runtime_test: ok");
