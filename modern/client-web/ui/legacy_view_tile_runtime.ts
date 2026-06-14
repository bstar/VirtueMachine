export type LegacyViewContextRuntime = {
  openAtWorld(wx: number, wy: number): boolean;
  visibleAtWorld(wx: number, wy: number): boolean;
  wallAtWorld(wx: number, wy: number): boolean;
};

export type LegacyViewTileDepsRuntime = {
  mapTileAt(wx: number, wy: number, wz: number): number;
  terrainOf(tileId: number): number;
  viewCtx?: LegacyViewContextRuntime | null;
};

const LEGACY_CORNER_TABLE_RUNTIME = [
  0, 0, 1, 10,
  0, 0, 2, 2,
  1, 5, 1, 1,
  11, 0, 2, 2
] as const;

export function applyLegacyCornerVariantRuntime(
  tileId: number,
  wx: number,
  wy: number,
  wz: number,
  deps: LegacyViewTileDepsRuntime
): number {
  /* Heuristic guard: in the web prototype we don't have full AreaFlags/object
     occlusion state from legacy `seg_1100`; remapping mid/high wall families
     (notably 0xC0+) can incorrectly turn wood walls into stone variants. */
  if (tileId >= 0x0c0 && tileId < 0x100) {
    return tileId;
  }
  const terrainOf = deps.terrainOf;
  const viewCtx = deps.viewCtx ?? null;
  const t = terrainOf(tileId);
  const terrainLow = t & 0x0f;
  if (terrainLow !== (0x04 | 0x02)) {
    return tileId;
  }

  let base = tileId & 0x0f0;
  if (base < 0x090) {
    base = 0x090;
  }

  const north = deps.mapTileAt(wx, wy - 1, wz);
  const west = deps.mapTileAt(wx - 1, wy, wz);

  /* Use view-context visibility bits like legacy AreaFlags[...]&0x80. */
  let bp0c = 0;
  if (!viewCtx || viewCtx.visibleAtWorld(wx, wy - 1)) bp0c |= 8;
  if (!viewCtx || viewCtx.visibleAtWorld(wx + 1, wy)) bp0c |= 4;
  if (!viewCtx || viewCtx.visibleAtWorld(wx, wy + 1)) bp0c |= 2;
  if (!viewCtx || viewCtx.visibleAtWorld(wx - 1, wy)) bp0c |= 1;

  if (bp0c === 0x0f || bp0c === 0x00) {
    return tileId;
  }

  let imped = (t >> 4) & 0x0f;
  if (imped & 4) {
    const nt = terrainOf(north);
    const nl = nt & 0x0f;
    if (!(nl & 0x04) || !(nt & 0x20)) {
      if (!viewCtx || !viewCtx.wallAtWorld(wx, wy - 1)) {
        imped &= ~8;
      }
    }
  }
  if (imped & 2) {
    const wt = terrainOf(west);
    const wl = wt & 0x0f;
    if (!(wl & 0x04) || !(wt & 0x40)) {
      if (!viewCtx || !viewCtx.wallAtWorld(wx - 1, wy)) {
        imped &= ~1;
      }
    }
  }

  if (imped === (4 | 2 | 1) || imped === (8 | 2 | 1) || imped > (8 | 4) || imped === bp0c) {
    imped &= bp0c;
    if (imped === (2 | 1) || imped === (8 | 4)) {
      return 0x100 + (base >> 3) - (0x090 >> 3) + LEGACY_CORNER_TABLE_RUNTIME[imped];
    }
    return base + LEGACY_CORNER_TABLE_RUNTIME[imped];
  }

  return tileId;
}

export function shouldBlackoutTileRuntime(
  rawTile: number,
  wx: number,
  wy: number,
  deps: {
    terrainOf(tileId: number): number;
    viewCtx?: LegacyViewContextRuntime | null;
  }
): boolean {
  const viewCtx = deps.viewCtx ?? null;
  if (!viewCtx) {
    return false;
  }
  if (viewCtx.openAtWorld(wx, wy)) {
    return false;
  }
  const terrainLow = deps.terrainOf(rawTile) & 0x0f;
  if (terrainLow === (0x04 | 0x02) && viewCtx.visibleAtWorld(wx, wy)) {
    return false;
  }
  return true;
}

export function stableCornerVariantRuntime(
  rawTile: number,
  wx: number,
  wy: number,
  wz: number,
  deps: LegacyViewTileDepsRuntime
): number {
  const terrainLow = deps.terrainOf(rawTile) & 0x0f;
  if (terrainLow !== (0x04 | 0x02)) {
    return rawTile;
  }
  return applyLegacyCornerVariantRuntime(rawTile, wx, wy, wz, deps) & 0xffff;
}
