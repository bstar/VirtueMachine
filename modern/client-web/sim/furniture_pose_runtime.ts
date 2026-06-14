import { isBedObjectRuntime, isChairObjectRuntime } from "./object_types_runtime.ts";

export type FurniturePoseObjectRuntime = {
  baseTile: number;
  frame: number;
  order?: number;
  type: number;
  x: number;
  y: number;
  z?: number;
};

export type FurniturePoseCellRuntime = {
  x: number;
  y: number;
};

export type ChairFootprintTileRuntime = FurniturePoseCellRuntime & {
  tileId: number;
};

export type TileFlagsForTileRuntime = (tileId: number) => number;

export type ChairFootprintProviderRuntime = (
  obj: FurniturePoseObjectRuntime
) => readonly ChairFootprintTileRuntime[];

export type FurnitureObjectProviderRuntime = (
  x: number,
  y: number,
  z: number
) => Iterable<FurniturePoseObjectRuntime>;

export type FurnitureAvatarPoseRuntime = "stand" | "sit" | "sleep";

export type FurniturePoseAnchorRuntime = {
  x: number;
  y: number;
  z?: number;
  order?: number;
  type: number;
};

export type FurnitureInteractionSimRuntime = {
  avatarPose: FurnitureAvatarPoseRuntime | string;
  avatarPoseAnchor: FurniturePoseAnchorRuntime | null;
  avatarPoseSetTick: number;
  tick: number;
  world: {
    map_x: number;
    map_y: number;
    map_z: number;
  };
};

export type FurnitureInteractionRuntimeResult = {
  clearPendingMoveCommands: boolean;
  diagClass: "ok";
  ok: boolean;
  text: string;
};

export type FurnitureInteractionRuntimeDeps = {
  isBedObject(obj: FurniturePoseObjectRuntime): boolean;
  preferredSleepCell(
    bedObj: FurniturePoseObjectRuntime,
    fromX: number,
    fromY: number
  ): FurniturePoseCellRuntime & { z: number };
};

export function furniturePoseAnchorKeyRuntime(
  anchor: FurniturePoseAnchorRuntime | null | undefined
): string {
  if (!anchor) {
    return "";
  }
  return `${Number(anchor.x) & 0x3ff},${Number(anchor.y) & 0x3ff},${Number(anchor.z) & 0x0f},${Number(anchor.order) & 0xffff},${Number(anchor.type) & 0x3ff}`;
}

export function clearFurnitureAvatarPoseRuntime(sim: FurnitureInteractionSimRuntime): void {
  sim.avatarPose = "stand";
  sim.avatarPoseAnchor = null;
  sim.avatarPoseSetTick = -1;
}

export function applyFurnitureInteractionRuntime(
  sim: FurnitureInteractionSimRuntime,
  obj: FurniturePoseObjectRuntime | null | undefined,
  deps: FurnitureInteractionRuntimeDeps
): FurnitureInteractionRuntimeResult {
  if (!obj) {
    if (sim.avatarPose !== "stand") {
      clearFurnitureAvatarPoseRuntime(sim);
      return {
        clearPendingMoveCommands: false,
        diagClass: "ok",
        ok: true,
        text: "Stood up."
      };
    }
    return {
      clearPendingMoveCommands: false,
      diagClass: "ok",
      ok: false,
      text: ""
    };
  }

  const nextPose: FurnitureAvatarPoseRuntime = deps.isBedObject(obj) ? "sleep" : "sit";
  const currentKey = furniturePoseAnchorKeyRuntime(sim.avatarPoseAnchor);
  const targetKey = furniturePoseAnchorKeyRuntime(obj);
  if (sim.avatarPose === nextPose && currentKey === targetKey) {
    clearFurnitureAvatarPoseRuntime(sim);
    return {
      clearPendingMoveCommands: false,
      diagClass: "ok",
      ok: true,
      text: "Stood up."
    };
  }

  const fromX = sim.world.map_x | 0;
  const fromY = sim.world.map_y | 0;
  sim.avatarPose = nextPose;
  sim.avatarPoseSetTick = Number(sim.tick) | 0;
  sim.avatarPoseAnchor = {
    x: obj.x | 0,
    y: obj.y | 0,
    z: obj.z | 0,
    order: obj.order | 0,
    type: obj.type | 0
  };

  if (nextPose === "sleep" && deps.isBedObject(obj)) {
    const sleepCell = deps.preferredSleepCell(obj, fromX, fromY);
    sim.world.map_x = sleepCell.x | 0;
    sim.world.map_y = sleepCell.y | 0;
    sim.world.map_z = sleepCell.z | 0;
  } else {
    sim.world.map_x = obj.x | 0;
    sim.world.map_y = obj.y | 0;
    sim.world.map_z = obj.z | 0;
  }

  return {
    clearPendingMoveCommands: true,
    diagClass: "ok",
    ok: true,
    text: nextPose === "sleep"
      ? `Sleeping at ${obj.x},${obj.y},${obj.z}`
      : `Sitting at ${obj.x},${obj.y},${obj.z}`
  };
}

