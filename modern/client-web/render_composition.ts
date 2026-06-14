import { compareLegacyObjectOrderStable } from "./legacy_object_order.ts";

type TileFlagsRuntime = ArrayLike<number> | null | undefined;

type OverlaySourceType = "main" | "spill-left" | "spill-up" | "spill-up-left" | "legacy-special" | string;

export type RenderCompositionObject = {
  assocObj?: RenderCompositionObject | null;
  coordUse?: number;
  order?: number;
  renderable?: boolean;
  sourceArea?: number;
  sourceIndex?: number;
  status?: number;
  tileId?: number;
  type?: number;
  x: number;
  y: number;
  z: number;
};

export type RenderOverlaySource = {
  objType: number | undefined;
  type: OverlaySourceType;
  x: number;
  y: number;
};

export type RenderOverlayCell = {
  dbg: string;
  floor: boolean;
  occluder: boolean;
  sourceObjType: number | undefined;
  sourceType: OverlaySourceType;
  sourceX: number;
  sourceY: number;
  tileId: number;
};

export type RenderOverlayGrid = RenderOverlayCell[][];

type RenderViewContext = {
  openAtWorld?: (x: number, y: number) => boolean;
  visibleAtWorld?: (x: number, y: number) => boolean;
} | null | undefined;

type RenderObjectLayer<TObject extends RenderCompositionObject = RenderCompositionObject> = {
  objectsAt(x: number, y: number, z: number): readonly TObject[];
  objectsInWindowLegacyOrder?(
    startX: number,
    startY: number,
    viewW: number,
    viewH: number,
    z: number
  ): readonly TObject[];
} | null | undefined;

type LegacyOverlayInjectionArgs<TObject extends RenderCompositionObject = RenderCompositionObject> = {
  insertWorldTile(
    wx: number,
    wy: number,
    tileId: number,
    bp06?: number,
    source?: RenderOverlaySource | null,
    debugLabel?: string
  ): void;
  startX: number;
  startY: number;
  stream: readonly TObject[] | null;
  viewCtx: RenderViewContext;
  viewH: number;
  viewW: number;
  wz: number;
};

type BuildOverlayCellsOptions<TObject extends RenderCompositionObject = RenderCompositionObject> = {
  hasWallTerrain?: ((tileId: number) => boolean) | null;
  injectLegacyOverlays?: ((args: LegacyOverlayInjectionArgs<TObject>) => number) | null;
  isBackgroundObjectTile?: ((tileId: number, obj: TObject) => boolean) | null;
  objectLayer: RenderObjectLayer<TObject>;
  resolveAnimatedObjectTile(obj: TObject): number;
  resolveFootprintTile?: ((obj: TObject) => number) | null;
  startX: number;
  startY: number;
  tileFlags?: TileFlagsRuntime;
  viewCtx?: RenderViewContext;
  viewH: number;
  viewW: number;
  wz: number;
};

type OverlayParity = {
  hiddenSuppressedCount: number;
  spillOutOfBoundsCount: number;
  unsortedSourceCount: number;
};

type BuildOverlayCellsResult = {
  overlayCells: RenderOverlayGrid | null;
  overlayCount: number;
  parity: OverlayParity;
};

type ActorOcclusionEntity = {
  x: number;
  y: number;
};

export function isLegacyPixelTransparent(mask: number, tileId: number, palIdx: number): boolean {
  const zeroIsTransparent = tileId <= 0x01ff;
  if (mask === 10 || mask === 5) {
    return palIdx === 0xff || (zeroIsTransparent && palIdx === 0x00);
  }
  return false;
}

function overlayTileIsFloor(tileId: number, tileFlags: TileFlagsRuntime): boolean {
  if (!tileFlags) {
    return false;
  }
  return (tileFlags[tileId & 0x07ff] & 0x10) !== 0;
}

function overlayTileIsOccluder(
  tileId: number,
  tileFlags: TileFlagsRuntime,
  hasWallTerrain: ((tileId: number) => boolean) | null | undefined
): boolean {
  if (!tileFlags) {
    return false;
  }
  const tf = tileFlags[tileId & 0x07ff] ?? 0;
  if ((tf & 0x04) !== 0 || (tf & 0x08) !== 0) {
    return true;
  }
  return Boolean(hasWallTerrain && hasWallTerrain(tileId));
}

