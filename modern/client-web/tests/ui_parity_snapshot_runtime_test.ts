import assert from "node:assert/strict";
import {
  buildParitySnapshotCellsRuntime,
  buildParitySnapshotRuntime,
  clampParityRadiusRuntime,
  hexU16Runtime,
  paritySnapshotWindowRuntime,
  paritySnapshotCopyResultRuntime,
  paritySnapshotCopiedTextRuntime,
  paritySnapshotCopyFailedTextRuntime,
  paritySnapshotUnavailableDiagRuntime
} from "../ui/parity_snapshot_runtime.ts";

assert.equal(hexU16Runtime(0x2a), "0x002a");
assert.equal(hexU16Runtime(-1), "0xffff");
assert.deepEqual(paritySnapshotWindowRuntime({ centerX: 10, centerY: 20, radius: 2 }), {
  startX: 8,
  startY: 18,
  viewW: 5,
  viewH: 5
});

assert.equal(clampParityRadiusRuntime("bad"), 12);
assert.equal(clampParityRadiusRuntime(0), 1);
assert.equal(clampParityRadiusRuntime(1.9), 1);
assert.equal(clampParityRadiusRuntime(99), 32);
assert.equal(clampParityRadiusRuntime(12), 12);

assert.equal(
  paritySnapshotCopiedTextRuntime({ x: 10.9, y: 20.2, z: 1, radius: 7.8 }),
  "Copied parity snapshot to clipboard (center=10,20,1 radius=7)."
);
assert.equal(paritySnapshotCopyFailedTextRuntime(), "Failed to copy parity snapshot to clipboard.");
assert.deepEqual(paritySnapshotCopyResultRuntime({ copied: true, x: 10.9, y: 20.2, z: 1, radius: 7.8 }), {
  copyStatusDetail: "",
  copyStatusOk: true,
  diagClass: "diag ok",
  diagText: "Copied parity snapshot to clipboard (center=10,20,1 radius=7)."
});
assert.deepEqual(paritySnapshotCopyResultRuntime({ copied: false, x: 10, y: 20, z: 1, radius: 7 }), {
  copyStatusDetail: "parity snapshot copy failed",
  copyStatusOk: false,
  diagClass: "diag warn",
  diagText: "Failed to copy parity snapshot to clipboard."
});
assert.deepEqual(paritySnapshotUnavailableDiagRuntime(), {
  diagClass: "diag warn",
  diagText: "Parity snapshot unavailable: session not started."
});

const cells = buildParitySnapshotCellsRuntime({
  startX: 10,
  startY: 20,
  viewW: 2,
  viewH: 1,
  z: 1,
  tileFlags: Object.assign([], { [0x101]: 0x04, [0x201]: 0x10 }),
  terrainType: Object.assign([], { [0x101]: 0x22 }),
  tileAt: (x) => x === 10 ? 0x101 : 0x102,
  animatedTileAt: (raw) => raw + 1,
  viewCtx: {
    visibleAtWorld: (x) => x === 10,
    openAtWorld: (_x, y) => y === 20
  },
  overlayCells: [[{
    tileId: 0x201,
    floor: true,
    occluder: false,
    sourceX: 8,
    sourceY: 9,
    sourceType: "spill-left",
    sourceObjType: 0x333
  }], []],
  objectsAt: (x) => x === 10
    ? [{ type: 0x444, frame: 2, order: 7 }]
    : [],
  resolveObjectTile: () => 0x201
});

assert.deepEqual(cells, [{
  x: 10,
  y: 20,
  z: 1,
  map: {
    rawHex: "0x0101",
    animHex: "0x0102",
    tileFlagsHex: "0x0004",
    terrainHex: "0x0022"
  },
  visibility: { visible: 1, open: 1 },
  overlay: [{
    idx: 0,
    tileHex: "0x0201",
    floor: 1,
    occluder: 0,
    sourceX: 8,
    sourceY: 9,
    sourceType: "spill-left",
    sourceObjTypeHex: "0x0333"
  }],
  objects: [{
    idx: 0,
    typeHex: "0x0444",
    frame: 2,
    tileHex: "0x0201",
    tileFlagsHex: "0x0010",
    order: 7
  }]
}, {
  x: 11,
  y: 20,
  z: 1,
  map: {
    rawHex: "0x0102",
    animHex: "0x0103",
    tileFlagsHex: "0x0000",
    terrainHex: "0x0000"
  },
  visibility: { visible: 0, open: 1 },
  overlay: [],
  objects: []
}]);

const snapshot = buildParitySnapshotRuntime({
  capturedAt: "2026-06-15T00:00:00.000Z",
  centerX: 100,
  centerY: 200,
  centerZ: 1,
  tick: 123,
  radius: 3,
  overlayCount: 4,
  hiddenSuppressedCount: 5,
  spillOutOfBoundsCount: 6,
  unsortedSourceCount: 7,
  cells: [{
    x: 100,
    y: 200,
    z: 1,
    map: { rawHex: "0x001" },
    visibility: { visible: 1 },
    overlay: [],
    objects: []
  }]
});

assert.deepEqual(snapshot, {
  kind: "VirtueMachineRoomParitySnapshot",
  capturedAt: "2026-06-15T00:00:00.000Z",
  tick: 123,
  center: { x: 100, y: 200, z: 1 },
  radius: 3,
  bounds: { x0: 97, y0: 197, x1: 103, y1: 203, z: 1 },
  parity: {
    overlayCount: 4,
    hiddenSuppressedCount: 5,
    spillOutOfBoundsCount: 6,
    unsortedSourceCount: 7
  },
  cells: [{
    x: 100,
    y: 200,
    z: 1,
    map: { rawHex: "0x001" },
    visibility: { visible: 1 },
    overlay: [],
    objects: []
  }]
});

console.log("ui_parity_snapshot_runtime_test: ok");
