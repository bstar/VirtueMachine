export type HoverReportOverlayRuntime = {
  floor?: unknown;
  occluder?: unknown;
  sourceType?: unknown;
  sourceX?: unknown;
  sourceY?: unknown;
  tileId?: unknown;
};

export type HoverReportObjectRuntime = {
  assocChild0010Count?: unknown;
  assocChildCount?: unknown;
  frame?: unknown;
  legacyOrder?: unknown;
  order?: unknown;
  tileFlags?: unknown;
  tileId?: unknown;
  type?: unknown;
};

export type HoverReportCellRuntime = {
  animTile: unknown;
  objects: readonly HoverReportObjectRuntime[];
  open: unknown;
  overlays: readonly HoverReportOverlayRuntime[];
  rawTile: unknown;
  terrain: unknown;
  tileFlag: unknown;
  visible: unknown;
  wx: unknown;
  wy: unknown;
  wz: unknown;
};

export type HoveredWorldCellRuntime = {
  gx: number;
  gy: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  z: number;
};

export type HoverLegacyMapRectRuntime = {
  h: number;
  w: number;
  x: number;
  y: number;
};

export function fallbackCenterHoveredWorldCellRuntime(args: {
  mapReady?: unknown;
  sessionStarted?: unknown;
  viewH: unknown;
  viewW: unknown;
  worldX: unknown;
  worldY: unknown;
  worldZ: unknown;
}): HoveredWorldCellRuntime | null {
  if (!args.sessionStarted || !args.mapReady) {
    return null;
  }
  const viewW = Math.max(1, Number(args.viewW) | 0);
  const viewH = Math.max(1, Number(args.viewH) | 0);
  const gx = viewW >> 1;
  const gy = viewH >> 1;
  const worldX = Number(args.worldX) | 0;
  const worldY = Number(args.worldY) | 0;
  const startX = worldX - gx;
  const startY = worldY - gy;
  return {
    gx,
    gy,
    startX,
    startY,
    x: worldX,
    y: worldY,
    z: Number(args.worldZ) | 0
  };
}

export function hoveredOrFallbackWorldCellRuntime(args: Parameters<typeof hoveredWorldCellRuntime>[0]): HoveredWorldCellRuntime | null {
  return hoveredWorldCellRuntime(args) ?? fallbackCenterHoveredWorldCellRuntime(args);
}

function clampIndexRuntime(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value | 0));
}

export function hoveredWorldCellRuntime(args: {
  canvasHeight?: unknown;
  canvasWidth?: unknown;
  legacyFramePreview?: unknown;
  legacyMapRect?: HoverLegacyMapRectRuntime | null;
  legacySurfaceHeight?: unknown;
  legacySurfaceWidth?: unknown;
  mapReady?: unknown;
  mouseInCanvas?: unknown;
  mouseNormX?: unknown;
  mouseNormY?: unknown;
  sessionStarted?: unknown;
  viewH: unknown;
  viewW: unknown;
  worldX: unknown;
  worldY: unknown;
  worldZ: unknown;
}): HoveredWorldCellRuntime | null {
  if (!args.sessionStarted || !args.mouseInCanvas || !args.mapReady) {
    return null;
  }
  const viewW = Math.max(1, Number(args.viewW) | 0);
  const viewH = Math.max(1, Number(args.viewH) | 0);
  const startX = (Number(args.worldX) | 0) - (viewW >> 1);
  const startY = (Number(args.worldY) | 0) - (viewH >> 1);
  const z = Number(args.worldZ) | 0;
  const mxNorm = Math.max(0, Math.min(1, Number(args.mouseNormX) || 0));
  const myNorm = Math.max(0, Math.min(1, Number(args.mouseNormY) || 0));

  if (args.legacyFramePreview && args.legacyMapRect) {
    const bw = Number(args.legacySurfaceWidth) | 0;
    const bh = Number(args.legacySurfaceHeight) | 0;
    if (bw <= 0 || bh <= 0) {
      return null;
    }
    const mx = Math.floor(mxNorm * bw);
    const my = Math.floor(myNorm * bh);
    const scale = Math.max(1, Math.floor(bw / 320));
    const mapX = (Number(args.legacyMapRect.x) | 0) * scale;
    const mapY = (Number(args.legacyMapRect.y) | 0) * scale;
    const mapW = (Number(args.legacyMapRect.w) | 0) * scale;
    const mapH = (Number(args.legacyMapRect.h) | 0) * scale;
    if (mx < mapX || mx >= (mapX + mapW) || my < mapY || my >= (mapY + mapH)) {
      return null;
    }
    const lx = (mx - mapX) / scale;
    const ly = (my - mapY) / scale;
    const gx = clampIndexRuntime(Math.floor((lx / Math.max(1, args.legacyMapRect.w)) * viewW), 0, viewW - 1);
    const gy = clampIndexRuntime(Math.floor((ly / Math.max(1, args.legacyMapRect.h)) * viewH), 0, viewH - 1);
    return { x: startX + gx, y: startY + gy, z, gx, gy, startX, startY };
  }

  const w = Number(args.canvasWidth) | 0;
  const h = Number(args.canvasHeight) | 0;
  if (w <= 0 || h <= 0) {
    return null;
  }
  const mx = Math.floor(mxNorm * w);
  const my = Math.floor(myNorm * h);
  const gx = clampIndexRuntime(Math.floor((mx / w) * viewW), 0, viewW - 1);
  const gy = clampIndexRuntime(Math.floor((my / h) * viewH), 0, viewH - 1);
  return { x: startX + gx, y: startY + gy, z, gx, gy, startX, startY };
}

