export type CursorShapeRuntime = {
  height: number;
  hotX?: number | null;
  hotY?: number | null;
  width: number;
};

export type CursorDrawRectRuntime = {
  drawH: number;
  drawW: number;
  hotX: number;
  hotY: number;
  mouseX: number;
  mouseY: number;
  px: number;
  py: number;
  scale: number;
  scaleX: number;
  scaleY: number;
};

export type CursorCycleRuntime = {
  diagClass: "diag ok";
  diagText: string;
  index: number;
};

export type CursorShapeSelectionRuntime<T extends CursorShapeRuntime> = {
  index: number;
  shape: T;
};

export type LegacyCursorLayerTargetRuntime =
  | {
    kind: "backdrop";
    logicalW: 320;
    mouseX: number;
    mouseY: number;
  }
  | {
    kind: "viewport";
    logicalW: 160;
    mouseX: number;
    mouseY: number;
  };

export type LegacySelectCellMarkerPlanRuntime = {
  fallbackStroke: {
    h: number;
    lineWidth: number;
    strokeStyle: string;
    w: number;
    x: number;
    y: number;
  };
  tile: {
    h: number;
    tileId: number;
    w: number;
    x: number;
    y: number;
  } | null;
};

export function cursorShapeSelectionRuntime<T extends CursorShapeRuntime>(args: {
  cursorIndex: unknown;
  cursorPixmaps: readonly T[] | null | undefined;
  mouseInCanvas: boolean;
  targetCursorIndex: unknown;
  useCursorActive: boolean;
}): CursorShapeSelectionRuntime<T> | null {
  const cursorPixmaps = args.cursorPixmaps;
  if (!args.mouseInCanvas || !cursorPixmaps || cursorPixmaps.length <= 0) {
    return null;
  }
  const fallbackIndex = Number(args.cursorIndex) | 0;
  const requestedIndex = args.useCursorActive ? (Number(args.targetCursorIndex) | 0) : fallbackIndex;
  const shape = cursorPixmaps[requestedIndex] || cursorPixmaps[fallbackIndex] || cursorPixmaps[0];
  if (!shape) {
    return null;
  }
  return {
    index: cursorPixmaps[requestedIndex] ? requestedIndex : cursorPixmaps[fallbackIndex] ? fallbackIndex : 0,
    shape
  };
}

export function legacySelectCellMarkerPlanRuntime(args: {
  px: unknown;
  py: unknown;
  selectorTileId: unknown;
  size: unknown;
}): LegacySelectCellMarkerPlanRuntime {
  const px = Number(args.px) | 0;
  const py = Number(args.py) | 0;
  const size = Math.max(0, Number(args.size) | 0);
  const selectorTileId = Number(args.selectorTileId);
  return {
    fallbackStroke: {
      h: Math.max(0, size - 4),
      lineWidth: 2,
      strokeStyle: "#f6d365",
      w: Math.max(0, size - 4),
      x: px + 2,
      y: py + 2
    },
    tile: Number.isFinite(selectorTileId)
      ? {
        h: size,
        tileId: selectorTileId & 0xffff,
        w: size,
        x: px,
        y: py
      }
      : null
  };
}

export function cursorCycleRuntime(args: {
  count: unknown;
  currentIndex: unknown;
  delta: unknown;
}): CursorCycleRuntime | null {
  const count = Number(args.count) | 0;
  if (count <= 0) {
    return null;
  }
  let index = ((Number(args.currentIndex) | 0) + (Number(args.delta) | 0)) % count;
  if (index < 0) {
    index += count;
  }
  return {
    diagClass: "diag ok",
    diagText: `Cursor ${index + 1}/${count}`,
    index
  };
}

export function cursorLogicalWidthRuntime(args: {
  isLegacyFramePreview: boolean;
  sessionStarted: boolean;
  viewWidthTiles: number;
}): number {
  if (!args.sessionStarted) {
    return 320;
  }
  return args.isLegacyFramePreview ? 320 : ((Number(args.viewWidthTiles) | 0) * 16);
}

