import type { SpawnedWorldObjectDelta, WorldObject, WorldObjectRuntimeState, WorldObjectStateContainer } from "./world_object_types.ts";
import {
  OBJECT_TYPE_BED_VALUES,
  OBJECT_TYPE_CHAIR_VALUES,
  OBJECT_TYPE_DOOR_VALUES,
  OBJECT_TYPE_ENV_FIXTURE_VALUES,
  OBJECT_TYPE_SIGN_VALUES,
  OBJECT_TYPE_SOLID_ENV_VALUES,
  OBJECT_TYPE_TOP_DECOR_VALUES,
  OBJECT_TYPE_ZERO_WEIGHT_TAKEABLE_VALUES,
  coordUseOfStatus,
  u6ObjectTypeSet
} from "../common/u6_object_constants.ts";

export const DEFAULT_PICKUP_RESPAWN_MS = 10 * 60 * 1000;
export const DEFAULT_DROPPED_CLONE_DESPAWN_MS = 10 * 60 * 1000;
export const LOOT_PICKUP_RESPAWN_MS = 60 * 60 * 1000;
const OBJECT_TYPES_NON_PICKUP = u6ObjectTypeSet([
  ...OBJECT_TYPE_DOOR_VALUES,
  ...OBJECT_TYPE_CHAIR_VALUES,
  ...OBJECT_TYPE_BED_VALUES,
  ...OBJECT_TYPE_SOLID_ENV_VALUES,
  ...OBJECT_TYPE_TOP_DECOR_VALUES,
  ...OBJECT_TYPE_SIGN_VALUES,
  ...OBJECT_TYPE_ENV_FIXTURE_VALUES,
  0x103, /* table leg */
  0x104, /* shadow */
  0x105, /* table leg */
  0x106  /* shadow */
]);
const OBJECT_TYPES_ZERO_WEIGHT_TAKEABLE = u6ObjectTypeSet(OBJECT_TYPE_ZERO_WEIGHT_TAKEABLE_VALUES);

export interface PickupRespawnPolicy {
  policy: string;
  respawn_ms: number;
}

export function isSlowRespawnLootObject(obj: Pick<WorldObject, "type"> | null | undefined): boolean {
  const type = Number(obj?.type) & 0x3ff;
  /*
    Legacy U6 object ids: 88=gold coin, 89=gold nugget, 98=chest.
    Keep this deliberately narrow until the object-name table is wired in.
  */
  return type === 88 || type === 89 || type === 98;
}

export function pickupRespawnPolicyForObject(obj: Pick<WorldObject, "type"> | null | undefined): PickupRespawnPolicy {
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

export function canTakeWorldObject(
  obj: Pick<WorldObject, "type"> | null | undefined,
  typeWeights?: ArrayLike<number> | null
): boolean {
  const type = Number(obj?.type) & 0x3ff;
  if (OBJECT_TYPES_NON_PICKUP.has(type)) {
    return false;
  }
  if (typeWeights && (Number(typeWeights[type]) | 0) === 0 && !OBJECT_TYPES_ZERO_WEIGHT_TAKEABLE.has(type)) {
    return false;
  }
  return true;
}

export function canPersistSnapshotInventoryKey(key: unknown): boolean {
  const match = String(key || "").trim().match(/^0x([0-9a-fA-F]+):0x[0-9a-fA-F]+$/);
  if (!match) {
    return true;
  }
  return canTakeWorldObject({ type: Number.parseInt(match[1], 16) });
}

export function sanitizeSnapshotInventoryBase64(snapshotBase64: string): string {
  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(snapshotBase64, "base64").toString("utf8"));
  } catch {
    return snapshotBase64;
  }
  if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) {
    return snapshotBase64;
  }
  const snapshot = decoded as { inventory?: unknown };
  if (!snapshot.inventory || typeof snapshot.inventory !== "object" || Array.isArray(snapshot.inventory)) {
    return snapshotBase64;
  }

  const inventory = snapshot.inventory as Record<string, unknown>;
  let changed = false;
  for (const key of Object.keys(inventory)) {
    if (!canPersistSnapshotInventoryKey(key)) {
      delete inventory[key];
      changed = true;
    }
  }
  return changed ? Buffer.from(JSON.stringify(snapshot), "utf8").toString("base64") : snapshotBase64;
}

export function isBaselineWorldObject(obj: Pick<WorldObject, "source_kind"> | null | undefined): boolean {
  const kind = String(obj?.source_kind || "baseline");
  return kind === "baseline" || kind === "baseline_moved" || kind === "";
}

export function inventoryCloneKeyForTake(
  state: Pick<WorldObjectRuntimeState, "worldInteractionLog" | "worldObjects"> | null | undefined,
  target: Pick<WorldObject, "object_key"> | null | undefined,
  actorId: unknown
): string {
  const nextSeq = (Number(state?.worldInteractionLog?.seq || 0) + 1) >>> 0;
  const source = String(target?.object_key || "object").replace(/[^a-zA-Z0-9:_-]+/g, "_");
  const actor = String(actorId || "actor").replace(/[^a-zA-Z0-9:_-]+/g, "_");
  const base = `inv:${source}:${actor}:${nextSeq}`;
  const existing = new Set<string>();
  for (const obj of state?.worldObjects?.active || []) {
    const key = String(obj?.object_key || "");
    if (key) {
      existing.add(key);
    }
  }
  for (const obj of state?.worldObjects?.deltas?.spawned || []) {
    const key = String(obj?.object_key || "");
    if (key) {
      existing.add(key);
    }
  }
  if (!existing.has(base)) {
    return base;
  }
  for (let i = 2; i < 10000; i += 1) {
    const candidate = `${base}:${i}`;
    if (!existing.has(candidate)) {
      return candidate;
    }
  }
  throw new Error("unable to allocate unique inventory clone key");
}