export function furnitureOccupancyCellsRuntime(
  obj: FurniturePoseObjectRuntime | null | undefined,
  tileFlagsForTile: TileFlagsForTileRuntime
): FurniturePoseCellRuntime[] {
  if (!obj) {
    return [];
  }
  const x = obj.x | 0;
  const y = obj.y | 0;
  const cells: FurniturePoseCellRuntime[] = [{ x, y }];
  const tileId = ((obj.baseTile | 0) + (obj.frame | 0)) & 0xffff;
  const tf = tileFlagsForTile(tileId) | 0;
  if (tf & 0x80) {
    cells.push({ x: x - 1, y });
  }
  if (tf & 0x40) {
    cells.push({ x, y: y - 1 });
  }
  if ((tf & 0xc0) === 0xc0) {
    cells.push({ x: x - 1, y: y - 1 });
  }
  return cells;
}

export function chairFrameForCellRuntime(
  obj: FurniturePoseObjectRuntime | null | undefined,
  tx: number,
  ty: number,
  footprintProvider: ChairFootprintProviderRuntime
): number | null {
  if (!obj) {
    return null;
  }
  const type = (obj.type | 0) & 0x03ff;
  if (type === 0x0fc) {
    return (obj.frame | 0) & 0x03;
  }
  if (type !== 0x147) {
    return null;
  }
  for (const cell of footprintProvider(obj)) {
    if ((cell.x | 0) !== (tx | 0) || (cell.y | 0) !== (ty | 0)) {
      continue;
    }
    const normalizedFrame = (((cell.tileId | 0) - (obj.baseTile | 0)) & 0x3f);
    if (normalizedFrame === 2) {
      return normalizedFrame;
    }
  }
  return null;
}

export function objectIsChairAtCellRuntime(
  obj: FurniturePoseObjectRuntime | null | undefined,
  tx: number,
  ty: number,
  tileFlagsForTile: TileFlagsForTileRuntime,
  footprintProvider: ChairFootprintProviderRuntime
): boolean {
  if (!obj) {
    return false;
  }
  const type = (obj.type | 0) & 0x03ff;
  if (type === 0x147) {
    return chairFrameForCellRuntime(obj, tx, ty, footprintProvider) !== null;
  }
  if (!isChairObjectRuntime(obj)) {
    return false;
  }
  return furnitureOccupancyCellsRuntime(obj, tileFlagsForTile).some(
    (cell) => (cell.x | 0) === (tx | 0) && (cell.y | 0) === (ty | 0)
  );
}

export function objectIsBedAtCellRuntime(
  obj: FurniturePoseObjectRuntime | null | undefined,
  tx: number,
  ty: number,
  tileFlagsForTile: TileFlagsForTileRuntime
): boolean {
  if (!obj || !isBedObjectRuntime(obj)) {
    return false;
  }
  return furnitureOccupancyCellsRuntime(obj, tileFlagsForTile).some(
    (cell) => (cell.x | 0) === (tx | 0) && (cell.y | 0) === (ty | 0)
  );
}

export function sleepBedCellFrameOffsetRuntime(
  bedObj: FurniturePoseObjectRuntime | null | undefined,
  wx: number,
  wy: number,
  tileFlagsForTile: TileFlagsForTileRuntime
): number {
  if (!bedObj) {
    return 0;
  }
  const bx = bedObj.x | 0;
  const by = bedObj.y | 0;
  const tileId = ((bedObj.baseTile | 0) + (bedObj.frame | 0)) & 0xffff;
  const tf = tileFlagsForTile(tileId) | 0;
  const hasDoubleH = (tf & 0x80) !== 0;
  const hasDoubleV = (tf & 0x40) !== 0;

  if ((wx | 0) === bx && (wy | 0) === by) {
    return 0;
  }
  if (hasDoubleH && (wx | 0) === (bx - 1) && (wy | 0) === by) {
    return 1;
  }
  if (hasDoubleV && (wx | 0) === bx && (wy | 0) === (by - 1)) {
    return hasDoubleH ? 2 : 1;
  }
  if (hasDoubleH && hasDoubleV && (wx | 0) === (bx - 1) && (wy | 0) === (by - 1)) {
    return 3;
  }
  return 0;
}

export function preferredSleepCellForBedRuntime(
  bedObj: FurniturePoseObjectRuntime,
  fromX: number,
  fromY: number,
  tileFlagsForTile: TileFlagsForTileRuntime
): FurniturePoseCellRuntime & { z: number } {
  const cells = furnitureOccupancyCellsRuntime(bedObj, tileFlagsForTile);
  if (!cells.length) {
    return { x: bedObj.x | 0, y: bedObj.y | 0, z: bedObj.z | 0 };
  }
  let best = cells[0];
  let bestScore = Number.POSITIVE_INFINITY;
  for (const cell of cells) {
    const normalized = (((bedObj.frame | 0) - sleepBedCellFrameOffsetRuntime(bedObj, cell.x, cell.y, tileFlagsForTile)) & 0x07);
    const legacySleepValid = normalized === 0 || normalized === 6;
    const dist = Math.abs((fromX | 0) - cell.x) + Math.abs((fromY | 0) - cell.y);
    const score = (legacySleepValid ? 0 : 1000) + dist;
    if (score < bestScore) {
      best = cell;
      bestScore = score;
    }
  }
  return { x: best.x | 0, y: best.y | 0, z: bedObj.z | 0 };
}