export function cursorDrawRectRuntime(args: {
  aspectX?: number;
  aspectY?: number;
  logicalW: number;
  mouseNormX?: number;
  mouseNormY?: number;
  mouseX?: number;
  mouseY?: number;
  shape: CursorShapeRuntime | null | undefined;
  targetH: number;
  targetW: number;
}): CursorDrawRectRuntime | null {
  const shape = args.shape;
  const targetW = Number(args.targetW) | 0;
  const targetH = Number(args.targetH) | 0;
  if (!shape || targetW <= 0 || targetH <= 0 || (shape.width | 0) <= 0 || (shape.height | 0) <= 0) {
    return null;
  }
  const logicalW = Number.isFinite(args.logicalW) && args.logicalW > 0 ? Number(args.logicalW) : 320;
  const scale = Math.max(1, Math.floor(targetW / Math.max(1, logicalW)));
  const scaleX = scale * (Number.isFinite(args.aspectX) ? Number(args.aspectX) : 1);
  const scaleY = scale * (Number.isFinite(args.aspectY) ? Number(args.aspectY) : 1);
  const hotX = Math.min(
    (shape.width | 0) - 1,
    Math.max(0, Number(shape.hotX ?? Math.floor((shape.width | 0) * 0.5)) | 0)
  );
  const hotY = Math.min(
    (shape.height | 0) - 1,
    Math.max(0, Number(shape.hotY ?? Math.floor((shape.height | 0) * 0.5)) | 0)
  );
  const mouseX = Number.isFinite(args.mouseX)
    ? Math.floor(Number(args.mouseX))
    : Math.floor(Number(args.mouseNormX || 0) * targetW);
  const mouseY = Number.isFinite(args.mouseY)
    ? Math.floor(Number(args.mouseY))
    : Math.floor(Number(args.mouseNormY || 0) * targetH);
  const drawW = Math.max(1, Math.round((shape.width | 0) * scaleX));
  const drawH = Math.max(1, Math.round((shape.height | 0) * scaleY));
  let px = mouseX - Math.round(hotX * scaleX);
  let py = mouseY - Math.round(hotY * scaleY);
  px = Math.max(0, Math.min(targetW - drawW, px));
  py = Math.max(0, Math.min(targetH - drawH, py));
  return {
    drawH,
    drawW,
    hotX,
    hotY,
    mouseX,
    mouseY,
    px,
    py,
    scale,
    scaleX,
    scaleY
  };
}

export function legacyCursorLayerTargetRuntime(args: {
  backdropH: unknown;
  backdropW: unknown;
  hasViewport: boolean;
  mapRect: { h: unknown; w: unknown; x: unknown; y: unknown };
  mouseNormX: unknown;
  mouseNormY: unknown;
  sessionStarted: boolean;
}): LegacyCursorLayerTargetRuntime | null {
  const backdropW = Number(args.backdropW) | 0;
  const backdropH = Number(args.backdropH) | 0;
  if (backdropW <= 0 || backdropH <= 0) {
    return null;
  }
  const mouseX = Math.floor(Number(args.mouseNormX || 0) * backdropW);
  const mouseY = Math.floor(Number(args.mouseNormY || 0) * backdropH);
  if (args.sessionStarted && args.hasViewport) {
    const scale = Math.max(1, Math.floor(backdropW / 320));
    const mapX = (Number(args.mapRect.x) | 0) * scale;
    const mapY = (Number(args.mapRect.y) | 0) * scale;
    const mapW = (Number(args.mapRect.w) | 0) * scale;
    const mapH = (Number(args.mapRect.h) | 0) * scale;
    const overMap = mouseX >= mapX && mouseX < (mapX + mapW) && mouseY >= mapY && mouseY < (mapY + mapH);
    if (overMap) {
      return {
        kind: "viewport",
        logicalW: 160,
        mouseX: (mouseX - mapX) / scale,
        mouseY: (mouseY - mapY) / scale
      };
    }
  }
  return {
    kind: "backdrop",
    logicalW: 320,
    mouseX,
    mouseY
  };
}
