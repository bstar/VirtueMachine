import assert from "node:assert/strict";
import {
  applyLegacyCornerVariantRuntime,
  buildBaseTileBuffersRuntime,
  buildLegacyViewContextRuntime,
  legacyHudBackdropRenderPlanRuntime,
  legacyViewportFramePlacementsRuntime,
  shouldBlackoutTileRuntime,
  stableCornerVariantRuntime,
  type LegacyViewContextRuntime
} from "../ui/legacy_view_tile_runtime.ts";

function deps(overrides: {
  mapTileAt?: (wx: number, wy: number, wz: number) => number;
  terrainOf?: (tileId: number) => number;
  viewCtx?: LegacyViewContextRuntime | null;
} = {}) {
  return {
    mapTileAt: overrides.mapTileAt ?? (() => 0),
    terrainOf: overrides.terrainOf ?? ((tileId: number) => tileId),
    viewCtx: overrides.viewCtx ?? null
  };
}

function viewCtx(args: {
  open?: boolean;
  visible?: (wx: number, wy: number) => boolean;
  wall?: (wx: number, wy: number) => boolean;
} = {}): LegacyViewContextRuntime {
  return {
    openAtWorld: () => args.open === true,
    visibleAtWorld: args.visible ?? (() => false),
    wallAtWorld: args.wall ?? (() => false)
  };
}

const frameTiles = {
  bottom: 0x1b4,
  cornerBL: 0x1b3,
  cornerBR: 0x1b5,
  cornerTL: 0x1b0,
  cornerTR: 0x1b2,
  left: 0x1b6,
  right: 0x1b7,
  top: 0x1b1
};

assert.deepEqual(legacyHudBackdropRenderPlanRuntime({
  backdropH: 400,
  backdropW: 640,
  legacyFramePreviewEnabled: false
}), { kind: "skip" });
assert.deepEqual(legacyHudBackdropRenderPlanRuntime({
  backdropH: 0,
  backdropW: 640,
  legacyFramePreviewEnabled: true
}), { kind: "skip" });
assert.deepEqual(legacyHudBackdropRenderPlanRuntime({
  backdropH: 400,
  backdropW: 640,
  baseH: 400,
  baseW: 640,
  legacyFramePreviewEnabled: true
}), {
  backdropH: 400,
  backdropW: 640,
  kind: "render",
  restoreBase: true,
  scale: 2
});
assert.deepEqual(legacyHudBackdropRenderPlanRuntime({
  backdropH: 200,
  backdropW: 319,
  baseH: 200,
  baseW: 640,
  legacyFramePreviewEnabled: true
}), {
  backdropH: 200,
  backdropW: 319,
  kind: "render",
  restoreBase: false,
  scale: 1
});

{
  const placements = legacyViewportFramePlacementsRuntime({ tiles: frameTiles });
  assert.equal(placements.length, 40);
  assert.deepEqual(placements.slice(0, 4), [
    { tileId: 0x1b0, x: 0, y: 0 },
    { tileId: 0x1b2, x: 160, y: 0 },
    { tileId: 0x1b3, x: 0, y: 160 },
    { tileId: 0x1b5, x: 160, y: 160 }
  ]);
  assert.deepEqual(placements.slice(4, 8), [
    { tileId: 0x1b1, x: 16, y: 0 },
    { tileId: 0x1b4, x: 16, y: 160 },
    { tileId: 0x1b6, x: 0, y: 16 },
    { tileId: 0x1b7, x: 160, y: 16 }
  ]);
  assert.deepEqual(placements.slice(-4), [
    { tileId: 0x1b1, x: 144, y: 0 },
    { tileId: 0x1b4, x: 144, y: 160 },
    { tileId: 0x1b6, x: 0, y: 144 },
    { tileId: 0x1b7, x: 160, y: 144 }
  ]);
}

assert.deepEqual(legacyViewportFramePlacementsRuntime({
  cellSize: 8,
  edgeCells: 1,
  tiles: frameTiles
}), [
  { tileId: 0x1b0, x: 0, y: 0 },
  { tileId: 0x1b2, x: 16, y: 0 },
  { tileId: 0x1b3, x: 0, y: 16 },
  { tileId: 0x1b5, x: 16, y: 16 },
  { tileId: 0x1b1, x: 8, y: 0 },
  { tileId: 0x1b4, x: 8, y: 16 },
  { tileId: 0x1b6, x: 0, y: 8 },
  { tileId: 0x1b7, x: 16, y: 8 }
]);

assert.equal(applyLegacyCornerVariantRuntime(0x0c0, 10, 20, 0, deps({
  terrainOf: () => 0xf6
})), 0x0c0);

assert.equal(applyLegacyCornerVariantRuntime(0x090, 10, 20, 0, deps({
  terrainOf: () => 0x01
})), 0x090);

assert.equal(applyLegacyCornerVariantRuntime(0x090, 10, 20, 0, deps({
  terrainOf: () => 0xf6,
  viewCtx: viewCtx({
    visible: (wx, wy) => (
      (wx === 10 && wy === 19)
      || (wx === 11 && wy === 20)
    )
  })
})), 0x10b);

assert.equal(applyLegacyCornerVariantRuntime(0x090, 10, 20, 0, deps({
  terrainOf: () => 0x36,
  viewCtx: viewCtx({
    visible: (wx, wy) => (
      (wx === 10 && wy === 21)
      || (wx === 9 && wy === 20)
    ),
    wall: (wx, wy) => wx === 9 && wy === 20
  })
})), 0x10a);

