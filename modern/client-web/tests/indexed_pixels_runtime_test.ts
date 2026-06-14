import assert from "node:assert/strict";
import {
  canvasFromIndexedPixelsRuntime,
  fallbackTileColorRuntime,
  tilePaletteIndexRuntime
} from "../render/indexed_pixels_runtime.ts";
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
const factory = {
  createElement(tagName: "canvas"): HTMLCanvasElement {
    assert.equal(tagName, "canvas");
    const canvas = new FakeCanvas();
    created.push(canvas);
    return canvas as unknown as HTMLCanvasElement;
  }
};

const palette: RgbPaletteRuntime = Array.from({ length: 256 }, (_, i) => [i, i + 1, i + 2]);
const canvas = canvasFromIndexedPixelsRuntime({
  width: 2,
  height: 2,
  pixels: new Uint8Array([1, 2, 0xff, 250])
}, palette, factory, 0xff);

assert.ok(canvas);
assert.equal(canvas.width, 2);
assert.equal(canvas.height, 2);
assert.deepEqual(Array.from(created[0].ctx.lastImageData?.data ?? []), [
  1, 2, 3, 255,
  2, 3, 4, 255,
  0, 0, 0, 0,
  250, 251, 252, 255
]);
assert.equal(canvasFromIndexedPixelsRuntime(null, palette, factory), null);
assert.equal(canvasFromIndexedPixelsRuntime({ width: 1, height: 1, pixels: new Uint8Array([1]) }, null, factory), null);

assert.deepEqual(fallbackTileColorRuntime(5), [(5 * 53) & 0xff, (5 * 97) & 0xff, (5 * 31) & 0xff]);
assert.equal(tilePaletteIndexRuntime(0x123, null), 0x23);

const terrain = new Uint8Array(0x200);
terrain[0x10] = 0x52;
assert.equal(tilePaletteIndexRuntime(0x10, terrain), (0x58 + 0 + 1) & 0xff);
assert.equal(tilePaletteIndexRuntime(-1, terrain), 0xff);

console.log("indexed_pixels_runtime_test: ok");
