export type ParitySnapshotCellRuntime = {
  map: unknown;
  objects: unknown[];
  overlay: unknown[];
  visibility: unknown;
  x: number;
  y: number;
  z: number;
};

export type ParitySnapshotRuntime = {
  bounds: {
    x0: number;
    x1: number;
    y0: number;
    y1: number;
    z: number;
  };
  capturedAt: string;
  cells: ParitySnapshotCellRuntime[];
  center: {
    x: number;
    y: number;
    z: number;
  };
  kind: "VirtueMachineRoomParitySnapshot";
  parity: {
    hiddenSuppressedCount: number;
    overlayCount: number;
    spillOutOfBoundsCount: number;
    unsortedSourceCount: number;
  };
  radius: number;
  tick: number;
};

export type ParitySnapshotOverlayRuntime = {
  floor?: unknown;
  occluder?: unknown;
  sourceObjType?: unknown;
  sourceType?: unknown;
  sourceX?: unknown;
  sourceY?: unknown;
  tileId?: unknown;
};

export type ParitySnapshotObjectRuntime = {
  frame?: unknown;
  order?: unknown;
  type?: unknown;
};

export type ParitySnapshotViewContextRuntime = {
  openAtWorld?: (x: number, y: number) => boolean;
  visibleAtWorld?: (x: number, y: number) => boolean;
} | null | undefined;

export function paritySnapshotWindowRuntime(args: {
  centerX: unknown;
  centerY: unknown;
  radius: unknown;
}): {
  startX: number;
  startY: number;
  viewH: number;
  viewW: number;
} {
  const radius = clampParityRadiusRuntime(args.radius);
  const cx = Number(args.centerX) | 0;
  const cy = Number(args.centerY) | 0;
  const viewW = (radius * 2) + 1;
  const viewH = viewW;
  return {
    startX: cx - radius,
    startY: cy - radius,
    viewW,
    viewH
  };
}

export function hexU16Runtime(value: unknown): string {
  return `0x${((Number(value) | 0) & 0xffff).toString(16).padStart(4, "0")}`;
}

export function buildParitySnapshotCellsRuntime<TObject extends ParitySnapshotObjectRuntime>(args: {
  animatedTileAt(rawTile: number, wx: number, wy: number, z: number): number;
  overlayCells?: readonly (readonly ParitySnapshotOverlayRuntime[] | undefined)[] | null;
  objectsAt?: ((x: number, y: number, z: number) => readonly TObject[]) | null;
  resolveObjectTile?: ((obj: TObject, wx: number, wy: number, z: number) => number) | null;
  startX: unknown;
  startY: unknown;
  terrainType?: ArrayLike<number> | null;
  tileAt(x: number, y: number, z: number): number;
  tileFlags?: ArrayLike<number> | null;
  viewCtx?: ParitySnapshotViewContextRuntime;
  viewH: unknown;
  viewW: unknown;
  z: unknown;
}): ParitySnapshotCellRuntime[] {
  const viewW = Math.max(0, Number(args.viewW) | 0);
  const viewH = Math.max(0, Number(args.viewH) | 0);
  const startX = Number(args.startX) | 0;
  const startY = Number(args.startY) | 0;
  const z = Number(args.z) | 0;
  const cells: ParitySnapshotCellRuntime[] = [];

  for (let gy = 0; gy < viewH; gy += 1) {
    for (let gx = 0; gx < viewW; gx += 1) {
      const wx = startX + gx;
      const wy = startY + gy;
      const rawTile = args.tileAt(wx, wy, z) & 0xffff;
      const animTile = args.animatedTileAt(rawTile, wx, wy, z) & 0xffff;
      const tileFlag = args.tileFlags ? (args.tileFlags[rawTile & 0x07ff] ?? 0) : 0;
      const terrain = args.terrainType ? (args.terrainType[rawTile & 0x07ff] ?? 0) : 0;
      const overlays = (args.overlayCells?.[(gy * viewW) + gx] || []).map((o, idx) => ({
        idx,
        tileHex: hexU16Runtime(o.tileId),
        floor: o.floor ? 1 : 0,
        occluder: o.occluder ? 1 : 0,
        sourceX: Number(o.sourceX) | 0,
        sourceY: Number(o.sourceY) | 0,
        sourceType: String(o.sourceType || "main"),
        sourceObjTypeHex: hexU16Runtime(o.sourceObjType ?? 0)
      }));
      const objects = args.objectsAt
        ? args.objectsAt(wx, wy, z).map((o, idx) => {
          const tileId = args.resolveObjectTile ? (args.resolveObjectTile(o, wx, wy, z) & 0xffff) : 0;
          const tf = args.tileFlags ? (args.tileFlags[tileId & 0x07ff] ?? 0) : 0;
          return {
            idx,
            typeHex: hexU16Runtime(o.type),
            frame: Number(o.frame) | 0,
            tileHex: hexU16Runtime(tileId),
            tileFlagsHex: hexU16Runtime(tf),
            order: Number(o.order) | 0
          };
        })
        : [];
      cells.push({
        x: wx,
        y: wy,
        z,
        map: {
          rawHex: hexU16Runtime(rawTile),
          animHex: hexU16Runtime(animTile),
          tileFlagsHex: hexU16Runtime(tileFlag),
          terrainHex: hexU16Runtime(terrain)
        },
        visibility: {
          visible: args.viewCtx ? (args.viewCtx.visibleAtWorld?.(wx, wy) ? 1 : 0) : 1,
          open: args.viewCtx ? (args.viewCtx.openAtWorld?.(wx, wy) ? 1 : 0) : 0
        },
        overlay: overlays,
        objects
      });
    }
  }

  return cells;
}

