export function isTypingContextRuntime(target: EventTarget | null): boolean {
  if (!target) {
    return false;
  }
  const el = target instanceof Element ? target : null;
  if (!el) {
    return false;
  }
  const htmlEl = el as HTMLElement;
  if (htmlEl.isContentEditable) {
    return true;
  }
  const tag = el.tagName ? el.tagName.toLowerCase() : "";
  if (tag === "input" || tag === "textarea" || tag === "select") {
    return true;
  }
  return !!el.closest("input, textarea, select, [contenteditable=\"\"], [contenteditable=\"true\"]");
}

export type SurfaceBoundsRuntime = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export type SurfaceSizeRuntime = {
  height: number;
  width: number;
};

export type LogicalPointRuntime = {
  x: number;
  y: number;
};

export type NormalizedPointRuntime = {
  x: number;
  y: number;
};

export type CanvasMouseStatePatchRuntime = {
  mouseInCanvas: boolean;
  mouseNormX?: number;
  mouseNormY?: number;
};

export type CanvasMouseStateRuntime = {
  mouseInCanvas: boolean;
  mouseNormX: number;
  mouseNormY: number;
};

export type CanvasMouseEventRuntime = {
  clientX?: unknown;
  clientY?: unknown;
};

export type CanvasMouseSurfaceRuntime = {
  getBoundingClientRect(): SurfaceBoundsRuntime;
};

export type InputDiagRuntime = {
  diagClass: "diag ok" | "diag warn";
  diagText: string;
};

export type ActiveGameKeydownPlanRuntime =
  | { action: "return_to_title" }
  | { action: "hover_report_copy" }
  | { action: "legacy_conversation" }
  | { action: "target_cursor" }
  | { action: "move"; dx: number; dy: number }
  | { action: "pass_turn"; diag: InputDiagRuntime }
  | { action: "party_digit"; digitKey: string }
  | { action: "legacy_or_debug" };

export type PointerGestureRuntime = {
  button?: unknown;
  shiftKey?: boolean;
};

export type KeyboardShortcutRuntime = {
  altKey?: boolean;
  code?: unknown;
  ctrlKey?: boolean;
  key?: unknown;
  metaKey?: boolean;
  shiftKey?: boolean;
};

export function shouldSuppressShiftContextMenuRuntime(ev: PointerGestureRuntime): boolean {
  return !!ev.shiftKey;
}

export function isShiftRightClickCopyGestureRuntime(ev: PointerGestureRuntime): boolean {
  return !!ev.shiftKey && (Number(ev.button) | 0) === 2;
}

export function isHoverReportCopyKeyRuntime(ev: KeyboardShortcutRuntime): boolean {
  const k = String(ev.key || "").toLowerCase();
  return (k === "c" && !!ev.shiftKey && !!ev.ctrlKey && !ev.altKey && !ev.metaKey)
    || (String(ev.code || "") === "Backquote" && !!ev.shiftKey && !ev.ctrlKey && !ev.altKey && !ev.metaKey);
}

export function shouldLetBrowserHandleShortcutRuntime(ev: KeyboardShortcutRuntime): boolean {
  if (!((ev.ctrlKey || ev.metaKey) && !ev.altKey)) {
    return false;
  }
  return !isHoverReportCopyKeyRuntime(ev);
}

export function passTurnKeyRuntime(key: unknown): InputDiagRuntime | null {
  const k = String(key || "").toLowerCase();
  if (k !== " " && k !== "escape") {
    return null;
  }
  return {
    diagClass: "diag ok",
    diagText: "Pass turn."
  };
}

export function activeGameKeydownPlanRuntime(args: {
  code?: unknown;
  hoverReportCopy: boolean;
  key?: unknown;
  legacyConversationActive: boolean;
  moveDelta?: readonly [number, number] | null;
  useCursorActive: boolean;
}): ActiveGameKeydownPlanRuntime {
  const k = String(args.key || "").toLowerCase();
  if (k === "q") {
    return { action: "return_to_title" };
  }
  if (args.hoverReportCopy) {
    return { action: "hover_report_copy" };
  }
  if (args.legacyConversationActive) {
    return { action: "legacy_conversation" };
  }
  if (args.useCursorActive) {
    return { action: "target_cursor" };
  }
  if (args.moveDelta) {
    return { action: "move", dx: args.moveDelta[0], dy: args.moveDelta[1] };
  }
  const passTurnDiag = passTurnKeyRuntime(k);
  if (passTurnDiag) {
    return { action: "pass_turn", diag: passTurnDiag };
  }
  const code = String(args.code || "");
  if ((code.startsWith("Digit") || code.startsWith("Numpad")) && k >= "0" && k <= "9") {
    return { action: "party_digit", digitKey: k };
  }
  return { action: "legacy_or_debug" };
}

