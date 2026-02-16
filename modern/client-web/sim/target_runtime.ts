export function topWorldObjectAtCellRuntime(
  objectLayer: { objectsAt: (x: number, y: number, z: number) => any[] } | null | undefined,
  sim: any,
  tx: number,
  ty: number,
  tz: number,
  opts: { pickupOnly?: boolean } | undefined,
  deps: {
    isObjectRemoved: (sim: any, obj: any) => boolean;
    isLikelyPickupObjectType: (type: number) => boolean;
  }
): any | null {
  if (!objectLayer) {
    return null;
  }
  const pickupOnly = !!opts?.pickupOnly;
  const list = objectLayer.objectsAt(tx | 0, ty | 0, tz | 0);
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const o = list[i];
    if (!o.renderable || deps.isObjectRemoved(sim, o)) {
      continue;
    }
    if (pickupOnly && !deps.isLikelyPickupObjectType(o.type)) {
      continue;
    }
    return o;
  }
  return null;
}

export function nearestTalkTargetAtCellRuntime(
  entityEntries: any[] | null | undefined,
  tx: number,
  ty: number,
  tz: number,
  avatarEntityId: number
): any | null {
  if (!Array.isArray(entityEntries)) {
    return null;
  }
  for (const e of entityEntries) {
    if ((e.z | 0) !== (tz | 0)) continue;
    if ((e.x | 0) !== (tx | 0)) continue;
    if ((e.y | 0) !== (ty | 0)) continue;
    if ((e.id | 0) === (avatarEntityId | 0)) continue;
    return e;
  }
  return null;
}