export function hexRuntime(value: unknown, width = 0): string {
  const n = Number(value) >>> 0;
  const s = n.toString(16);
  return `0x${width > 0 ? s.padStart(width, "0") : s}`;
}

export function hoverReportUnavailableTextRuntime(): string {
  return "Hover report unavailable. Move cursor over the world view.";
}

export function copiedHoverReportTextRuntime(report: unknown): string {
  const line = String(report || "").split("\n")[1] || "";
  return `Copied hover report (${line.replace(/^cell:\s*/, "")}).`;
}

export function failedHoverReportTextRuntime(reason = ""): string {
  return `Failed to copy hover report to clipboard${reason ? ` (${reason})` : ""}.`;
}

export type HoverReportCopyResultRuntime = {
  clearCopyError: boolean;
  copyStatusDetail: string;
  copyStatusOk: boolean;
  diagClass: "diag ok" | "diag warn";
  diagText: string;
};

export function hoverReportUnavailableResultRuntime(): HoverReportCopyResultRuntime {
  return {
    clearCopyError: false,
    copyStatusDetail: "no hover cell",
    copyStatusOk: false,
    diagClass: "diag warn",
    diagText: hoverReportUnavailableTextRuntime()
  };
}

export function sanitizeHoverReportCopyFailureReasonRuntime(reason: unknown): string {
  return String(reason || "").replace(/^\s*\(|\)\s*$/g, "");
}

export function hoverReportCopyResultRuntime(args: {
  ok: unknown;
  reason?: unknown;
  report?: unknown;
}): HoverReportCopyResultRuntime {
  if (args.ok) {
    return {
      clearCopyError: true,
      copyStatusDetail: "",
      copyStatusOk: true,
      diagClass: "diag ok",
      diagText: copiedHoverReportTextRuntime(args.report)
    };
  }
  const reason = sanitizeHoverReportCopyFailureReasonRuntime(args.reason);
  return {
    clearCopyError: false,
    copyStatusDetail: reason,
    copyStatusOk: false,
    diagClass: "diag warn",
    diagText: failedHoverReportTextRuntime(reason)
  };
}

export function applyHoverReportCopyResultRuntime(
  result: HoverReportCopyResultRuntime,
  diagBox?: Pick<HTMLElement, "className" | "dataset" | "textContent"> | null
): HoverReportCopyResultRuntime {
  if (diagBox) {
    if (result.clearCopyError && diagBox.dataset) {
      delete diagBox.dataset.copyError;
    }
    diagBox.className = result.diagClass;
    diagBox.textContent = result.diagText;
  }
  return result;
}

