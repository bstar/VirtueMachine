import assert from "node:assert/strict";
import {
  activeCursorSurfaceRuntime,
  activeGameKeydownPlanRuntime,
  applyCanvasMouseEventRuntime,
  applyCanvasMouseStatePatchRuntime,
  canvasMouseStatePatchRuntime,
  clearCanvasMouseStateRuntime,
  isHoverReportCopyKeyRuntime,
  isShiftRightClickCopyGestureRuntime,
  legacyHudClickPlanRuntime,
  logicalPointAtSurfaceRuntime,
  logicalPointInBoundsRuntime,
  normalizedPointAtSurfaceRuntime,
  passTurnKeyRuntime,
  shouldLetBrowserHandleShortcutRuntime,
  shouldSuppressShiftContextMenuRuntime
} from "../ui/input_runtime.ts";

const point = logicalPointAtSurfaceRuntime({
  clientX: 110,
  clientY: 60,
  bounds: { left: 10, top: 10, width: 200, height: 100 },
  surfaceSize: { width: 640, height: 320 },
  logicalSize: { width: 320, height: 200 }
});
assert.deepEqual(point, { x: 160, y: 100 });
assert.equal(logicalPointInBoundsRuntime(point, { width: 320, height: 200 }), true);
assert.equal(logicalPointInBoundsRuntime({ x: -1, y: 0 }, { width: 320, height: 200 }), false);
assert.equal(logicalPointInBoundsRuntime({ x: 320, y: 0 }, { width: 320, height: 200 }), false);
assert.equal(logicalPointAtSurfaceRuntime({
  clientX: 0,
  clientY: 0,
  bounds: { left: 0, top: 0, width: 0, height: 100 },
  surfaceSize: { width: 640, height: 320 },
  logicalSize: { width: 320, height: 200 }
}), null);
assert.equal(logicalPointAtSurfaceRuntime({
  clientX: 0,
  clientY: 0,
  bounds: { left: 0, top: 0, width: 100, height: 100 },
  surfaceSize: { width: 0, height: 320 },
  logicalSize: { width: 320, height: 200 }
}), null);

assert.deepEqual(normalizedPointAtSurfaceRuntime({
  clientX: 50,
  clientY: 25,
  bounds: { left: 0, top: 0, width: 100, height: 100 }
}), { x: 0.5, y: 0.25 });
assert.deepEqual(canvasMouseStatePatchRuntime({
  clientX: 50,
  clientY: 25,
  bounds: { left: 0, top: 0, width: 100, height: 100 }
}), {
  mouseInCanvas: true,
  mouseNormX: 0.5,
  mouseNormY: 0.25
});
{
  const mouseState = {
    mouseInCanvas: false,
    mouseNormX: 0.1,
    mouseNormY: 0.2
  };
  assert.equal(applyCanvasMouseStatePatchRuntime(mouseState, {
    mouseInCanvas: true,
    mouseNormX: 0.5,
    mouseNormY: 0.25
  }), true);
  assert.deepEqual(mouseState, {
    mouseInCanvas: true,
    mouseNormX: 0.5,
    mouseNormY: 0.25
  });
  assert.equal(applyCanvasMouseStatePatchRuntime(mouseState, { mouseInCanvas: false }), false);
  assert.deepEqual(mouseState, {
    mouseInCanvas: true,
    mouseNormX: 0.5,
    mouseNormY: 0.25
  });
  clearCanvasMouseStateRuntime(mouseState);
  assert.deepEqual(mouseState, {
    mouseInCanvas: false,
    mouseNormX: 0.5,
    mouseNormY: 0.25
  });
}
{
  const mouseState = {
    mouseInCanvas: false,
    mouseNormX: 0,
    mouseNormY: 0
  };
  const surface = {
    getBoundingClientRect() {
      return { left: 10, top: 20, width: 200, height: 100 };
    }
  };
  assert.equal(applyCanvasMouseEventRuntime({
    event: { clientX: 60, clientY: 45 },
    state: mouseState,
    surface
  }), true);
  assert.deepEqual(mouseState, {
    mouseInCanvas: true,
    mouseNormX: 0.25,
    mouseNormY: 0.25
  });
  assert.equal(applyCanvasMouseEventRuntime({
    event: { clientX: 60, clientY: 45 },
    state: mouseState,
    surface: null
  }), false);
  assert.deepEqual(mouseState, {
    mouseInCanvas: true,
    mouseNormX: 0.25,
    mouseNormY: 0.25
  });
}
assert.deepEqual(canvasMouseStatePatchRuntime({
  clientX: 50,
  clientY: 25,
  bounds: { left: 0, top: 0, width: 0, height: 100 }
}), { mouseInCanvas: false });
assert.deepEqual(normalizedPointAtSurfaceRuntime({
  clientX: -25,
  clientY: 125,
  bounds: { left: 0, top: 0, width: 100, height: 100 }
}), { x: 0, y: 1 });
assert.equal(normalizedPointAtSurfaceRuntime({
  clientX: 50,
  clientY: 25,
  bounds: { left: 0, top: 0, width: 0, height: 100 }
}), null);
assert.equal(normalizedPointAtSurfaceRuntime({
  clientX: Number.NaN,
  clientY: 25,
  bounds: { left: 0, top: 0, width: 100, height: 100 }
}), null);

