import assert from "node:assert/strict";
import {
  applyLegacyCornerVariantRuntime,
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

console.log("legacy_view_tile_runtime_test: ok");
