export const DEFAULT_PICKUP_RESPAWN_MS = 10 * 60 * 1000;
export const LOOT_PICKUP_RESPAWN_MS = 60 * 60 * 1000;

export function isSlowRespawnLootObject(obj: unknown): boolean {
  const type = Number((obj as any)?.type) & 0x3ff;
  /*
    Legacy U6 object ids: 88=gold coin, 89=gold nugget, 98=chest.
    Keep this deliberately narrow until the object-name table is wired in.
  */
  return type === 88 || type === 89 || type === 98;
}

export function pickupRespawnPolicyForObject(obj: unknown): { policy: string; respawn_ms: number } {
  if (isSlowRespawnLootObject(obj)) {
    return {
      policy: "loot_slow",
      respawn_ms: LOOT_PICKUP_RESPAWN_MS
    };
  }
  return {
    policy: "default",
    respawn_ms: DEFAULT_PICKUP_RESPAWN_MS
  };
}

export function isBaselineWorldObject(obj: unknown): boolean {
  const kind = String((obj as any)?.source_kind || "baseline");
  return kind === "baseline" || kind === "baseline_moved" || kind === "";
}

export function inventoryCloneKeyForTake(state: unknown, target: unknown, actorId: unknown): string {
  const nextSeq = (Number((state as any)?.worldInteractionLog?.seq || 0) + 1) >>> 0;
  const source = String((target as any)?.object_key || "object").replace(/[^a-zA-Z0-9:_-]+/g, "_");
  const actor = String(actorId || "actor").replace(/[^a-zA-Z0-9:_-]+/g, "_");
  return `inv:${source}:${actor}:${nextSeq}`;
}

export function pushSpawnedWorldObject(state: any, obj: any): void {
  state.worldObjects.deltas.spawned.push({
    object_key: String(obj.object_key || ""),
    source_area: Number(obj.source_area) >>> 0,
    source_index: Number(obj.source_index) >>> 0,
    status: Number(obj.status) & 0xff,
    shape_type: Number(obj.shape_type) & 0xffff,
    amount: Number(obj.amount) & 0xffff,
    type: Number(obj.type) & 0x3ff,
    frame: Number(obj.frame) & 0x3f,
    tile_id: Number(obj.tile_id) & 0xffff,
    x: Number(obj.x) | 0,
    y: Number(obj.y) | 0,
    z: Number(obj.z) | 0,
    holder_kind: String(obj.holder_kind || "none"),
    holder_id: String(obj.holder_id || ""),
    holder_key: String(obj.holder_key || "")
  });
}
