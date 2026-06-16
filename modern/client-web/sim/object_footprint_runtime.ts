import {
  isU6ImplicitSolidObjectTileRuntime,
  u6ObjectFootprintTilesRuntime,
  type U6ObjectFootprintTileRuntime,
  type U6TileFlagsForTileRuntime
} from "../../common/u6_object_footprint.ts";

export type ObjectFootprintTileRuntime = U6ObjectFootprintTileRuntime;

export type TileFlagsForTileRuntime = U6TileFlagsForTileRuntime;

export function objectFootprintTilesRuntime(
  ox: number,
  oy: number,
  tileId: number,
  tileFlagsForTile: TileFlagsForTileRuntime
): ObjectFootprintTileRuntime[] {
  return u6ObjectFootprintTilesRuntime(ox, oy, tileId, tileFlagsForTile);
}

export function isImplicitSolidObjectTileRuntime(
  objType: number,
  tileId: number,
  tileFlagsForTile: TileFlagsForTileRuntime
): boolean {
  return isU6ImplicitSolidObjectTileRuntime(objType, tileId, tileFlagsForTile);
}
