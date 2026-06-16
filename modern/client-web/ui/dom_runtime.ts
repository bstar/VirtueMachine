export type DomRuntimeDocument = {
  getElementById(id: string): HTMLElement | null;
};

export type Canvas2DContextSourceRuntime = {
  getContext(contextId: "2d"): CanvasRenderingContext2D | null;
};

export type LegacyFrameLayoutRectRuntime = {
  h: number;
  w: number;
  x: number;
  y: number;
};

export type LegacyFrameLayoutModelRuntime = {
  mapRect: LegacyFrameLayoutRectRuntime;
  outH: number;
  outW: number;
  scale: number;
};

export function requiredElementRuntime<TElement extends HTMLElement = HTMLElement>(
  documentRef: DomRuntimeDocument,
  id: string
): TElement {
  const element = documentRef.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element #${id}`);
  }
  return element as TElement;
}

export function canvas2dContextRuntime(
  canvasElement: Canvas2DContextSourceRuntime,
  label: string
): CanvasRenderingContext2D {
  const context = canvasElement.getContext("2d");
  if (!context) {
    throw new Error(`${label} 2D context is unavailable`);
  }
  return context;
}

export function legacyFrameLayoutModelRuntime(args: {
  hostH: unknown;
  hostW: unknown;
  legacyScaleMode: unknown;
  mapRect: LegacyFrameLayoutRectRuntime;
  srcH: unknown;
  srcW: unknown;
}): LegacyFrameLayoutModelRuntime {
  const srcW = Math.max(1, Number(args.srcW) | 0);
  const srcH = Math.max(1, Number(args.srcH) | 0);
  const hostW = Number(args.hostW) || srcW;
  const hostH = Number(args.hostH) || srcH;
  const fitScaleX = Math.floor(hostW / srcW);
  const fitScaleY = Math.floor(hostH / srcH);
  const fitScale = Math.max(1, Math.min(fitScaleX, fitScaleY));
  let scale = fitScale;
  if (String(args.legacyScaleMode || "") !== "fit") {
    const fixed = Number.parseInt(String(args.legacyScaleMode || ""), 10);
    if (Number.isFinite(fixed) && fixed >= 1) {
      scale = fixed;
    }
  }
  return {
    mapRect: {
      h: (Number(args.mapRect.h) | 0) * scale,
      w: (Number(args.mapRect.w) | 0) * scale,
      x: (Number(args.mapRect.x) | 0) * scale,
      y: (Number(args.mapRect.y) | 0) * scale
    },
    outH: Math.max(1, Math.round(srcH * scale)),
    outW: Math.max(1, Math.round(srcW * scale)),
    scale
  };
}