export function clampParityRadiusRuntime(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return 12;
  }
  return Math.max(1, Math.min(32, Math.floor(n)));
}

export function paritySnapshotCopiedTextRuntime(args: {
  x: number;
  y: number;
  z: number;
  radius: number;
}): string {
  return `Copied parity snapshot to clipboard (center=${Number(args.x) | 0},${Number(args.y) | 0},${Number(args.z) | 0} radius=${Number(args.radius) | 0}).`;
}

export function paritySnapshotCopyFailedTextRuntime(): string {
  return "Failed to copy parity snapshot to clipboard.";
}

export type ParitySnapshotCopyResultRuntime = {
  copyStatusDetail: string;
  copyStatusOk: boolean;
  diagClass: "diag ok" | "diag warn";
  diagText: string;
};

export function paritySnapshotCopyResultRuntime(args: {
  copied: unknown;
  radius: unknown;
  x: unknown;
  y: unknown;
  z: unknown;
}): ParitySnapshotCopyResultRuntime {
  if (args.copied) {
    return {
      copyStatusDetail: "",
      copyStatusOk: true,
      diagClass: "diag ok",
      diagText: paritySnapshotCopiedTextRuntime({
        x: Number(args.x) | 0,
        y: Number(args.y) | 0,
        z: Number(args.z) | 0,
        radius: Number(args.radius) | 0
      })
    };
  }
  return {
    copyStatusDetail: "parity snapshot copy failed",
    copyStatusOk: false,
    diagClass: "diag warn",
    diagText: paritySnapshotCopyFailedTextRuntime()
  };
}

export function paritySnapshotUnavailableDiagRuntime(): {
  diagClass: "diag warn";
  diagText: "Parity snapshot unavailable: session not started.";
} {
  return {
    diagClass: "diag warn",
    diagText: "Parity snapshot unavailable: session not started."
  };
}

export function buildParitySnapshotRuntime(args: {
  capturedAt: string;
  cells: ParitySnapshotCellRuntime[];
  centerX: number;
  centerY: number;
  centerZ: number;
  hiddenSuppressedCount?: unknown;
  overlayCount?: unknown;
  radius: number;
  spillOutOfBoundsCount?: unknown;
  tick: number;
  unsortedSourceCount?: unknown;
}): ParitySnapshotRuntime {
  const radius = clampParityRadiusRuntime(args.radius);
  const cx = Number(args.centerX) | 0;
  const cy = Number(args.centerY) | 0;
  const cz = Number(args.centerZ) | 0;
  return {
    kind: "VirtueMachineRoomParitySnapshot",
    capturedAt: String(args.capturedAt || ""),
    tick: Number(args.tick) >>> 0,
    center: { x: cx, y: cy, z: cz },
    radius,
    bounds: {
      x0: cx - radius,
      y0: cy - radius,
      x1: cx + radius,
      y1: cy + radius,
      z: cz
    },
    parity: {
      overlayCount: Number(args.overlayCount) | 0,
      hiddenSuppressedCount: Number(args.hiddenSuppressedCount) | 0,
      spillOutOfBoundsCount: Number(args.spillOutOfBoundsCount) | 0,
      unsortedSourceCount: Number(args.unsortedSourceCount) | 0
    },
    cells: args.cells || []
  };
}
