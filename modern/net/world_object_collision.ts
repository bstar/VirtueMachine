import {
  OBJ_COORD_USE_LOCXYZ,
  OBJECT_TYPE_CLOSEABLE_DOOR_VALUES,
  OBJECT_TYPE_DOOR_VALUES,
  OBJECT_TYPE_SOLID_ENV_VALUES,
  u6ObjectTypeSet
} from "../common/u6_object_constants.ts";
import {
  isU6ImplicitSolidObjectTileRuntime,
  u6ObjectFootprintTilesRuntime
} from "../common/u6_object_footprint.ts";
import type { NpcStepTarget, WorldObject, WorldObjectRuntimeState } from "./world_object_types.ts";

const OBJECT_TYPES_DOOR = u6ObjectTypeSet(OBJECT_TYPE_DOOR_VALUES);
const OBJECT_TYPES_CLOSEABLE_DOOR = u6ObjectTypeSet(OBJECT_TYPE_CLOSEABLE_DOOR_VALUES);
const OBJECT_TYPES_SOLID_ENV = u6ObjectTypeSet(OBJECT_TYPE_SOLID_ENV_VALUES);

export interface ObjectFootprintCell {
  x: number;
  y: number;
  z: number;
  tile_id: number;
}

export function objectFootprintCells(obj: WorldObject, tileFlags: Uint8Array | null | undefined): ObjectFootprintCell[] {
  const z = Number(obj.z) | 0;
  return u6ObjectFootprintTilesRuntime(
    obj.x,
    obj.y,
    obj.tile_id,
    (tileId) => tileFlags ? (tileFlags[tileId & 0x07ff] ?? 0) : 0
  ).map((cell) => ({
    x: cell.x,
    y: cell.y,
    z,
    tile_id: cell.tileId
  }));
}

export function objectAnchorIndexKey(x: unknown, y: unknown, z: unknown): string {
  return `${Number(x) & 0x3ff},${Number(y) & 0x3ff},${Number(z) & 0x0f}`;
}

export function buildObjectAnchorIndex(objects: WorldObject[]): Map<string, WorldObject[]> {
  const out = new Map<string, WorldObject[]>();
  for (const obj of Array.isArray(objects) ? objects : []) {
    if (!obj || (Number(obj.coord_use) | 0) !== OBJ_COORD_USE_LOCXYZ) {
      continue;
    }
    const key = objectAnchorIndexKey(obj.x, obj.y, obj.z);
    const bucket = out.get(key);
    if (bucket) {
      bucket.push(obj);
    } else {
      out.set(key, [obj]);
    }
  }
  return out;
}

export function refreshWorldObjectIndexes(state: WorldObjectRuntimeState): void {
  if (!state?.worldObjects) {
    return;
  }
  state.worldObjects.activeByAnchor = buildObjectAnchorIndex(state.worldObjects.active);
}

export function activeObjectsAnchoredAt(state: WorldObjectRuntimeState, x: unknown, y: unknown, z: unknown): WorldObject[] {
  const key = objectAnchorIndexKey(x, y, z);
  const indexed = state?.worldObjects?.activeByAnchor;
  if (indexed && typeof indexed.get === "function") {
    return indexed.get(key) || [];
  }
  return (state?.worldObjects?.active || []).filter((obj) => (
    (Number(obj?.coord_use) | 0) === OBJ_COORD_USE_LOCXYZ
    && ((Number(obj.x) & 0x3ff) === (Number(x) & 0x3ff))
    && ((Number(obj.y) & 0x3ff) === (Number(y) & 0x3ff))
    && ((Number(obj.z) & 0x0f) === (Number(z) & 0x0f))
  ));
}

function isCloseableDoorType(type: unknown): boolean {
  return OBJECT_TYPES_CLOSEABLE_DOOR.has(Number(type) & 0x03ff);
}

function isDoorFrameOpen(type: unknown, frame: unknown): boolean {
  const t = Number(type) & 0x03ff;
  const f = Number(frame) | 0;
  if (!isCloseableDoorType(t)) {
    return false;
  }
  if (t === 0x14e) {
    return (f & 1) !== 0;
  }
  return f >= 0 && f < 4;
}

function isSolidEnvObject(obj: WorldObject): boolean {
  return !!obj && OBJECT_TYPES_SOLID_ENV.has(Number(obj.type) & 0x03ff);
}

function isImplicitSolidObjectTile(obj: WorldObject, tileId: unknown, tileFlags: Uint8Array | null | undefined): boolean {
  return isU6ImplicitSolidObjectTileRuntime(
    obj?.type,
    tileId,
    (rawTileId) => tileFlags ? (tileFlags[rawTileId & 0x07ff] ?? 0) : 0
  );
}

export function objectBlocksCell(obj: WorldObject, tx: number, ty: number, tz: number, tileFlags: Uint8Array | null | undefined): boolean {
  if (!obj || (Number(obj.coord_use) | 0) !== OBJ_COORD_USE_LOCXYZ || (Number(obj.z) | 0) !== (tz | 0)) {
    return false;
  }
  const isDoor = OBJECT_TYPES_DOOR.has(Number(obj.type) & 0x03ff);
  const doorOpen = isDoor ? isDoorFrameOpen(obj.type, obj.frame) : false;
  for (const cell of objectFootprintCells(obj, tileFlags)) {
    if ((cell.x | 0) !== (tx | 0) || (cell.y | 0) !== (ty | 0) || (cell.z | 0) !== (tz | 0)) {
      continue;
    }
    if (isDoor) {
      if (!doorOpen) {
        return true;
      }
      const ctf = tileFlags ? (tileFlags[Number(cell.tile_id) & 0x07ff] ?? 0) : 0;
      if ((ctf & 0x04) !== 0 || (ctf & 0x20) !== 0) {
        return true;
      }
      continue;
    }
    if (isSolidEnvObject(obj)) {
      return true;
    }
    if (isImplicitSolidObjectTile(obj, cell.tile_id, tileFlags)) {
      return true;
    }
  }
  return false;
}

export function canNpcStepInto(state: WorldObjectRuntimeState, step: NpcStepTarget): boolean {
  const tx = Number(step?.to_x) | 0;
  const ty = Number(step?.to_y) | 0;
  const tz = Number(step?.to_z) | 0;
  if (!state?.worldObjects || !state?.mapRuntime) {
    return true;
  }
  const rawTile = state.mapRuntime.tileAt(tx, ty, tz) & 0x07ff;
  const worldObjects = state.worldObjects;
  const terrain = worldObjects.terrainType ? (worldObjects.terrainType[rawTile] ?? 0) : 0;
  const tileFlag = worldObjects.tileFlags ? (worldObjects.tileFlags[rawTile] ?? 0) : 0;
  if ((terrain & 0x04) !== 0 || (tileFlag & 0x04) !== 0 || (tileFlag & 0x20) !== 0) {
    return false;
  }
  const sources = [
    [tx, ty],
    [tx + 1, ty],
    [tx, ty + 1],
    [tx + 1, ty + 1]
  ];
  const seen = new Set<string>();
  for (const [sx, sy] of sources) {
    for (const obj of activeObjectsAnchoredAt(state, sx, sy, tz)) {
      const key = String(obj.object_key || `${obj.source_area}:${obj.source_index}`);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      if (objectBlocksCell(obj, tx, ty, tz, worldObjects.tileFlags)) {
        return false;
      }
    }
  }
  return true;
}
