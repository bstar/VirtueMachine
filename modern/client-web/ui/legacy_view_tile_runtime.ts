export type LegacyViewContextRuntime = {
  areaLightAtWorld?(wx: number, wy: number): number;
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

export type LegacyViewportFrameTilesRuntime = {
  bottom: number;
  cornerBL: number;
  cornerBR: number;
  cornerTL: number;
  cornerTR: number;
  left: number;
  right: number;
  top: number;
};

export type LegacyViewportFramePlacementRuntime = {
  tileId: number;
  x: number;
  y: number;
};

export type LegacyHudBackdropRenderPlanRuntime =
  | { kind: "skip" }
  | {
    backdropH: number;
    backdropW: number;
    kind: "render";
    restoreBase: boolean;
    scale: number;
  };

export function legacyHudBackdropRenderPlanRuntime(args: {
  backdropH: unknown;
  backdropW: unknown;
  baseH?: unknown;
  baseW?: unknown;
  legacyFramePreviewEnabled: boolean;
}): LegacyHudBackdropRenderPlanRuntime {
  if (!args.legacyFramePreviewEnabled) {
    return { kind: "skip" };
  }
  const backdropW = Number(args.backdropW) | 0;
  const backdropH = Number(args.backdropH) | 0;
  if (backdropW <= 0 || backdropH <= 0) {
    return { kind: "skip" };
  }
  return {
    backdropH,
    backdropW,
    kind: "render",
    restoreBase: (Number(args.baseW) | 0) === backdropW && (Number(args.baseH) | 0) === backdropH,
    scale: Math.max(1, Math.floor(backdropW / 320))
  };
}

export function legacyViewportFramePlacementsRuntime(args: {
  cellSize?: unknown;
  edgeCells?: unknown;
  tiles: LegacyViewportFrameTilesRuntime;
}): LegacyViewportFramePlacementRuntime[] {
  const cellSize = Math.max(1, Number(args.cellSize ?? 16) | 0);
  const edgeCells = Math.max(0, Number(args.edgeCells ?? 9) | 0);
  const edgeEnd = (edgeCells + 1) * cellSize;
  const placements: LegacyViewportFramePlacementRuntime[] = [
    { tileId: args.tiles.cornerTL, x: 0, y: 0 },
    { tileId: args.tiles.cornerTR, x: edgeEnd, y: 0 },
    { tileId: args.tiles.cornerBL, x: 0, y: edgeEnd },
    { tileId: args.tiles.cornerBR, x: edgeEnd, y: edgeEnd }
  ];
  for (let i = 1; i <= edgeCells; i += 1) {
    const pos = i * cellSize;
    placements.push(
      { tileId: args.tiles.top, x: pos, y: 0 },
      { tileId: args.tiles.bottom, x: pos, y: edgeEnd },
      { tileId: args.tiles.left, x: 0, y: pos },
      { tileId: args.tiles.right, x: edgeEnd, y: pos }
    );
  }
  return placements;
}

export function buildLegacyViewContextRuntime(args: {
  dateD: number;
  dateM: number;
  hasWallTerrain(tileId: number): boolean;
  isBackgroundObjectTile(tileId: number): boolean;
  mapTileAt(wx: number, wy: number, wz: number): number;
  objectsAt?: ((wx: number, wy: number, wz: number) => Iterable<LegacyViewObjectRuntime>) | null;
  resolveAnimatedObjectTile(obj: LegacyViewObjectRuntime): number;
  startX: number;
  startY: number;
  tileFlagsForTile(tileId: number): number;
  timeH: number;
  timeM: number;
  viewH: number;
  viewW: number;
  wz: number;
}): LegacyViewContextRuntime {
  const startX = args.startX | 0;
  const startY = args.startY | 0;
  const wz = args.wz | 0;
  const viewW = Math.max(0, args.viewW | 0);
  const viewH = Math.max(0, args.viewH | 0);
  const PAD = 4;
  const W = viewW + (PAD * 2);
  const H = viewH + (PAD * 2);
  const C_X = PAD + (viewW >> 1);
  const C_Y = PAD + (viewH >> 1);
  const FLAG_BA = 0x04;
  const FLAG_WALL = 0x08;
  const FLAG_WIN = 0x10;
  const FLAG_OPA = 0x20;
  const FLAG_VISITED = 0x40;
  const FLAG_VISIBLE = 0x80;

  const baseTiles = Array.from({ length: H }, () => new Uint16Array(W));
  const flags = Array.from({ length: H }, () => new Uint8Array(W));
  const open = Array.from({ length: H }, () => new Uint8Array(W));
  const areaLight = Array.from({ length: H }, () => new Uint8Array(W));
  const LEGACY_LIGHT_FALLOFF = [
    [0, 1, 2, 3, 4, 5, 6, 7],
    [1, 1, 2, 3, 4, 5, 6, 7],
    [2, 2, 3, 4, 5, 6, 6, 7],
    [3, 3, 4, 4, 5, 6, 7, 8],
    [4, 4, 5, 5, 6, 7, 7, 8],
    [5, 5, 6, 6, 7, 7, 8, 9],
    [6, 6, 6, 7, 7, 8, 8, 9],
    [7, 7, 7, 8, 8, 9, 9, 10]
  ];

  const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;
  const clampToLegacyLightRange = (n: number) => {
    const v = n | 0;
    if (v < 0) return 0;
    if (v > 4) return 4;
    return v;
  };
  const ambientLightLevel = () => {
    const hour = Number(args.timeH) >>> 0;
    const minute = Number(args.timeM) >>> 0;
    const dateD = Number(args.dateD) >>> 0;
    const dateM = Number(args.dateM) >>> 0;
    const isEclipse = (dateD === 1) && ((dateM % 3) === 0);
    if (isEclipse || !(hour >= 5 && hour <= 19) || (wz > 0 && wz < 5)) {
      return 0;
    }
    if (hour === 5) {
      return clampToLegacyLightRange(Math.floor(minute / 10) + 1);
    }
    if (hour === 19) {
      return clampToLegacyLightRange(Math.floor((59 - minute) / 10) + 1);
    }
    return 7;
  };
  const legacyLightDistance = (dx: number, dy: number) => {
    const ax = Math.min(7, Math.abs(dx | 0));
    const ay = Math.min(7, Math.abs(dy | 0));
    return LEGACY_LIGHT_FALLOFF[ax][ay] | 0;
  };
  const markFlag = (x: number, y: number, bit: number) => {
    if (inBounds(x, y)) {
      flags[y][x] |= bit;
    }
  };
  const isTileOpa = (tileId: number) => (args.tileFlagsForTile(tileId) & 0x04) !== 0;
  const isTileWin = (tileId: number) => (args.tileFlagsForTile(tileId) & 0x08) !== 0;
  const isTileDoubleV = (tileId: number) => (args.tileFlagsForTile(tileId) & 0x40) !== 0;
  const isTileDoubleH = (tileId: number) => (args.tileFlagsForTile(tileId) & 0x80) !== 0;

  const applyObjFlags = (gx: number, gy: number, tileId: number) => {
    if (!inBounds(gx, gy)) {
      return;
    }
    if (isTileWin(tileId)) {
      markFlag(gx, gy, FLAG_WIN);
    } else if (isTileOpa(tileId)) {
      markFlag(gx, gy, FLAG_OPA);
    } else if (args.isBackgroundObjectTile(tileId)) {
      markFlag(gx, gy, FLAG_BA);
    }
    if (isTileOpa(tileId - 1)) {
      if (isTileDoubleV(tileId)) {
        markFlag(gx, gy - 1, FLAG_OPA);
      }
      if (isTileDoubleH(tileId)) {
        markFlag(gx - 1, gy, FLAG_OPA);
      }
    }
    if (args.hasWallTerrain(tileId)) {
      markFlag(gx, gy, FLAG_WALL);
      if (isTileDoubleV(tileId)) {
        markFlag(gx, gy - 1, FLAG_WALL);
      }
      if (isTileDoubleH(tileId)) {
        markFlag(gx - 1, gy, FLAG_WALL);
      }
    }
    const sourceLight = args.tileFlagsForTile(tileId) & 0x03;
    if (sourceLight > 0 && inBounds(gx, gy)) {
      const prior = flags[gy][gx] & 0x03;
      if (prior < sourceLight) {
        flags[gy][gx] = (flags[gy][gx] & ~0x03) | sourceLight;
      }
    }
  };

  for (let gy = 0; gy < H; gy += 1) {
    for (let gx = 0; gx < W; gx += 1) {
      const wx = startX + gx - PAD;
      const wy = startY + gy - PAD;
      baseTiles[gy][gx] = args.mapTileAt(wx, wy, wz);
    }
  }

  if (args.objectsAt) {
    for (let gy = 0; gy < H; gy += 1) {
      for (let gx = 0; gx < W; gx += 1) {
        const wx = startX + gx - PAD;
        const wy = startY + gy - PAD;
        const overlays = args.objectsAt(wx, wy, wz);
        for (const o of overlays) {
          const tileId = args.resolveAnimatedObjectTile(o);
          applyObjFlags(gx, gy, tileId);
        }
      }
    }
  }

  const isVisibleAt = (gx: number, gy: number) => {
    if (!inBounds(gx, gy)) {
      return false;
    }
    const tile = baseTiles[gy][gx];
    const f = flags[gy][gx];
    if (f & FLAG_OPA) {
      return false;
    }
    if (isTileWin(tile) || (f & FLAG_WIN)) {
      return (
        (gx === C_X && Math.abs(gy - C_Y) < 2)
        || (gy === C_Y && Math.abs(gx - C_X) < 2)
      );
    }
    if (!(f & FLAG_BA) && isTileOpa(tile)) {
      return false;
    }
    return true;
  };

  const q: Array<[number, number]> = [];
  const pushVisit = (gx: number, gy: number) => {
    if (!inBounds(gx, gy)) {
      return;
    }
    if (flags[gy][gx] & FLAG_VISITED) {
      return;
    }
    flags[gy][gx] |= FLAG_VISITED;
    q.push([gx, gy]);
  };

  if (isVisibleAt(C_X, C_Y)) {
    pushVisit(C_X, C_Y);
  } else {
    if (isVisibleAt(C_X + 1, C_Y)) pushVisit(C_X + 1, C_Y);
    if (isVisibleAt(C_X, C_Y + 1)) pushVisit(C_X, C_Y + 1);
  }

  const stepX = [0, 1, 0, 0, -1, -1, 0, 0];
  const stepY = [-1, 0, 1, 1, 0, 0, -1, -1];

  while (q.length) {
    const next = q.shift();
    if (!next) {
      break;
    }
    const [gx, gy] = next;
    flags[gy][gx] |= FLAG_VISIBLE;
    if (!isVisibleAt(gx, gy)) {
      continue;
    }
    open[gy][gx] = 1;
    let nx = gx;
    let ny = gy;
    for (let i = 0; i < stepX.length; i += 1) {
      nx += stepX[i];
      ny += stepY[i];
      pushVisit(nx, ny);
    }
  }

  const ambient = ambientLightLevel();
  for (let gy = 0; gy < H; gy += 1) {
    for (let gx = 0; gx < W; gx += 1) {
      if ((flags[gy][gx] & FLAG_VISIBLE) === 0) {
        continue;
      }
      const base = clampToLegacyLightRange(4 - legacyLightDistance(gx - C_X, gy - C_Y) + ambient);
      areaLight[gy][gx] = (areaLight[gy][gx] + base) & 0xff;
    }
  }
  if (ambient < 7) {
    for (let sy = 0; sy < H; sy += 1) {
      for (let sx = 0; sx < W; sx += 1) {
        if ((flags[sy][sx] & FLAG_VISIBLE) === 0) {
          continue;
        }
        const source = flags[sy][sx] & 0x03;
        if (source <= 0) {
          continue;
        }
        for (let gy = Math.max(0, sy - 3); gy <= Math.min(H - 1, sy + 3); gy += 1) {
          for (let gx = Math.max(0, sx - 3); gx <= Math.min(W - 1, sx + 3); gx += 1) {
            if ((flags[gy][gx] & FLAG_VISIBLE) === 0) {
              continue;
            }
            const add = clampToLegacyLightRange(source - legacyLightDistance(gx - sx, gy - sy));
            if (add > 0) {
              areaLight[gy][gx] = (areaLight[gy][gx] + add) & 0xff;
            }
          }
        }
      }
    }
  }

  const toGrid = (wx: number, wy: number) => ({
    gx: (wx | 0) - startX + PAD,
    gy: (wy | 0) - startY + PAD
  });

  return {
    visibleAtWorld(wx: number, wy: number) {
      const { gx, gy } = toGrid(wx, wy);
      if (!inBounds(gx, gy)) {
        return true;
      }
      return (flags[gy][gx] & FLAG_VISIBLE) !== 0;
    },
    wallAtWorld(wx: number, wy: number) {
      const { gx, gy } = toGrid(wx, wy);
      if (!inBounds(gx, gy)) {
        return false;
      }
      return (flags[gy][gx] & FLAG_WALL) !== 0;
    },
    openAtWorld(wx: number, wy: number) {
      const { gx, gy } = toGrid(wx, wy);
      if (!inBounds(gx, gy)) {
        return false;
      }
      return open[gy][gx] !== 0;
    },
    areaLightAtWorld(wx: number, wy: number) {
      const { gx, gy } = toGrid(wx, wy);
      if (!inBounds(gx, gy)) {
        return 0;
      }
      return areaLight[gy][gx] | 0;
    }
  };
}


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
