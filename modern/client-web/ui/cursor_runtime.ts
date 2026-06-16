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