export function spawnedWorldObjectDeltaFromObject(obj: WorldObject): SpawnedWorldObjectDelta {
  return {
    object_key: String(obj.object_key || ""),
    source_object_key: String(obj.source_object_key || ""),
    despawn_at_ms: Number.isFinite(Number(obj.despawn_at_ms)) ? Math.floor(Number(obj.despawn_at_ms)) : 0,
    dropped_at_ms: Number.isFinite(Number(obj.dropped_at_ms)) ? Math.floor(Number(obj.dropped_at_ms)) : 0,
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
  };
}

export function pushSpawnedWorldObject(state: WorldObjectStateContainer, obj: WorldObject): void {
  state.worldObjects.deltas.spawned.push(spawnedWorldObjectDeltaFromObject(obj));
}

export type WorldObjectApiCommonPayload = {
  coord_use: number;
  despawn_at_ms: number;
  dropped_at_ms: number;
  frame: number;
  holder_id: string;
  holder_key: string;
  holder_kind: string;
  object_key: string;
  status: number;
  tile_id: number;
  type: number;
  x: number;
  y: number;
  z: number;
};

export type WorldObjectInteractionPayload = WorldObjectApiCommonPayload & {
  assoc_chain: string[];
  blocked_by: string;
  root_anchor_key: string;
  source_object_key: string;
};

export type WorldObjectTakeInventoryPayload = WorldObjectApiCommonPayload & {
  amount: number;
  inventory_key: string;
  source_object_key: string;
  source_kind: string;
};

export type WorldObjectInventoryPayload = WorldObjectApiCommonPayload & {
  amount: number;
  inventory_key: string;
  source_object_key: string;
  source_kind: string;
};

export function inventoryKeyForWorldObject(obj: Pick<WorldObject, "type" | "frame">): string {
  const typeHex = (Number(obj.type) & 0x3ff).toString(16).padStart(3, "0");
  const frameHex = (Number(obj.frame) & 0x3f).toString(16).padStart(2, "0");
  return `0x${typeHex}:0x${frameHex}`;
}

export function worldObjectApiCommonPayload(obj: WorldObject): WorldObjectApiCommonPayload {
  return {
    object_key: String(obj.object_key || ""),
    status: Number(obj.status) & 0xff,
    coord_use: coordUseOfStatus(obj.status),
    despawn_at_ms: Number(obj.despawn_at_ms) > 0 ? Math.floor(Number(obj.despawn_at_ms)) : 0,
    dropped_at_ms: Number(obj.dropped_at_ms) > 0 ? Math.floor(Number(obj.dropped_at_ms)) : 0,
    holder_kind: String(obj.holder_kind || "none"),
    holder_id: String(obj.holder_id || ""),
    holder_key: String(obj.holder_key || ""),
    type: Number(obj.type) & 0x3ff,
    frame: Number(obj.frame) & 0x3f,
    tile_id: Number(obj.tile_id) & 0xffff,
    x: Number(obj.x) | 0,
    y: Number(obj.y) | 0,
    z: Number(obj.z) | 0
  };
}

export function worldObjectInteractionPayload(
  obj: WorldObject,
  args: {
    assocChain?: ReadonlyArray<unknown>;
    blockedBy?: unknown;
    rootAnchorKey?: unknown;
    sourceObject?: Pick<WorldObject, "object_key"> | null;
  } = {}
): WorldObjectInteractionPayload {
  return {
    ...worldObjectApiCommonPayload(obj),
    source_object_key: args.sourceObject
      ? String(args.sourceObject.object_key || "")
      : String(obj.source_object_key || ""),
    assoc_chain: Array.isArray(args.assocChain) ? args.assocChain.map((entry) => String(entry)) : [],
    root_anchor_key: String(args.rootAnchorKey || ""),
    blocked_by: String(args.blockedBy || "")
  };
}

export function worldObjectTakeInventoryPayload(
  obj: WorldObject,
  sourceObject: Pick<WorldObject, "object_key"> | null
): WorldObjectTakeInventoryPayload {
  return {
    ...worldObjectApiCommonPayload(obj),
    amount: Number(obj.amount) & 0xffff,
    inventory_key: inventoryKeyForWorldObject(obj),
    source_object_key: sourceObject ? String(sourceObject.object_key || "") : "",
    source_kind: String(obj.source_kind || "")
  };
}

function sourceObjectKeyForClone(obj: WorldObject): string {
  const explicit = String(obj.source_object_key || "").trim();
  if (explicit) {
    return explicit;
  }
  if (String(obj.source_kind || "") !== "spawned") {
    return "";
  }
  return String(obj.object_key || "").split(":")[1] || "";
}

export function worldObjectInventoryPayload(obj: WorldObject): WorldObjectInventoryPayload {
  return {
    ...worldObjectApiCommonPayload(obj),
    amount: Number(obj.amount) & 0xffff,
    inventory_key: inventoryKeyForWorldObject(obj),
    source_object_key: sourceObjectKeyForClone(obj),
    source_kind: String(obj.source_kind || "")
  };
}