export function buildOverlayCellsModel<TObject extends RenderCompositionObject>(
  opts: BuildOverlayCellsOptions<TObject>
): BuildOverlayCellsResult {
  const {
    viewW,
    viewH,
    startX,
    startY,
    wz,
    viewCtx,
    objectLayer,
    tileFlags,
    resolveAnimatedObjectTile,
    resolveFootprintTile,
    hasWallTerrain,
    injectLegacyOverlays,
    isBackgroundObjectTile
  } = opts;

  if (!objectLayer || typeof objectLayer.objectsAt !== "function") {
    return {
      overlayCells: null,
      overlayCount: 0,
      parity: {
        hiddenSuppressedCount: 0,
        spillOutOfBoundsCount: 0,
        unsortedSourceCount: 0
      }
    };
  }

  const overlayCells: RenderOverlayGrid = Array.from({ length: viewW * viewH }, () => []);
  const parity = {
    hiddenSuppressedCount: 0,
    spillOutOfBoundsCount: 0,
    unsortedSourceCount: 0
  };
  const cellIndex = (gx: number, gy: number): number => (gy * viewW) + gx;
  const inView = (gx: number, gy: number): boolean => gx >= 0 && gy >= 0 && gx < viewW && gy < viewH;
  const visibleAtWorld = viewCtx && typeof viewCtx.visibleAtWorld === "function"
    ? viewCtx.visibleAtWorld.bind(viewCtx)
    : null;
  const compareLegacySourceOrder = (a: TObject, b: TObject): number => compareLegacyObjectOrderStable(a, b);

  const insertLegacyCellTile = (
    gx: number,
    gy: number,
    tileId: number,
    bp06: number,
    source: RenderOverlaySource,
    debugLabel = ""
  ): void => {
    if (!inView(gx, gy)) {
      parity.spillOutOfBoundsCount += 1;
      return;
    }
    const list = overlayCells[cellIndex(gx, gy)];
    const isFloor = overlayTileIsFloor(tileId, tileFlags);
    const entry: RenderOverlayCell = {
      tileId: tileId & 0xffff,
      floor: isFloor,
      occluder: overlayTileIsOccluder(tileId, tileFlags, hasWallTerrain),
      sourceX: source.x,
      sourceY: source.y,
      sourceType: source.type,
      sourceObjType: source.objType,
      dbg: debugLabel
    };
    if (entry.floor || bp06 === 2) {
      if (bp06 & 1) {
        list.push(entry);
        return;
      }
      // Legacy ShowObject inserts floor/bp06==2 entries after non-floor chain.
      const idx = list.findIndex((e) => e.floor);
      if (idx === -1) {
        list.push(entry);
      } else {
        list.splice(idx, 0, entry);
      }
      return;
    }
    list.unshift(entry);
  };

  let overlayCount = 0;
  /* Legacy SearchArea scans one extra source column/row on right/bottom
     so left/up spill fragments from those anchors can land in-view. */
  const stream = (typeof objectLayer.objectsInWindowLegacyOrder === "function")
    ? objectLayer.objectsInWindowLegacyOrder(startX, startY, viewW + 1, viewH + 1, wz)
    : null;

  if (Array.isArray(stream)) {
    let prev: TObject | null = null;
    for (const o of stream) {
      if (!o || !o.renderable) {
        continue;
      }
      if (prev && compareLegacySourceOrder(prev, o) > 0) {
        parity.unsortedSourceCount += 1;
      }
      prev = o;
      const wx = o.x | 0;
      const wy = o.y | 0;
      // Legacy behavior: only process overlays from cells that are visible.
      // This prevents hidden-room wall decor from spilling into visible cells.
      if (visibleAtWorld && !visibleAtWorld(wx, wy)) {
        parity.hiddenSuppressedCount += 1;
        continue;
      }
      const gx = wx - startX;
      const gy = wy - startY;
      const animObjTile = resolveAnimatedObjectTile(o);
      if (animObjTile < 0) {
        continue;
      }
      if (typeof isBackgroundObjectTile === "function" && isBackgroundObjectTile(animObjTile, o)) {
        continue;
      }
      const footprintTile = resolveFootprintTile ? resolveFootprintTile(o) : animObjTile;
      insertLegacyCellTile(
        gx,
        gy,
        animObjTile,
        0,
        { x: wx, y: wy, type: "main", objType: o.type },
        `0x${animObjTile.toString(16)}`
      );

      const tf = tileFlags ? (tileFlags[footprintTile & 0x07ff] ?? 0) : 0;
      if (tf & 0x80) {
        insertLegacyCellTile(gx - 1, gy, footprintTile - 1, 1, { x: wx, y: wy, type: "spill-left", objType: o.type }, `0x${(footprintTile - 1).toString(16)}`);
        if (tf & 0x40) {
          insertLegacyCellTile(gx, gy - 1, footprintTile - 2, 1, { x: wx, y: wy, type: "spill-up", objType: o.type }, `0x${(footprintTile - 2).toString(16)}`);
          insertLegacyCellTile(gx - 1, gy - 1, footprintTile - 3, 1, { x: wx, y: wy, type: "spill-up-left", objType: o.type }, `0x${(footprintTile - 3).toString(16)}`);
        }
      } else if (tf & 0x40) {
        insertLegacyCellTile(gx, gy - 1, footprintTile - 1, 1, { x: wx, y: wy, type: "spill-up", objType: o.type }, `0x${(footprintTile - 1).toString(16)}`);
      }
      overlayCount += 1;
    }
  } else {
    for (let gy = 0; gy < viewH; gy += 1) {
      for (let gx = 0; gx < viewW; gx += 1) {
        const wx = startX + gx;
        const wy = startY + gy;
        const overlays = objectLayer.objectsAt(wx, wy, wz);
        let prev: TObject | null = null;
        for (const o of overlays) {
          if (!o.renderable) {
            continue;
          }
          // Legacy behavior: only process overlays from cells that are visible.
          // This prevents hidden-room wall decor from spilling into visible cells.
          if (visibleAtWorld && !visibleAtWorld(wx, wy)) {
            parity.hiddenSuppressedCount += 1;
            continue;
          }
          if (prev && compareLegacySourceOrder(prev, o) > 0) {
            parity.unsortedSourceCount += 1;
          }
          prev = o;
          const animObjTile = resolveAnimatedObjectTile(o);
          if (animObjTile < 0) {
            continue;
          }
          if (typeof isBackgroundObjectTile === "function" && isBackgroundObjectTile(animObjTile, o)) {
            continue;
          }
          const footprintTile = resolveFootprintTile ? resolveFootprintTile(o) : animObjTile;
          insertLegacyCellTile(
            gx,
            gy,
            animObjTile,
            0,
            { x: wx, y: wy, type: "main", objType: o.type },
            `0x${animObjTile.toString(16)}`
          );

          const tf = tileFlags ? (tileFlags[footprintTile & 0x07ff] ?? 0) : 0;
          if (tf & 0x80) {
            insertLegacyCellTile(gx - 1, gy, footprintTile - 1, 1, { x: wx, y: wy, type: "spill-left", objType: o.type }, `0x${(footprintTile - 1).toString(16)}`);
            if (tf & 0x40) {
              insertLegacyCellTile(gx, gy - 1, footprintTile - 2, 1, { x: wx, y: wy, type: "spill-up", objType: o.type }, `0x${(footprintTile - 2).toString(16)}`);
              insertLegacyCellTile(gx - 1, gy - 1, footprintTile - 3, 1, { x: wx, y: wy, type: "spill-up-left", objType: o.type }, `0x${(footprintTile - 3).toString(16)}`);
            }
          } else if (tf & 0x40) {
            insertLegacyCellTile(gx, gy - 1, footprintTile - 1, 1, { x: wx, y: wy, type: "spill-up", objType: o.type }, `0x${(footprintTile - 1).toString(16)}`);
          }
          overlayCount += 1;
        }
      }
    }
  }

  if (typeof injectLegacyOverlays === "function") {
    const addCount = injectLegacyOverlays({
      startX,
      startY,
      viewW,
      viewH,
      wz,
      viewCtx,
      stream,
      insertWorldTile(
        wx: number,
        wy: number,
        tileId: number,
        bp06 = 0,
        source: RenderOverlaySource | null = null,
        debugLabel = ""
      ): void {
        const src = source || { x: wx, y: wy, type: "legacy-special", objType: 0 };
        insertLegacyCellTile((wx | 0) - startX, (wy | 0) - startY, tileId, bp06, src, debugLabel);
      }
    });
    if (Number.isFinite(addCount) && addCount > 0) {
      overlayCount += Math.floor(addCount);
    }
  }

  return { overlayCells, overlayCount, parity };
}

