import assert from "node:assert/strict";
import {
  cursorCycleRuntime,
  cursorDrawRectRuntime,
  cursorLogicalWidthRuntime,
  legacyCursorLayerTargetRuntime
} from "../ui/cursor_runtime.ts";

assert.deepEqual(cursorCycleRuntime({ count: 4, currentIndex: 0, delta: 1 }), {
  diagClass: "diag ok",
  diagText: "Cursor 2/4",
  index: 1
});
assert.deepEqual(cursorCycleRuntime({ count: 4, currentIndex: 0, delta: -1 }), {
  diagClass: "diag ok",
  diagText: "Cursor 4/4",
  index: 3
});
assert.deepEqual(cursorCycleRuntime({ count: 4, currentIndex: 3, delta: 2 }), {
  diagClass: "diag ok",
  diagText: "Cursor 2/4",
  index: 1
});
assert.equal(cursorCycleRuntime({ count: 0, currentIndex: 0, delta: 1 }), null);

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

assert.deepEqual(legacyCursorLayerTargetRuntime({
  backdropH: 400,
  backdropW: 640,
  hasViewport: true,
  mapRect: { x: 8, y: 8, w: 160, h: 160 },
  mouseNormX: 0.5,
  mouseNormY: 0.5,
  sessionStarted: true
}), {
  kind: "viewport",
  logicalW: 160,
  mouseX: 152,
  mouseY: 92
});
assert.deepEqual(legacyCursorLayerTargetRuntime({
  backdropH: 400,
  backdropW: 640,
  hasViewport: true,
  mapRect: { x: 8, y: 8, w: 160, h: 160 },
  mouseNormX: 0.95,
  mouseNormY: 0.95,
  sessionStarted: true
}), {
  kind: "backdrop",
  logicalW: 320,
  mouseX: 608,
  mouseY: 380
});
assert.deepEqual(legacyCursorLayerTargetRuntime({
  backdropH: 400,
  backdropW: 640,
  hasViewport: false,
  mapRect: { x: 8, y: 8, w: 160, h: 160 },
  mouseNormX: 0.5,
  mouseNormY: 0.5,
  sessionStarted: true
})?.kind, "backdrop");
assert.equal(legacyCursorLayerTargetRuntime({
  backdropH: 0,
  backdropW: 640,
  hasViewport: true,
  mapRect: { x: 8, y: 8, w: 160, h: 160 },
  mouseNormX: 0.5,
  mouseNormY: 0.5,
  sessionStarted: true
}), null);

console.log("cursor_runtime_test: ok");