export function sleepFrameOffsetForBedAtCellRuntime(
  bedObj: FurniturePoseObjectRuntime | null | undefined,
  wx: number,
  wy: number,
  tileFlagsForTile: TileFlagsForTileRuntime
): number {
  if (!bedObj) {
    return 0;
  }
  const cellOffset = sleepBedCellFrameOffsetRuntime(bedObj, wx | 0, wy | 0, tileFlagsForTile);
  const normalized = (((bedObj.frame | 0) - cellOffset) & 0x07);
  return normalized === 6 ? 1 : 0;
}

export function bedInteractionScoreRuntime(
  bedObj: FurniturePoseObjectRuntime,
  fromX: number,
  fromY: number,
  tileFlagsForTile: TileFlagsForTileRuntime
): { valid: boolean; dist: number } {
  const cells = furnitureOccupancyCellsRuntime(bedObj, tileFlagsForTile);
  if (!cells.length) {
    return { valid: false, dist: 0 };
  }
  let valid = false;
  let validDist = Number.POSITIVE_INFINITY;
  let anyDist = Number.POSITIVE_INFINITY;
  for (const cell of cells) {
    const dist = Math.abs((fromX | 0) - (cell.x | 0)) + Math.abs((fromY | 0) - (cell.y | 0));
    if (dist < anyDist) {
      anyDist = dist;
    }
    const normalized = (((bedObj.frame | 0) - sleepBedCellFrameOffsetRuntime(bedObj, cell.x | 0, cell.y | 0, tileFlagsForTile)) & 0x07);
    if (normalized === 0 || normalized === 6) {
      valid = true;
      if (dist < validDist) {
        validDist = dist;
      }
    }
  }
  return { valid, dist: valid ? validDist : anyDist };
}

export function furnitureAtWorldCellRuntime(args: {
  bedInteractionScore(obj: FurniturePoseObjectRuntime, fromX: number, fromY: number): { valid: boolean; dist: number };
  fromX: number;
  fromY: number;
  isBedAtCell(obj: FurniturePoseObjectRuntime, tx: number, ty: number): boolean;
  isChairAtCell(obj: FurniturePoseObjectRuntime, tx: number, ty: number): boolean;
  objectsAt: FurnitureObjectProviderRuntime | null | undefined;
  tx: number;
  ty: number;
  tz: number;
}): FurniturePoseObjectRuntime | null {
  if (!args.objectsAt) {
    return null;
  }
  const tx = args.tx | 0;
  const ty = args.ty | 0;
  const tz = args.tz | 0;
  const overlays: FurniturePoseObjectRuntime[] = [];
  const seen = new Set<string>();
  const addCandidatesAt = (sx: number, sy: number) => {
    for (const o of args.objectsAt ? args.objectsAt(sx | 0, sy | 0, tz) : []) {
      if (!args.isChairAtCell(o, tx, ty) && !args.isBedAtCell(o, tx, ty)) {
        continue;
      }
      const key = `${Number(o.order) | 0}:${Number(o.type) | 0}:${Number(o.x) | 0}:${Number(o.y) | 0}:${Number(o.z) | 0}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      overlays.push(o);
    }
  };
  addCandidatesAt(tx, ty);
  addCandidatesAt((tx + 1) | 0, ty);
  addCandidatesAt(tx, (ty + 1) | 0);
  addCandidatesAt((tx + 1) | 0, (ty + 1) | 0);

  const chairs: FurniturePoseObjectRuntime[] = [];
  const beds: FurniturePoseObjectRuntime[] = [];
  for (const o of overlays) {
    if (args.isChairAtCell(o, tx, ty)) {
      chairs.push(o);
    } else if (args.isBedAtCell(o, tx, ty)) {
      beds.push(o);
    }
  }
  if (chairs.length > 0) {
    return chairs[0];
  }
  if (beds.length === 1) {
    return beds[0];
  }
  if (beds.length > 1) {
    const fromX = args.fromX | 0;
    const fromY = args.fromY | 0;
    beds.sort((a, b) => {
      const as = args.bedInteractionScore(a, fromX, fromY);
      const bs = args.bedInteractionScore(b, fromX, fromY);
      if (as.valid !== bs.valid) {
        return as.valid ? -1 : 1;
      }
      if (as.dist !== bs.dist) {
        return as.dist - bs.dist;
      }
      return (Number(a.order) | 0) - (Number(b.order) | 0);
    });
    return beds[0];
  }
  return null;
}
