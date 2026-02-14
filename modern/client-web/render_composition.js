export function isLegacyPixelTransparent(mask, tileId, palIdx) {
  const zeroIsTransparent = tileId <= 0x01ff;
  if (mask === 10 || mask === 5) {
    return palIdx === 0xff || (zeroIsTransparent && palIdx === 0x00);
  }
  return false;
}

function overlayTileIsFloor(tileId, tileFlags) {
  if (!tileFlags) {
    return false;
  }
  return (tileFlags[tileId & 0x07ff] & 0x10) !== 0;
}

function overlayTileIsOccluder(tileId, tileFlags, hasWallTerrain) {
  if (!tileFlags) {
    return false;
  }
  const tf = tileFlags[tileId & 0x07ff] ?? 0;
  if ((tf & 0x04) !== 0 || (tf & 0x08) !== 0) {
    return true;
  }
  return Boolean(hasWallTerrain && hasWallTerrain(tileId));
}

export function buildOverlayCellsModel(opts) {
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

  const overlayCells = Array.from({ length: viewW * viewH }, () => []);
  const parity = {
    hiddenSuppressedCount: 0,
    spillOutOfBoundsCount: 0,
    unsortedSourceCount: 0
  };
  const cellIndex = (gx, gy) => (gy * viewW) + gx;
  const inView = (gx, gy) => gx >= 0 && gy >= 0 && gx < viewW && gy < viewH;
  const visibleAtWorld = viewCtx && typeof viewCtx.visibleAtWorld === "function"
    ? viewCtx.visibleAtWorld.bind(viewCtx)
    : null;
  const compareLegacySourceOrder = (a, b) => {
    if ((a.y | 0) !== (b.y | 0)) {
      return (a.y | 0) - (b.y | 0);
    }
    if ((a.x | 0) !== (b.x | 0)) {
      return (a.x | 0) - (b.x | 0);
    }
    if ((a.z | 0) !== (b.z | 0)) {
      return (b.z | 0) - (a.z | 0);
    }
    return 0;
  };

  const insertLegacyCellTile = (gx, gy, tileId, bp06, source, debugLabel = "") => {
    if (!inView(gx, gy)) {
      parity.spillOutOfBoundsCount += 1;
      return;
    }
    const list = overlayCells[cellIndex(gx, gy)];
    const isFloor = overlayTileIsFloor(tileId, tileFlags);
    const entry = {
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
  const stream = (typeof objectLayer.objectsInWindowLegacyOrder === "function")
    ? objectLayer.objectsInWindowLegacyOrder(startX, startY, viewW, viewH, wz)
    : null;

  if (Array.isArray(stream)) {
    let prev = null;
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
        let prev = null;
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
      insertWorldTile(wx, wy, tileId, bp06 = 0, source = null, debugLabel = "") {
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

export function topInteractiveOverlayAtModel(overlayCells, viewW, viewH, startX, startY, wx, wy) {
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

export function measureActorOcclusionParityModel(overlayCells, viewW, viewH, startX, startY, viewCtx, entities) {
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
    const hasOccluder = list.some((entry) => entry.occluder);
    const cellOpen = !openAtWorld || openAtWorld(e.x, e.y);
    if (cellOpen && hasOccluder) {
      mismatches += 1;
    }
  }
  return mismatches;
}
