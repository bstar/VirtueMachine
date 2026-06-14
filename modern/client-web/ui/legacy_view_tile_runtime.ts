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

export type LegacyViewObjectRuntime = {
  baseTile: number;
  frame: number;
  order: number;
  renderable?: boolean;
  type: number;
  x: number;
  y: number;
  z: number;
};

export type LegacyBaseTileBuffersRuntime = {
  displayTiles: Uint16Array;
  rawTiles: Uint16Array;
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

export function buildBaseTileBuffersRuntime(args: {
  isBackgroundObjectTile(tileId: number): boolean;
  mapTileAt?: ((wx: number, wy: number, wz: number) => number) | null;
  objectsAt?: ((wx: number, wy: number, wz: number) => Iterable<LegacyViewObjectRuntime>) | null;
  objectsInWindowLegacyOrder?: ((
    startX: number,
    startY: number,
    width: number,
    height: number,
    wz: number
  ) => Iterable<LegacyViewObjectRuntime>) | null;
  processBackgroundObjects: boolean;
  resolveAnimatedObjectTile(obj: LegacyViewObjectRuntime): number;
  resolveDoorTileId(obj: LegacyViewObjectRuntime): number;
  startX: number;
  startY: number;
  terrainOf(tileId: number): number;
  tileFlagsForTile(tileId: number): number;
  viewCtx?: LegacyViewContextRuntime | null;
  viewH: number;
  viewW: number;
  wz: number;
}): LegacyBaseTileBuffersRuntime {
  const viewW = Math.max(0, args.viewW | 0);
  const viewH = Math.max(0, args.viewH | 0);
  const startX = args.startX | 0;
  const startY = args.startY | 0;
  const wz = args.wz | 0;
  const viewCtx = args.viewCtx ?? null;
  const rawTiles = new Uint16Array(viewW * viewH);
  const displayTiles = new Uint16Array(viewW * viewH);
  const cellIndex = (gx: number, gy: number) => (gy * viewW) + gx;
  const mapTileAt = args.mapTileAt ?? null;
  const tileDeps = {
    mapTileAt: mapTileAt ?? (() => 0),
    terrainOf: args.terrainOf,
    viewCtx
  };

  for (let gy = 0; gy < viewH; gy += 1) {
    for (let gx = 0; gx < viewW; gx += 1) {
      const wx = startX + gx;
      const wy = startY + gy;
      let rawTile = 0;
      let displayTile = 0;
      if (mapTileAt) {
        rawTile = mapTileAt(wx, wy, wz) & 0xffff;
        displayTile = rawTile;
        if (shouldBlackoutTileRuntime(rawTile, wx, wy, { terrainOf: args.terrainOf, viewCtx })) {
          rawTile = 0x0ff;
          displayTile = 0x0ff;
        } else {
          displayTile = stableCornerVariantRuntime(displayTile, wx, wy, wz, tileDeps);
        }
      } else {
        rawTile = (wx * 7 + wy * 13) & 0xff;
        displayTile = rawTile;
      }
      const idx = cellIndex(gx, gy);
      rawTiles[idx] = rawTile & 0xffff;
      displayTiles[idx] = displayTile & 0xffff;
    }
  }

  if (args.processBackgroundObjects && (args.objectsInWindowLegacyOrder || args.objectsAt)) {
    const visibleAtWorld = viewCtx && typeof viewCtx.visibleAtWorld === "function"
      ? viewCtx.visibleAtWorld.bind(viewCtx)
      : null;
    const applyBg = (wx: number, wy: number, tileId: number, sourceX: number, sourceY: number) => {
      const gx = (wx | 0) - startX;
      const gy = (wy | 0) - startY;
      if (gx < 0 || gy < 0 || gx >= viewW || gy >= viewH) {
        return;
      }
      if (visibleAtWorld && !visibleAtWorld(sourceX | 0, sourceY | 0)) {
        return;
      }
      if (!args.isBackgroundObjectTile(tileId)) {
        return;
      }
      const idx = cellIndex(gx, gy);
      rawTiles[idx] = tileId & 0xffff;
      displayTiles[idx] = tileId & 0xffff;
    };

    const processObject = (o: LegacyViewObjectRuntime) => {
      if (!o || !o.renderable) {
        return;
      }
      const wx = o.x | 0;
      const wy = o.y | 0;
      if (visibleAtWorld && !visibleAtWorld(wx, wy)) {
        return;
      }
      const animObjTile = args.resolveAnimatedObjectTile(o);
      if (animObjTile < 0) {
        return;
      }
      const footprintTile = args.resolveDoorTileId(o) & 0xffff;
      applyBg(wx, wy, animObjTile, wx, wy);
      const tf = args.tileFlagsForTile(footprintTile);
      if (tf & 0x80) {
        applyBg(wx - 1, wy, footprintTile - 1, wx, wy);
        if (tf & 0x40) {
          applyBg(wx, wy - 1, footprintTile - 2, wx, wy);
          applyBg(wx - 1, wy - 1, footprintTile - 3, wx, wy);
        }
      } else if (tf & 0x40) {
        applyBg(wx, wy - 1, footprintTile - 1, wx, wy);
      }
    };

    if (args.objectsInWindowLegacyOrder) {
      const stream = args.objectsInWindowLegacyOrder(startX, startY, viewW + 1, viewH + 1, wz);
      for (const o of stream) {
        processObject(o);
      }
    } else if (args.objectsAt) {
      for (let gy = 0; gy < viewH; gy += 1) {
        for (let gx = 0; gx < viewW; gx += 1) {
          const wx = startX + gx;
          const wy = startY + gy;
          const overlays = args.objectsAt(wx, wy, wz);
          for (const o of overlays) {
            processObject(o);
          }
        }
      }
    }
  }

  return { rawTiles, displayTiles };
}