assert.equal(stableCornerVariantRuntime(0x080, 10, 20, 0, deps({
  terrainOf: () => 0x01
})), 0x080);

assert.equal(shouldBlackoutTileRuntime(0x090, 10, 20, deps({
  terrainOf: () => 0x06,
  viewCtx: null
})), false);

assert.equal(shouldBlackoutTileRuntime(0x090, 10, 20, deps({
  terrainOf: () => 0x06,
  viewCtx: viewCtx({ open: true })
})), false);

assert.equal(shouldBlackoutTileRuntime(0x090, 10, 20, deps({
  terrainOf: () => 0x06,
  viewCtx: viewCtx({
    visible: (wx, wy) => wx === 10 && wy === 20
  })
})), false);

assert.equal(shouldBlackoutTileRuntime(0x010, 10, 20, deps({
  terrainOf: () => 0x01,
  viewCtx: viewCtx()
})), true);

assert.deepEqual(Array.from(buildBaseTileBuffersRuntime({
  isBackgroundObjectTile: () => false,
  mapTileAt: null,
  processBackgroundObjects: false,
  resolveAnimatedObjectTile: () => -1,
  resolveDoorTileId: () => 0,
  startX: 2,
  startY: 3,
  terrainOf: () => 0,
  tileFlagsForTile: () => 0,
  viewH: 2,
  viewW: 2,
  wz: 0
}).rawTiles), [
  ((2 * 7 + 3 * 13) & 0xff),
  ((3 * 7 + 3 * 13) & 0xff),
  ((2 * 7 + 4 * 13) & 0xff),
  ((3 * 7 + 4 * 13) & 0xff)
]);

assert.deepEqual(Array.from(buildBaseTileBuffersRuntime({
  isBackgroundObjectTile: () => false,
  mapTileAt: () => 0x012,
  processBackgroundObjects: false,
  resolveAnimatedObjectTile: () => -1,
  resolveDoorTileId: () => 0,
  startX: 10,
  startY: 20,
  terrainOf: () => 0x01,
  tileFlagsForTile: () => 0,
  viewCtx: viewCtx(),
  viewH: 1,
  viewW: 1,
  wz: 0
}).displayTiles), [0x0ff]);

assert.deepEqual(Array.from(buildBaseTileBuffersRuntime({
  isBackgroundObjectTile: (tileId) => tileId >= 0x200,
  mapTileAt: () => 0x001,
  objectsInWindowLegacyOrder: () => [
    { baseTile: 0x210, frame: 0, order: 0, renderable: true, type: 0x100, x: 11, y: 21, z: 0 }
  ],
  processBackgroundObjects: true,
  resolveAnimatedObjectTile: () => 0x210,
  resolveDoorTileId: () => 0x220,
  startX: 10,
  startY: 20,
  terrainOf: () => 0,
  tileFlagsForTile: () => 0xc0,
  viewH: 3,
  viewW: 3,
  wz: 0
}).displayTiles), [
  0x21d, 0x21e, 0x001,
  0x21f, 0x210, 0x001,
  0x001, 0x001, 0x001
]);

const openCtx = buildLegacyViewContextRuntime({
  dateD: 2,
  dateM: 1,
  hasWallTerrain: () => false,
  isBackgroundObjectTile: () => false,
  mapTileAt: () => 0,
  objectsAt: null,
  resolveAnimatedObjectTile: () => 0,
  startX: 100,
  startY: 200,
  tileFlagsForTile: () => 0,
  timeH: 12,
  timeM: 0,
  viewH: 3,
  viewW: 3,
  wz: 0
});
assert.equal(openCtx.visibleAtWorld(101, 201), true);
assert.equal(openCtx.openAtWorld(101, 201), true);
assert.equal(openCtx.wallAtWorld(101, 201), false);
assert.equal(openCtx.visibleAtWorld(999, 999), true);
assert.equal(openCtx.openAtWorld(999, 999), false);
assert.equal(openCtx.areaLightAtWorld?.(101, 201), 4);

const opaqueCtx = buildLegacyViewContextRuntime({
  dateD: 2,
  dateM: 1,
  hasWallTerrain: () => false,
  isBackgroundObjectTile: () => false,
  mapTileAt: (wx, wy) => (wx === 101 && wy === 201 ? 0x020 : 0),
  objectsAt: null,
  resolveAnimatedObjectTile: () => 0,
  startX: 100,
  startY: 200,
  tileFlagsForTile: (tileId) => tileId === 0x020 ? 0x04 : 0,
  timeH: 12,
  timeM: 0,
  viewH: 3,
  viewW: 3,
  wz: 0
});
assert.equal(opaqueCtx.openAtWorld(101, 201), false);

const objectCtx = buildLegacyViewContextRuntime({
  dateD: 1,
  dateM: 1,
  hasWallTerrain: (tileId) => tileId === 0x030,
  isBackgroundObjectTile: () => false,
  mapTileAt: () => 0,
  objectsAt: (wx, wy) => (wx === 101 && wy === 201
    ? [{ baseTile: 0, frame: 0, order: 0, renderable: true, type: 0, x: wx, y: wy, z: 0 }]
    : []),
  resolveAnimatedObjectTile: () => 0x030,
  startX: 100,
  startY: 200,
  tileFlagsForTile: (tileId) => tileId === 0x030 ? 0x03 : 0,
  timeH: 12,
  timeM: 0,
  viewH: 3,
  viewW: 3,
  wz: 0
});
assert.equal(objectCtx.wallAtWorld(101, 201), true);
assert.equal(objectCtx.areaLightAtWorld?.(101, 201), 4);

console.log("legacy_view_tile_runtime_test: ok");
