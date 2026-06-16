import {
  OBJECT_TYPE_DOOR_VALUES,
  OBJECT_TYPE_TOP_DECOR_VALUES,
  u6ObjectTypeSet
} from "./u6_object_constants.ts";

const OBJECT_TYPES_DOOR = u6ObjectTypeSet(OBJECT_TYPE_DOOR_VALUES);
const OBJECT_TYPES_TOP_DECOR = u6ObjectTypeSet(OBJECT_TYPE_TOP_DECOR_VALUES);

export type U6ObjectFootprintTileRuntime = {
  tileId: number;
  x: number;
  y: number;
};

export type U6TileFlagsForTileRuntime = (tileId: number) => number;

export function u6ObjectFootprintTilesRuntime(
  ox: unknown,
  oy: unknown,
  tileId: unknown,
  tileFlagsForTile: U6TileFlagsForTileRuntime
): U6ObjectFootprintTileRuntime[] {
  const wrap10 = (v: unknown): number => Number(v) & 0x3ff;
  const sx = wrap10(ox);
  const sy = wrap10(oy);
  const baseTileId = Number(tileId) & 0xffff;
  const tf = tileFlagsForTile(baseTileId & 0x07ff) | 0;
  const out: U6ObjectFootprintTileRuntime[] = [{ x: sx, y: sy, tileId: baseTileId }];
  if (tf & 0x80) {
    out.push({ x: wrap10(sx - 1), y: sy, tileId: (baseTileId - 1) & 0xffff });
  }
  if (tf & 0x40) {
    const upTile = (tf & 0x80) ? (baseTileId - 2) : (baseTileId - 1);
    out.push({ x: sx, y: wrap10(sy - 1), tileId: upTile & 0xffff });
  }
  if ((tf & 0xc0) === 0xc0) {
    out.push({ x: wrap10(sx - 1), y: wrap10(sy - 1), tileId: (baseTileId - 3) & 0xffff });
  }
  return out;
}

export function isU6ImplicitSolidObjectTileRuntime(
  objType: unknown,
  tileId: unknown,
  tileFlagsForTile: U6TileFlagsForTileRuntime
): boolean {
  const type = Number(objType) & 0x03ff;
  if (OBJECT_TYPES_DOOR.has(type)) {
    return false;
  }
  const tf = tileFlagsForTile(Number(tileId) & 0x07ff) | 0;
  if ((tf & 0x20) !== 0) {
    return true;
  }
  if ((tf & 0xc0) === 0) {
    return false;
  }
  if ((tf & 0x10) !== 0) {
    return false;
  }
  if (OBJECT_TYPES_TOP_DECOR.has(type)) {
    return false;
  }
  return true;
}