assert.equal(shouldSuppressShiftContextMenuRuntime({ shiftKey: true }), true);
assert.equal(shouldSuppressShiftContextMenuRuntime({ shiftKey: false }), false);
assert.equal(isShiftRightClickCopyGestureRuntime({ shiftKey: true, button: 2 }), true);
assert.equal(isShiftRightClickCopyGestureRuntime({ shiftKey: true, button: 0 }), false);
assert.equal(isShiftRightClickCopyGestureRuntime({ shiftKey: false, button: 2 }), false);
assert.equal(isShiftRightClickCopyGestureRuntime({ shiftKey: true, button: "2" }), true);

assert.equal(isHoverReportCopyKeyRuntime({ ctrlKey: true, shiftKey: true, key: "c" }), true);
assert.equal(isHoverReportCopyKeyRuntime({ ctrlKey: true, shiftKey: true, metaKey: true, key: "c" }), false);
assert.equal(isHoverReportCopyKeyRuntime({ shiftKey: true, code: "Backquote" }), true);
assert.equal(isHoverReportCopyKeyRuntime({ shiftKey: true, ctrlKey: true, code: "Backquote" }), false);
assert.equal(isHoverReportCopyKeyRuntime({ ctrlKey: true, key: "c" }), false);
assert.equal(shouldLetBrowserHandleShortcutRuntime({ ctrlKey: true, key: "v" }), true);
assert.equal(shouldLetBrowserHandleShortcutRuntime({ metaKey: true, key: "a" }), true);
assert.equal(shouldLetBrowserHandleShortcutRuntime({ ctrlKey: true, altKey: true, key: "s" }), false);
assert.equal(shouldLetBrowserHandleShortcutRuntime({ ctrlKey: true, shiftKey: true, key: "c" }), false);
assert.equal(shouldLetBrowserHandleShortcutRuntime({ shiftKey: true, code: "Backquote" }), false);
assert.equal(activeCursorSurfaceRuntime({
  hasLegacyBackdrop: true,
  legacyFramePreviewEnabled: true
}), "legacy_backdrop");
assert.equal(activeCursorSurfaceRuntime({
  hasLegacyBackdrop: false,
  legacyFramePreviewEnabled: true
}), "main");
assert.equal(activeCursorSurfaceRuntime({
  hasLegacyBackdrop: true,
  legacyFramePreviewEnabled: false
}), "main");
{
  const baseHudClick = {
    clientX: 160,
    clientY: 100,
    hitTest: (x: number, y: number) => x === 160 && y === 100 ? ({ id: "avatar" }) : null,
    legacyFramePreviewEnabled: true,
    legacyHudLayerHidden: false,
    serverConnectionBroken: false,
    sessionStarted: true,
    surfaceBounds: { left: 0, top: 0, width: 320, height: 200 },
    surfaceSize: { width: 320, height: 200 }
  };
  assert.deepEqual(legacyHudClickPlanRuntime(baseHudClick), {
    kind: "hit",
    hit: { id: "avatar" },
    point: { x: 160, y: 100 }
  });
  assert.deepEqual(legacyHudClickPlanRuntime({
    ...baseHudClick,
    sessionStarted: false
  }), { kind: "ignore" });
  assert.deepEqual(legacyHudClickPlanRuntime({
    ...baseHudClick,
    serverConnectionBroken: true
  }), { kind: "block_server" });
  assert.deepEqual(legacyHudClickPlanRuntime({
    ...baseHudClick,
    legacyFramePreviewEnabled: false
  }), { kind: "ignore" });
  assert.deepEqual(legacyHudClickPlanRuntime({
    ...baseHudClick,
    legacyHudLayerHidden: true
  }), { kind: "ignore" });
  assert.deepEqual(legacyHudClickPlanRuntime({
    ...baseHudClick,
    clientX: 400
  }), { kind: "ignore" });
  assert.deepEqual(legacyHudClickPlanRuntime({
    ...baseHudClick,
    hitTest: () => null
  }), { kind: "ignore" });
}
assert.deepEqual(passTurnKeyRuntime(" "), {
  diagClass: "diag ok",
  diagText: "Pass turn."
});
assert.deepEqual(passTurnKeyRuntime("Escape"), {
  diagClass: "diag ok",
  diagText: "Pass turn."
});
assert.equal(passTurnKeyRuntime("x"), null);
assert.deepEqual(activeGameKeydownPlanRuntime({
  hoverReportCopy: false,
  key: "q",
  legacyConversationActive: false,
  moveDelta: [1, 0],
  useCursorActive: false
}), { action: "return_to_title" });
assert.deepEqual(activeGameKeydownPlanRuntime({
  hoverReportCopy: true,
  key: "ArrowRight",
  legacyConversationActive: false,
  moveDelta: [1, 0],
  useCursorActive: false
}), { action: "hover_report_copy" });
assert.deepEqual(activeGameKeydownPlanRuntime({
  hoverReportCopy: false,
  key: "ArrowRight",
  legacyConversationActive: true,
  moveDelta: [1, 0],
  useCursorActive: false
}), { action: "legacy_conversation" });
assert.deepEqual(activeGameKeydownPlanRuntime({
  hoverReportCopy: false,
  key: "ArrowRight",
  legacyConversationActive: false,
  moveDelta: [1, 0],
  useCursorActive: true
}), { action: "target_cursor" });
assert.deepEqual(activeGameKeydownPlanRuntime({
  hoverReportCopy: false,
  key: "ArrowRight",
  legacyConversationActive: false,
  moveDelta: [1, 0],
  useCursorActive: false
}), { action: "move", dx: 1, dy: 0 });
assert.deepEqual(activeGameKeydownPlanRuntime({
  hoverReportCopy: false,
  key: "Escape",
  legacyConversationActive: false,
  moveDelta: null,
  useCursorActive: false
}), { action: "pass_turn", diag: { diagClass: "diag ok", diagText: "Pass turn." } });
assert.deepEqual(activeGameKeydownPlanRuntime({
  code: "Digit2",
  hoverReportCopy: false,
  key: "2",
  legacyConversationActive: false,
  moveDelta: null,
  useCursorActive: false
}), { action: "party_digit", digitKey: "2" });
assert.deepEqual(activeGameKeydownPlanRuntime({
  code: "KeyG",
  hoverReportCopy: false,
  key: "g",
  legacyConversationActive: false,
  moveDelta: null,
  useCursorActive: false
}), { action: "legacy_or_debug" });

console.log("ui_input_runtime_test: ok");