export function normalizedPointAtSurfaceRuntime(args: {
  clientX: unknown;
  clientY: unknown;
  bounds: SurfaceBoundsRuntime;
}): NormalizedPointRuntime | null {
  if (args.bounds.width <= 0 || args.bounds.height <= 0) {
    return null;
  }
  const nx = (Number(args.clientX) - args.bounds.left) / args.bounds.width;
  const ny = (Number(args.clientY) - args.bounds.top) / args.bounds.height;
  if (!Number.isFinite(nx) || !Number.isFinite(ny)) {
    return null;
  }
  return {
    x: Math.max(0, Math.min(1, nx)),
    y: Math.max(0, Math.min(1, ny))
  };
}

export function canvasMouseStatePatchRuntime(args: {
  clientX: unknown;
  clientY: unknown;
  bounds: SurfaceBoundsRuntime;
}): CanvasMouseStatePatchRuntime {
  const point = normalizedPointAtSurfaceRuntime(args);
  if (!point) {
    return { mouseInCanvas: false };
  }
  return {
    mouseInCanvas: true,
    mouseNormX: point.x,
    mouseNormY: point.y
  };
}

export function applyCanvasMouseStatePatchRuntime(
  state: CanvasMouseStateRuntime,
  patch: CanvasMouseStatePatchRuntime
): boolean {
  if (!patch.mouseInCanvas) {
    return false;
  }
  state.mouseNormX = patch.mouseNormX ?? state.mouseNormX;
  state.mouseNormY = patch.mouseNormY ?? state.mouseNormY;
  state.mouseInCanvas = true;
  return true;
}

export function clearCanvasMouseStateRuntime(state: CanvasMouseStateRuntime): void {
  state.mouseInCanvas = false;
}

export function applyCanvasMouseEventRuntime(args: {
  event: CanvasMouseEventRuntime;
  state: CanvasMouseStateRuntime;
  surface?: CanvasMouseSurfaceRuntime | null;
}): boolean {
  if (!args.surface) {
    return false;
  }
  const rect = args.surface.getBoundingClientRect();
  return applyCanvasMouseStatePatchRuntime(
    args.state,
    canvasMouseStatePatchRuntime({
      clientX: args.event.clientX,
      clientY: args.event.clientY,
      bounds: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      }
    })
  );
}

export function logicalPointAtSurfaceRuntime(args: {
  clientX: unknown;
  clientY: unknown;
  bounds: SurfaceBoundsRuntime;
  surfaceSize: SurfaceSizeRuntime;
  logicalSize: SurfaceSizeRuntime;
}): LogicalPointRuntime | null {
  if (args.bounds.width <= 0 || args.bounds.height <= 0) {
    return null;
  }
  if (args.surfaceSize.width <= 0 || args.surfaceSize.height <= 0) {
    return null;
  }
  if (args.logicalSize.width <= 0 || args.logicalSize.height <= 0) {
    return null;
  }
  const sx = ((Number(args.clientX) - args.bounds.left) * args.surfaceSize.width) / args.bounds.width;
  const sy = ((Number(args.clientY) - args.bounds.top) * args.surfaceSize.height) / args.bounds.height;
  return {
    x: Math.floor((sx / args.surfaceSize.width) * args.logicalSize.width),
    y: Math.floor((sy / args.surfaceSize.height) * args.logicalSize.height)
  };
}

export function logicalPointInBoundsRuntime(
  point: LogicalPointRuntime | null | undefined,
  logicalSize: SurfaceSizeRuntime
): point is LogicalPointRuntime {
  if (!point) {
    return false;
  }
  return point.x >= 0
    && point.y >= 0
    && point.x < logicalSize.width
    && point.y < logicalSize.height;
}
