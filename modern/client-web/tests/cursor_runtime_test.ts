import assert from "node:assert/strict";
import {
  cursorDrawRectRuntime,
  cursorLogicalWidthRuntime
} from "../ui/cursor_runtime.ts";

assert.equal(cursorLogicalWidthRuntime({
  isLegacyFramePreview: false,
  sessionStarted: false,
  viewWidthTiles: 11
}), 320);
assert.equal(cursorLogicalWidthRuntime({
  isLegacyFramePreview: true,
  sessionStarted: true,
  viewWidthTiles: 11
}), 320);
assert.equal(cursorLogicalWidthRuntime({
  isLegacyFramePreview: false,
  sessionStarted: true,
  viewWidthTiles: 11
}), 176);

assert.deepEqual(cursorDrawRectRuntime({
  aspectX: 1,
  aspectY: 1.2,
  logicalW: 320,
  mouseNormX: 0.5,
  mouseNormY: 0.5,
  shape: { width: 16, height: 10 },
  targetW: 640,
  targetH: 400
}), {
  drawH: 24,
  drawW: 32,
  hotX: 8,
  hotY: 5,
  mouseX: 320,
  mouseY: 200,
  px: 304,
  py: 188,
  scale: 2,
  scaleX: 2,
  scaleY: 2.4
});

assert.deepEqual(cursorDrawRectRuntime({
  aspectX: 1,
  aspectY: 1,
  logicalW: 160,
  mouseX: 5,
  mouseY: 5,
  shape: { width: 16, height: 16, hotX: -10, hotY: 99 },
  targetW: 320,
  targetH: 320
}), {
  drawH: 32,
  drawW: 32,
  hotX: 0,
  hotY: 15,
  mouseX: 5,
  mouseY: 5,
  px: 5,
  py: 0,
  scale: 2,
  scaleX: 2,
  scaleY: 2
});

assert.deepEqual(cursorDrawRectRuntime({
  aspectX: 1,
  aspectY: 1,
  logicalW: 320,
  mouseX: 999,
  mouseY: 999,
  shape: { width: 20, height: 20, hotX: 10, hotY: 10 },
  targetW: 100,
  targetH: 80
})?.px, 80);
assert.deepEqual(cursorDrawRectRuntime({
  aspectX: 1,
  aspectY: 1,
  logicalW: 320,
  mouseX: 999,
  mouseY: 999,
  shape: { width: 20, height: 20, hotX: 10, hotY: 10 },
  targetW: 100,
  targetH: 80
})?.py, 60);

assert.equal(cursorDrawRectRuntime({
  logicalW: 320,
  shape: null,
  targetW: 100,
  targetH: 100
}), null);
assert.equal(cursorDrawRectRuntime({
  logicalW: 320,
  shape: { width: 0, height: 16 },
  targetW: 100,
  targetH: 100
}), null);
assert.equal(cursorDrawRectRuntime({
  logicalW: 320,
  shape: { width: 16, height: 16 },
  targetW: 0,
  targetH: 100
}), null);

console.log("cursor_runtime_test: ok");
