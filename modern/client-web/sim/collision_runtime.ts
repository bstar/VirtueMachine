import type { ObjectFootprintTileRuntime } from "./object_footprint_runtime.ts";

export type CollisionRuntimeObject = {
  renderable?: boolean;
  type: number;
};

export type CollisionRuntimeEntity = {
  id: number;
  x: number;
  y: number;
  z: number;
};

export type CollisionRuntimeDeps<TObject extends CollisionRuntimeObject> = {
  avatarEntityId: number;
  entities?: readonly CollisionRuntimeEntity[] | null;
  isDoorObject: (obj: TObject) => boolean;
  isDoorOpen: (obj: TObject) => boolean;
  isImplicitSolidObjectTile: (objType: number, tileId: number) => boolean;
  isSolidEnvObject: (obj: TObject) => boolean;
  mapTileAt: (x: number, y: number, z: number) => number;
  objectFootprintTiles: (obj: TObject, ox: number, oy: number) => readonly ObjectFootprintTileRuntime[];
  objectsAt?: ((x: number, y: number, z: number) => readonly TObject[]) | null;
  terrainFlagsForTile: (tileId: number) => number;
  tileFlagsForTile: (tileId: number) => number;
};

export function isBlockedAtRuntime<TObject extends CollisionRuntimeObject>(
  wx: number,
  wy: number,
  wz: number,
  deps: CollisionRuntimeDeps<TObject>
): boolean {
  const tileId = deps.mapTileAt(wx, wy, wz) & 0x07ff;
  if ((deps.tileFlagsForTile(tileId) & 0x04) !== 0) {
    return true;
  }
  if ((deps.terrainFlagsForTile(tileId) & 0x04) !== 0) {
    return true;
  }

  if (deps.objectsAt) {
    const wrap10 = (v: number) => v & 0x3ff;
    const tx = wrap10(wx);
    const ty = wrap10(wy);
    const sources = [
      [wx, wy],
      [wx + 1, wy],
      [wx, wy + 1],
      [wx + 1, wy + 1]
    ] as const;
    for (const [ox, oy] of sources) {
      for (const obj of deps.objectsAt(ox, oy, wz)) {
        if (obj.renderable === false) {
          continue;
        }
        if (objectBlocksCellRuntime(obj, ox, oy, tx, ty, deps)) {
          return true;
        }
      }
    }
  }

  if (deps.entities) {
    for (const entity of deps.entities) {
      if ((entity.z | 0) !== (wz | 0)) {
        continue;
      }
      if ((entity.x | 0) !== (wx | 0) || (entity.y | 0) !== (wy | 0)) {
        continue;
      }
      if ((entity.id | 0) === (deps.avatarEntityId | 0)) {
        continue;
      }
      return true;
    }
  }

  return false;
}

function objectBlocksCellRuntime<TObject extends CollisionRuntimeObject>(
  obj: TObject,
  ox: number,
  oy: number,
  tx: number,
  ty: number,
  deps: CollisionRuntimeDeps<TObject>
): boolean {
  const isDoor = deps.isDoorObject(obj);
  const doorOpen = isDoor ? deps.isDoorOpen(obj) : false;
  for (const cell of deps.objectFootprintTiles(obj, ox, oy)) {
    if ((cell.x | 0) !== tx || (cell.y | 0) !== ty) {
      continue;
    }
    if (isDoor) {
      if (!doorOpen) {
        return true;
      }
      const cellFlags = deps.tileFlagsForTile(cell.tileId & 0x07ff);
      if ((cellFlags & 0x04) !== 0 || (cellFlags & 0x20) !== 0) {
        return true;
      }
      continue;
    }
    if (deps.isSolidEnvObject(obj)) {
      return true;
    }
    if (deps.isImplicitSolidObjectTile(obj.type, cell.tileId)) {
      return true;
    }
  }
  return false;
}
