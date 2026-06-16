import assert from "node:assert/strict";
import {
  applyHoverReportCopyResultRuntime,
  buildHoverReportTextRuntime,
  copiedHoverReportTextRuntime,
  fallbackCenterHoveredWorldCellRuntime,
  failedHoverReportTextRuntime,
  hexRuntime,
  hoverReportCopyResultRuntime,
  hoverReportUnavailableResultRuntime,
  hoveredOrFallbackWorldCellRuntime,
  hoveredWorldCellRuntime,
  hoverReportUnavailableTextRuntime,
  sanitizeHoverReportCopyFailureReasonRuntime,
  serverWorldObjectFootprintTextRuntime,
  serverWorldObjectHoverLineRuntime,
  serverWorldObjectsHoverTextRuntime
} from "../ui/hover_report_runtime.ts";

assert.equal(hexRuntime(0x2a), "0x2a");
assert.equal(hexRuntime(0x2a, 4), "0x002a");
assert.equal(hoveredWorldCellRuntime({
  sessionStarted: false,
  mouseInCanvas: true,
  mapReady: true,
  viewW: 16,
  viewH: 16,
  worldX: 100,
  worldY: 200,
  worldZ: 0
}), null);
assert.deepEqual(hoveredWorldCellRuntime({
  sessionStarted: true,
  mouseInCanvas: true,
  mapReady: true,
  mouseNormX: 0.5,
  mouseNormY: 0.5,
  canvasWidth: 320,
  canvasHeight: 320,
  viewW: 16,
  viewH: 16,
  worldX: 100,
  worldY: 200,
  worldZ: 1
}), {
  x: 100,
  y: 200,
  z: 1,
  gx: 8,
  gy: 8,
  startX: 92,
  startY: 192
});
assert.deepEqual(hoveredWorldCellRuntime({
  sessionStarted: true,
  mouseInCanvas: true,
  mapReady: true,
  legacyFramePreview: true,
  legacyMapRect: { x: 8, y: 8, w: 160, h: 160 },
  legacySurfaceWidth: 640,
  legacySurfaceHeight: 400,
  mouseNormX: 16 / 640,
  mouseNormY: 16 / 400,
  viewW: 16,
  viewH: 16,
  worldX: 100,
  worldY: 200,
  worldZ: 2
}), {
  x: 92,
  y: 192,
  z: 2,
  gx: 0,
  gy: 0,
  startX: 92,
  startY: 192
});
assert.equal(hoveredWorldCellRuntime({
  sessionStarted: true,
  mouseInCanvas: true,
  mapReady: true,
  legacyFramePreview: true,
  legacyMapRect: { x: 8, y: 8, w: 160, h: 160 },
  legacySurfaceWidth: 640,
  legacySurfaceHeight: 400,
  mouseNormX: 0.95,
  mouseNormY: 0.95,
  viewW: 16,
  viewH: 16,
  worldX: 100,
  worldY: 200,
  worldZ: 2
}), null);
assert.deepEqual(fallbackCenterHoveredWorldCellRuntime({
  sessionStarted: true,
  mapReady: true,
  viewW: 16,
  viewH: 16,
  worldX: 100,
  worldY: 200,
  worldZ: 3
}), {
  x: 100,
  y: 200,
  z: 3,
  gx: 8,
  gy: 8,
  startX: 92,
  startY: 192
});
assert.equal(fallbackCenterHoveredWorldCellRuntime({
  sessionStarted: false,
  mapReady: true,
  viewW: 16,
  viewH: 16,
  worldX: 100,
  worldY: 200,
  worldZ: 3
}), null);
assert.deepEqual(hoveredOrFallbackWorldCellRuntime({
  sessionStarted: true,
  mouseInCanvas: false,
  mapReady: true,
  viewW: 16,
  viewH: 16,
  worldX: 100,
  worldY: 200,
  worldZ: 3
}), {
  x: 100,
  y: 200,
  z: 3,
  gx: 8,
  gy: 8,
  startX: 92,
  startY: 192
});
assert.equal(hoverReportUnavailableTextRuntime(), "Hover report unavailable. Move cursor over the world view.");
assert.deepEqual(hoverReportUnavailableResultRuntime(), {
  clearCopyError: false,
  copyStatusDetail: "no hover cell",
  copyStatusOk: false,
  diagClass: "diag warn",
  diagText: "Hover report unavailable. Move cursor over the world view."
});
assert.equal(copiedHoverReportTextRuntime("header\ncell: 1,2,0\nrest"), "Copied hover report (1,2,0).");
assert.equal(failedHoverReportTextRuntime(), "Failed to copy hover report to clipboard.");
assert.equal(failedHoverReportTextRuntime("blocked"), "Failed to copy hover report to clipboard (blocked).");
assert.equal(sanitizeHoverReportCopyFailureReasonRuntime(" (blocked) "), "blocked");
assert.deepEqual(hoverReportCopyResultRuntime({
  ok: true,
  report: "header\ncell: 1,2,0\nrest"
}), {
  clearCopyError: true,
  copyStatusDetail: "",
  copyStatusOk: true,
  diagClass: "diag ok",
  diagText: "Copied hover report (1,2,0)."
});
assert.deepEqual(hoverReportCopyResultRuntime({
  ok: false,
  reason: " (blocked) "
}), {
  clearCopyError: false,
  copyStatusDetail: "blocked",
  copyStatusOk: false,
  diagClass: "diag warn",
  diagText: "Failed to copy hover report to clipboard (blocked)."
});
{
  const diag = {
    className: "",
    dataset: { copyError: "stale" },
    textContent: ""
  } as Pick<HTMLElement, "className" | "dataset" | "textContent">;
  const result = hoverReportCopyResultRuntime({
    ok: true,
    report: "header\ncell: 1,2,0\nrest"
  });
  assert.equal(applyHoverReportCopyResultRuntime(result, diag), result);
  assert.equal(diag.className, "diag ok");
  assert.equal(diag.textContent, "Copied hover report (1,2,0).");
  assert.equal(diag.dataset.copyError, undefined);
}

