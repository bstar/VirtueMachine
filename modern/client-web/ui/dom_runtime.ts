export type DomRuntimeDocument = {
  getElementById(id: string): HTMLElement | null;
};

export type Canvas2DContextSourceRuntime = {
  getContext(contextId: "2d"): CanvasRenderingContext2D | null;
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
