import type { SpawnedWorldObjectDelta, WorldObject, WorldObjectRuntimeState, WorldObjectStateContainer } from "./world_object_types.ts";
import { coordUseOfStatus } from "../common/u6_object_constants.ts";

export const DEFAULT_PICKUP_RESPAWN_MS = 10 * 60 * 1000;
export const LOOT_PICKUP_RESPAWN_MS = 60 * 60 * 1000;

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

export function isBaselineWorldObject(obj: Pick<WorldObject, "source_kind"> | null | undefined): boolean {
  const kind = String(obj?.source_kind || "baseline");
  return kind === "baseline" || kind === "baseline_moved" || kind === "";
}

export function inventoryCloneKeyForTake(
  state: Pick<WorldObjectRuntimeState, "worldInteractionLog"> | null | undefined,
  target: Pick<WorldObject, "object_key"> | null | undefined,
  actorId: unknown
): string {
  const nextSeq = (Number(state?.worldInteractionLog?.seq || 0) + 1) >>> 0;
  const source = String(target?.object_key || "object").replace(/[^a-zA-Z0-9:_-]+/g, "_");
  const actor = String(actorId || "actor").replace(/[^a-zA-Z0-9:_-]+/g, "_");
  return `inv:${source}:${actor}:${nextSeq}`;
}

export function spawnedWorldObjectDeltaFromObject(obj: WorldObject): SpawnedWorldObjectDelta {
  return {
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
  };
}

export function pushSpawnedWorldObject(state: WorldObjectStateContainer, obj: WorldObject): void {
  state.worldObjects.deltas.spawned.push(spawnedWorldObjectDeltaFromObject(obj));
}

export type WorldObjectApiCommonPayload = {
  coord_use: number;
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
  source_object_key: string;
};

export type WorldObjectInventoryPayload = WorldObjectApiCommonPayload & {
  amount: number;
  source_kind: string;
};

export function worldObjectApiCommonPayload(obj: WorldObject): WorldObjectApiCommonPayload {
  return {
    object_key: String(obj.object_key || ""),
    status: Number(obj.status) & 0xff,
    coord_use: coordUseOfStatus(obj.status),
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
    assocChain?: unknown[];
    blockedBy?: unknown;
    rootAnchorKey?: unknown;
    sourceObject?: Pick<WorldObject, "object_key"> | null;
  } = {}
): WorldObjectInteractionPayload {
  return {
    ...worldObjectApiCommonPayload(obj),
    source_object_key: args.sourceObject ? String(args.sourceObject.object_key || "") : "",
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
    source_object_key: sourceObject ? String(sourceObject.object_key || "") : ""
  };
}

export function worldObjectInventoryPayload(obj: WorldObject): WorldObjectInventoryPayload {
  return {
    ...worldObjectApiCommonPayload(obj),
    amount: Number(obj.amount) & 0xffff,
    source_kind: String(obj.source_kind || "")
  };
}