assert.equal(buildHoverReportTextRuntime({
  wx: 10,
  wy: 20,
  wz: 0,
  rawTile: 0x123,
  animTile: 0x124,
  tileFlag: 0x05,
  terrain: 0x02,
  visible: 1,
  open: 0,
  overlays: [{
    tileId: 0x200,
    floor: true,
    occluder: false,
    sourceX: 9,
    sourceY: 20,
    sourceType: "main"
  }],
  objects: [{
    type: 0x090,
    frame: 1,
    tileId: 0x210,
    tileFlags: 0x08,
    order: 3,
    legacyOrder: 2,
    assocChildCount: 1,
    assocChild0010Count: 0
  }]
}), [
  "VirtueMachine Hover Report",
  "cell: 10,20,0",
  "map: raw=0x123 anim=0x124 tf=0x5 terrain=0x2",
  "visibility: visible=1 open=0",
  "overlay[0]: tile=0x200 floor=1 occ=0 src=9,20 main",
  "obj[0]: type=0x90 frame=1 tile=0x210 tf=0x8 order=3 lord=2 achild=1 a0010=0"
].join("\n"));

assert.equal(buildHoverReportTextRuntime({
  wx: 10,
  wy: 20,
  wz: 0,
  rawTile: 1,
  animTile: 1,
  tileFlag: 0,
  terrain: 0,
  visible: 1,
  open: 1,
  overlays: [],
  objects: []
}), [
  "VirtueMachine Hover Report",
  "cell: 10,20,0",
  "map: raw=0x1 anim=0x1 tf=0x0 terrain=0x0",
  "visibility: visible=1 open=1",
  "overlay: none",
  "objects@cell: none"
].join("\n"));

assert.equal(serverWorldObjectFootprintTextRuntime([{ x: 1, y: 2, z: 0 }, { x: 3, y: 4, z: 0 }]), "1,2,0 3,4,0");
assert.equal(serverWorldObjectHoverLineRuntime({
  object_key: "baseline:1",
  type: 0x90,
  frame: 2,
  tile_id: 0x210,
  x: 10,
  y: 20,
  z: 0,
  status: 0x18,
  holder_kind: "none",
  assoc_chain: ["a", "b"],
  footprint: [{ x: 10, y: 20, z: 0 }]
}, 0), "server_obj[0]: key=baseline:1 type=0x90 frame=2 tile=0x210 xyz=10,20,0 src=baseline status=0x18 cu=0x18 hk=none hid= hkey= root= blocked= chain=a>b area=0 idx=0 lord=0 achild=0 a0010=0 fp=10,20,0");
assert.equal(serverWorldObjectsHoverTextRuntime([]), "server_objects:\nserver_obj: none");

console.log("ui_hover_report_runtime_test: ok");