export function buildHoverReportTextRuntime(args: HoverReportCellRuntime): string {
  const wx = Number(args.wx) | 0;
  const wy = Number(args.wy) | 0;
  const wz = Number(args.wz) | 0;
  const overlays = args.overlays.map((o, idx) => (
    `overlay[${idx}]: tile=${hexRuntime(o.tileId)} floor=${o.floor ? 1 : 0} occ=${o.occluder ? 1 : 0} src=${Number(o.sourceX) | 0},${Number(o.sourceY) | 0} ${String(o.sourceType || "")}`
  ));
  const objLines = args.objects.map((o, idx) => (
    `obj[${idx}]: type=${hexRuntime(o.type)} frame=${Number(o.frame) | 0} tile=${hexRuntime(o.tileId)} tf=${hexRuntime(o.tileFlags)} order=${Number(o.order) | 0} lord=${Number(o.legacyOrder || 0) | 0} achild=${Number(o.assocChildCount || 0) | 0} a0010=${Number(o.assocChild0010Count || 0) | 0}`
  ));
  const lines = [
    "VirtueMachine Hover Report",
    `cell: ${wx},${wy},${wz}`,
    `map: raw=${hexRuntime(args.rawTile)} anim=${hexRuntime(args.animTile)} tf=${hexRuntime(args.tileFlag)} terrain=${hexRuntime(args.terrain)}`,
    `visibility: visible=${Number(args.visible) | 0} open=${Number(args.open) | 0}`
  ];
  lines.push(...(overlays.length ? overlays : ["overlay: none"]));
  lines.push(...(objLines.length ? objLines : ["objects@cell: none"]));
  return lines.join("\n");
}

export function serverWorldObjectFootprintTextRuntime(footprint: unknown): string {
  return Array.isArray(footprint)
    ? footprint.map((c: { x?: unknown; y?: unknown; z?: unknown }) => `${Number(c.x) | 0},${Number(c.y) | 0},${Number(c.z) | 0}`).join(" ")
    : "";
}

export function serverWorldObjectHoverLineRuntime(o: {
  assoc_chain?: unknown;
  assoc_child_0010_count?: unknown;
  assoc_child_count?: unknown;
  blocked_by?: unknown;
  footprint?: unknown;
  frame?: unknown;
  holder_id?: unknown;
  holder_key?: unknown;
  holder_kind?: unknown;
  legacy_order?: unknown;
  object_key?: unknown;
  root_anchor_key?: unknown;
  source_area?: unknown;
  source_index?: unknown;
  source_kind?: unknown;
  status?: unknown;
  tile_id?: unknown;
  type?: unknown;
  x?: unknown;
  y?: unknown;
  z?: unknown;
}, idx: number): string {
  const status = Number(o.status) | 0;
  const fp = serverWorldObjectFootprintTextRuntime(o.footprint);
  return `server_obj[${idx}]: key=${String(o.object_key || "")} type=${hexRuntime(o.type)} frame=${Number(o.frame) | 0} tile=${hexRuntime(o.tile_id)} xyz=${Number(o.x) | 0},${Number(o.y) | 0},${Number(o.z) | 0} src=${String(o.source_kind || "baseline")} status=${hexRuntime(status)} cu=${hexRuntime(status & 0x18)} hk=${String(o.holder_kind || "none")} hid=${String(o.holder_id || "")} hkey=${String(o.holder_key || "")} root=${String(o.root_anchor_key || "")} blocked=${String(o.blocked_by || "")} chain=${Array.isArray(o.assoc_chain) ? o.assoc_chain.join(">") : ""} area=${Number(o.source_area) | 0} idx=${Number(o.source_index) | 0} lord=${Number(o.legacy_order || 0) | 0} achild=${Number(o.assoc_child_count || 0) | 0} a0010=${Number(o.assoc_child_0010_count || 0) | 0}${fp ? ` fp=${fp}` : ""}`;
}

export function serverWorldObjectsHoverTextRuntime(objects: readonly unknown[]): string {
  const rows = ["server_objects:"];
  if (!objects.length) {
    rows.push("server_obj: none");
  } else {
    for (let i = 0; i < objects.length; i += 1) {
      rows.push(serverWorldObjectHoverLineRuntime(objects[i] as Parameters<typeof serverWorldObjectHoverLineRuntime>[0], i));
    }
  }
  return rows.join("\n");
}