export function topInteractiveOverlayAtModel(
  overlayCells: RenderOverlayGrid | null,
  viewW: number,
  viewH: number,
  startX: number,
  startY: number,
  wx: number,
  wy: number
): RenderOverlayCell | null {
  if (!overlayCells) {
    return null;
  }
  const gx = wx - startX;
  const gy = wy - startY;
  if (gx < 0 || gy < 0 || gx >= viewW || gy >= viewH) {
    return null;
  }
  const list = overlayCells[(gy * viewW) + gx];
  if (!list || list.length === 0) {
    return null;
  }
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const e = list[i];
    if (e.sourceX === wx && e.sourceY === wy && e.sourceType === "main") {
      return e;
    }
  }
  return null;
}

export function measureActorOcclusionParityModel(
  overlayCells: RenderOverlayGrid | null,
  viewW: number,
  viewH: number,
  startX: number,
  startY: number,
  viewCtx: RenderViewContext,
  entities: readonly ActorOcclusionEntity[] | null | undefined
): number {
  if (!overlayCells || !entities || entities.length === 0) {
    return 0;
  }
  const openAtWorld = viewCtx && typeof viewCtx.openAtWorld === "function"
    ? viewCtx.openAtWorld.bind(viewCtx)
    : null;
  const visibleAtWorld = viewCtx && typeof viewCtx.visibleAtWorld === "function"
    ? viewCtx.visibleAtWorld.bind(viewCtx)
    : null;

  let mismatches = 0;
  for (const e of entities) {
    if (visibleAtWorld && !visibleAtWorld(e.x, e.y)) {
      continue;
    }
    const gx = e.x - startX;
    const gy = e.y - startY;
    if (gx < 0 || gy < 0 || gx >= viewW || gy >= viewH) {
      continue;
    }
    const list = overlayCells[(gy * viewW) + gx];
    if (!list || list.length === 0) {
      continue;
    }
    const hasOccluder = list.some((entry: RenderOverlayCell) => entry.occluder);
    const cellOpen = !openAtWorld || openAtWorld(e.x, e.y);
    if (cellOpen && hasOccluder) {
      mismatches += 1;
    }
  }
  return mismatches;
}
