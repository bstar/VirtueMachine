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
  const candidates = [];
  for (let i = 0; i < list.length; i += 1) {
    const o = list[i];
    if (!o || !o.renderable || deps.isObjectRemoved(sim, o)) {
      continue;
    }
    if (pickupOnly && !deps.isLikelyPickupObjectType(o.type)) {
      continue;
    }
    const sortOrder = Number((o.legacyOrder != null) ? o.legacyOrder : o.order) | 0;
    const index = Number((o.index != null) ? o.index : i) | 0;
    candidates.push({ obj: o, sortOrder, index });
  }
  if (!candidates.length) {
    return null;
  }
  candidates.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) {
      return b.sortOrder - a.sortOrder;
    }
    return b.index - a.index;
  });
  return candidates[0].obj || null;
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
  const candidates = [];
  let i = 0;
  for (const e of entityEntries) {
    const idx = i;
    i += 1;
    if ((e.z | 0) !== (tz | 0)) continue;
    if ((e.x | 0) !== (tx | 0)) continue;
    if ((e.y | 0) !== (ty | 0)) continue;
    if ((e.id | 0) === (avatarEntityId | 0)) continue;
    const sortOrder = Number((e.legacyOrder != null) ? e.legacyOrder : e.order) | 0;
    candidates.push({ entity: e, sortOrder, index: idx });
  }
  if (!candidates.length) {
    return null;
  }
  candidates.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) {
      return b.sortOrder - a.sortOrder;
    }
    return b.index - a.index;
  });
  return candidates[0].entity || null;
}

export function buildTargetResolverRegressionProbesRuntime(): {
  world_overlap_cases: Array<{ id: string; selected: string | null }>;
  talk_overlap_cases: Array<{ id: string; selected_id: number | null }>;
} {
  const makeLayer = (list: any[]) => ({
    objectsAt: (_x: number, _y: number, _z: number) => list
  });
  const removedSet = new Set<string>();
  const deps = {
    isObjectRemoved: (_sim: any, obj: any) => removedSet.has(String(obj?.key || "")),
    isLikelyPickupObjectType: (type: number) => ((Number(type) & 0x3ff) !== 0x129)
  };

  const world_overlap_cases = [
    {
      id: "highest_legacy_order_wins",
      selected: topWorldObjectAtCellRuntime(
        makeLayer([
          { key: "a", renderable: true, legacyOrder: 10, order: 10, index: 1, type: 0x90 },
          { key: "b", renderable: true, legacyOrder: 40, order: 40, index: 2, type: 0x91 }
        ]) as any,
        {},
        0,
        0,
        0,
        {},
        deps
      )?.key || null
    },
    {
      id: "pickup_filter_skips_non_pickup",
      selected: topWorldObjectAtCellRuntime(
        makeLayer([
          { key: "door", renderable: true, legacyOrder: 99, order: 99, index: 1, type: 0x129 },
          { key: "item", renderable: true, legacyOrder: 10, order: 10, index: 2, type: 0x090 }
        ]) as any,
        {},
        0,
        0,
        0,
        { pickupOnly: true },
        deps
      )?.key || null
    }
  ];

  const talk_overlap_cases = [
    {
      id: "highest_order_non_avatar_wins",
      selected_id: nearestTalkTargetAtCellRuntime(
        [
          { id: 1, x: 10, y: 10, z: 0, legacyOrder: 999, order: 999 },
          { id: 2, x: 10, y: 10, z: 0, legacyOrder: 10, order: 10 },
          { id: 3, x: 10, y: 10, z: 0, legacyOrder: 20, order: 20 }
        ],
        10,
        10,
        0,
        1
      )?.id ?? null
    },
    {
      id: "no_non_avatar_target",
      selected_id: nearestTalkTargetAtCellRuntime(
        [{ id: 1, x: 10, y: 10, z: 0, legacyOrder: 1, order: 1 }],
        10,
        10,
        0,
        1
      )?.id ?? null
    }
  ];

  return {
    world_overlap_cases,
    talk_overlap_cases
  };
}
