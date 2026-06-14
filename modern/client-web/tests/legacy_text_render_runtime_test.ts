import assert from "node:assert/strict";
import {
  drawLegacyContinueArrowRuntime,
  drawU6CompactTextRuntime,
  drawU6MainTextRuntime,
  measureU6TextWidthRuntime,
  u6GlyphSpanRuntime
} from "../render/legacy_text_render_runtime.ts";

class FakeTextContext {
  fillStyle = "";
  font = "";
  rects: Array<[number, number, number, number]> = [];
  texts: Array<[string, number, number]> = [];

  fillRect(x: number, y: number, w: number, h: number): void {
    this.rects.push([x, y, w, h]);
  }

  fillText(text: string, x: number, y: number): void {
    this.texts.push([text, x, y]);
  }
}

function makeFont(): Uint8Array {
  const font = new Uint8Array(256 * 8);
  const setRow = (code: number, row: number, bits: number) => {
    font[(code * 8) + row] = bits & 0xff;
  };
  setRow(65, 0, 0b01100000);
  setRow(65, 1, 0b10010000);
  setRow(1, 0, 0b00011000);
  setRow(1, 1, 0b00111100);
  return font;
}

const fallback = new FakeTextContext();
drawU6MainTextRuntime(fallback, null, "Hi", 3, 4, 2, "#fff");
assert.equal(fallback.fillStyle, "#fff");
assert.equal(fallback.font, "16px monospace");
assert.deepEqual(fallback.texts, [["Hi", 3, 18]]);

const font = makeFont();
assert.deepEqual(u6GlyphSpanRuntime(null, 65), { left: 0, right: 7, advance: 8 });
assert.deepEqual(u6GlyphSpanRuntime(font, 32), { left: 0, right: 2, advance: 3 });
assert.deepEqual(u6GlyphSpanRuntime(font, 65), { left: 0, right: 3, advance: 4 });
assert.deepEqual(u6GlyphSpanRuntime(font, 66), { left: 0, right: 2, advance: 3 });

assert.equal(measureU6TextWidthRuntime(font, "AA", false), 16);
assert.equal(measureU6TextWidthRuntime(font, "AA", true), 8);
assert.equal(measureU6TextWidthRuntime(null, "AA", true), 16);

const main = new FakeTextContext();
drawU6MainTextRuntime(main, font, "A", 10, 20, 2, "#abc");
assert.equal(main.fillStyle, "#abc");
assert.deepEqual(main.rects, [
  [12, 20, 2, 2],
  [14, 20, 2, 2],
  [10, 22, 2, 2],
  [16, 22, 2, 2]
]);

const compact = new FakeTextContext();
drawU6CompactTextRuntime(compact, font, "AA", 0, 0, 1, "#def");
assert.equal(compact.fillStyle, "#def");
assert.deepEqual(compact.rects.slice(0, 4), [
  [1, 0, 1, 1],
  [2, 0, 1, 1],
  [0, 1, 1, 1],
  [3, 1, 1, 1]
]);
assert.deepEqual(compact.rects.slice(4, 8), [
  [5, 0, 1, 1],
  [6, 0, 1, 1],
  [4, 1, 1, 1],
  [7, 1, 1, 1]
]);

const arrow = new FakeTextContext();
drawLegacyContinueArrowRuntime(arrow, font, 5, 6, 0, "#123");
assert.equal(arrow.fillStyle, "#123");
assert.deepEqual(arrow.rects, [
  [8, 6, 1, 1],
  [9, 6, 1, 1],
  [7, 7, 1, 1],
  [8, 7, 1, 1],
  [9, 7, 1, 1],
  [10, 7, 1, 1]
]);

console.log("legacy_text_render_runtime_test: ok");
