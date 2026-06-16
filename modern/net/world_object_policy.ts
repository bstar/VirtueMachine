import type { SpawnedWorldObjectDelta, WorldObject, WorldObjectRuntimeState, WorldObjectStateContainer } from "./world_object_types.ts";
import {
  coordUseOfStatus,
  isU6PortableObjectTypeRuntime
} from "../common/u6_object_constants.ts";
import {
  normalizeWorldObjectInteractionVerbRuntime,
  type WorldObjectInteractionVerb
} from "../common/world_interaction_contract.ts";
import {
  normalizeWorldObjectHolderKindRuntime,
  type WorldObjectHolderKind
} from "../common/world_object_contract.ts";

export const DEFAULT_PICKUP_RESPAWN_MS = 10 * 60 * 1000;
export const DEFAULT_DROPPED_CLONE_DESPAWN_MS = 10 * 60 * 1000;
export const LOOT_PICKUP_RESPAWN_MS = 60 * 60 * 1000;

export interface PickupRespawnPolicy {
  policy: string;
  respawn_ms: number;
}

export interface WorldObjectLifecycleExpirationRuntime {
  changed: boolean;
  expired_object_keys: string[];
  matured_respawn_keys: string[];
}

export interface BaselineTakeCloneRuntime {
  clone: WorldObject;
  respawn: {
    due_at_ms: number;
    policy: string;
    respawn_ms: number;
    source_object_key: string;
  };
  source: WorldObject;
}

export interface SpawnedObjectLifecycleMutationRuntime {
  changed: boolean;
  despawn_at_ms: number;
  dropped_at_ms: number;
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
  return isU6PortableObjectTypeRuntime(obj?.type, typeWeights);
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

export function sourceObjectKeyFromInventoryCloneKeyRuntime(objectKey: unknown): string {
  const match = /^inv:([^:]+):/.exec(String(objectKey || ""));
  return match ? match[1] : "";
}

export function normalizeWorldObjectAmountRuntime(amount: unknown): number {
  const n = Math.floor(Number(amount) || 0);
  return Math.max(0, Math.min(0xffff, n));
}

function sourceObjectKeyForSpawnedObject(obj: Pick<WorldObject, "object_key" | "source_kind" | "source_object_key">): string {
  const explicit = String(obj.source_object_key || "").trim();
  if (explicit) {
    return explicit;
  }
  if (!String(obj.source_kind || "").startsWith("spawned")) {
    return "";
  }
  return sourceObjectKeyFromInventoryCloneKeyRuntime(obj.object_key);
}

export function spawnedWorldObjectDeltaFromObject(obj: WorldObject): SpawnedWorldObjectDelta {
  return {
    object_key: String(obj.object_key || ""),
    source_object_key: sourceObjectKeyForSpawnedObject(obj),
    despawn_at_ms: Number.isFinite(Number(obj.despawn_at_ms)) ? Math.floor(Number(obj.despawn_at_ms)) : 0,
    dropped_at_ms: Number.isFinite(Number(obj.dropped_at_ms)) ? Math.floor(Number(obj.dropped_at_ms)) : 0,
    source_area: Number(obj.source_area) >>> 0,
    source_index: Number(obj.source_index) >>> 0,
    status: Number(obj.status) & 0xff,
    shape_type: Number(obj.shape_type) & 0xffff,
    amount: normalizeWorldObjectAmountRuntime(obj.amount),
    type: Number(obj.type) & 0x3ff,
    frame: Number(obj.frame) & 0x3f,
    tile_id: Number(obj.tile_id) & 0xffff,
    x: Number(obj.x) | 0,
    y: Number(obj.y) | 0,
    z: Number(obj.z) | 0,
    holder_kind: normalizeWorldObjectHolderKindRuntime(obj.holder_kind),
    holder_id: String(obj.holder_id || ""),
    holder_key: String(obj.holder_key || "")
  };
}

export function pushSpawnedWorldObject(state: WorldObjectStateContainer, obj: WorldObject): void {
  state.worldObjects.deltas.spawned.push(spawnedWorldObjectDeltaFromObject(obj));
}

function reparentContainedChildrenToClone(
  state: WorldObjectRuntimeState & WorldObjectStateContainer,
  sourceObjectKey: string,
  cloneObjectKey: string
): void {
  if (!sourceObjectKey || !cloneObjectKey) {
    return;
  }
  for (const child of state.worldObjects.active || []) {
    const childKey = String(child?.object_key || "");
    if (!child || childKey === sourceObjectKey) {
      continue;
    }
    if (normalizeWorldObjectHolderKindRuntime(child.holder_kind) !== "object") {
      continue;
    }
    const holderRef = String(child.holder_key || child.holder_id || "");
    if (holderRef !== sourceObjectKey) {
      continue;
    }
    child.holder_id = cloneObjectKey;
    child.holder_key = cloneObjectKey;
    const spawned = (state.worldObjects.deltas.spawned || []).find((obj) => String(obj.object_key || "") === childKey);
    if (spawned) {
      spawned.holder_id = cloneObjectKey;
      spawned.holder_key = cloneObjectKey;
      continue;
    }
    if (childKey) {
      state.worldObjects.deltas.moved[childKey] = {
        x: Number(child.x) | 0,
        y: Number(child.y) | 0,
        z: Number(child.z) | 0,
        status: Number.isFinite(Number(child.status)) ? (Number(child.status) & 0xff) : null,
        holder_kind: "object",
        holder_id: cloneObjectKey,
        holder_key: cloneObjectKey
      };
    }
  }
}

export function applyBaselineTakeCloneRuntime(
  state: WorldObjectRuntimeState & WorldObjectStateContainer,
  target: WorldObject,
  actorId: unknown,
  patch: Partial<WorldObject> | null | undefined,
  takenAtMs: number
): BaselineTakeCloneRuntime {
  const sourceObjectKey = String(target.object_key || "");
  const clone = {
    ...target,
    despawn_at_ms: 0,
    dropped_at_ms: 0,
    object_key: inventoryCloneKeyForTake(state, target, actorId),
    source_object_key: sourceObjectKey,
    source_kind: "spawned"
  };
  Object.assign(clone, patch || {});
  reparentContainedChildrenToClone(state, sourceObjectKey, String(clone.object_key || ""));
  pushSpawnedWorldObject(state, clone);
  state.worldObjects.active.push(clone);

  const policy = pickupRespawnPolicyForObject(target);
  state.worldObjects.deltas.removed[sourceObjectKey] = true;
  state.worldObjects.deltas.respawns[sourceObjectKey] = {
    due_at_ms: takenAtMs + policy.respawn_ms,
    taken_at_ms: takenAtMs,
    respawn_ms: policy.respawn_ms,
    policy: policy.policy
  };
  state.worldObjects.active = state.worldObjects.active.filter(
    (obj) => String(obj.object_key || "") !== sourceObjectKey
  );
  return {
    clone,
    source: target,
    respawn: {
      source_object_key: sourceObjectKey,
      due_at_ms: takenAtMs + policy.respawn_ms,
      respawn_ms: policy.respawn_ms,
      policy: policy.policy
    }
  };
}

export function applySpawnedObjectLifecycleForInteractionRuntime(
  target: WorldObject,
  verb: WorldObjectInteractionVerb | unknown,
  nowMs: number
): SpawnedObjectLifecycleMutationRuntime {
  if (!String(target.source_kind || "").startsWith("spawned")) {
    return {
      changed: false,
      dropped_at_ms: Number(target.dropped_at_ms) > 0 ? Math.floor(Number(target.dropped_at_ms)) : 0,
      despawn_at_ms: Number(target.despawn_at_ms) > 0 ? Math.floor(Number(target.despawn_at_ms)) : 0
    };
  }
  const action = normalizeWorldObjectInteractionVerbRuntime(verb);
  const beforeDropped = Number(target.dropped_at_ms) > 0 ? Math.floor(Number(target.dropped_at_ms)) : 0;
  const beforeDespawn = Number(target.despawn_at_ms) > 0 ? Math.floor(Number(target.despawn_at_ms)) : 0;
  if (action === "drop") {
    const droppedAtMs = Math.max(0, Math.floor(Number(nowMs) || 0));
    target.dropped_at_ms = droppedAtMs;
    target.despawn_at_ms = droppedAtMs + DEFAULT_DROPPED_CLONE_DESPAWN_MS;
  } else if (action === "take" || action === "put" || action === "equip") {
    target.dropped_at_ms = 0;
    target.despawn_at_ms = 0;
  }
  const afterDropped = Number(target.dropped_at_ms) > 0 ? Math.floor(Number(target.dropped_at_ms)) : 0;
  const afterDespawn = Number(target.despawn_at_ms) > 0 ? Math.floor(Number(target.despawn_at_ms)) : 0;
  return {
    changed: beforeDropped !== afterDropped || beforeDespawn !== afterDespawn,
    dropped_at_ms: afterDropped,
    despawn_at_ms: afterDespawn
  };
}

export function expireDueWorldObjectLifecycleDeltasRuntime(
  state: WorldObjectStateContainer,
  nowMs: number
): WorldObjectLifecycleExpirationRuntime {
  const deltas = state.worldObjects.deltas;
  const respawns = deltas.respawns || {};
  const spawned = deltas.spawned || [];
  const maturedRespawnKeys = Object.keys(respawns).filter((key) => Number(respawns[key]?.due_at_ms) <= nowMs);
  const expiredObjectKeys = spawned
    .filter((obj) => {
      const despawnAtMs = Number(obj.despawn_at_ms) || 0;
      return despawnAtMs > 0 && despawnAtMs <= nowMs;
    })
    .map((obj) => String(obj.object_key || ""))
    .filter(Boolean);
  const activeSpawned = spawned.filter((obj) => {
    const despawnAtMs = Number(obj.despawn_at_ms) || 0;
    return despawnAtMs <= 0 || despawnAtMs > nowMs;
  });
  if (maturedRespawnKeys.length === 0 && activeSpawned.length === spawned.length) {
    return {
      changed: false,
      expired_object_keys: [],
      matured_respawn_keys: []
    };
  }
  for (const key of maturedRespawnKeys) {
    delete deltas.removed[key];
    delete deltas.respawns[key];
  }
  deltas.spawned = activeSpawned;
  return {
    changed: true,
    expired_object_keys: expiredObjectKeys,
    matured_respawn_keys: maturedRespawnKeys
  };
}

export type WorldObjectApiCommonPayload = {
  coord_use: number;
  despawn_at_ms: number;
  dropped_at_ms: number;
  frame: number;
  holder_id: string;
  holder_key: string;
  holder_kind: WorldObjectHolderKind;
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
    holder_kind: normalizeWorldObjectHolderKindRuntime(obj.holder_kind),
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
    amount: normalizeWorldObjectAmountRuntime(obj.amount),
    inventory_key: inventoryKeyForWorldObject(obj),
    source_object_key: sourceObject ? String(sourceObject.object_key || "") : "",
    source_kind: String(obj.source_kind || "")
  };
}

function sourceObjectKeyForClone(obj: WorldObject): string {
  return sourceObjectKeyForSpawnedObject(obj);
}

export function worldObjectInventoryPayload(obj: WorldObject): WorldObjectInventoryPayload {
  return {
    ...worldObjectApiCommonPayload(obj),
    amount: normalizeWorldObjectAmountRuntime(obj.amount),
    inventory_key: inventoryKeyForWorldObject(obj),
    source_object_key: sourceObjectKeyForClone(obj),
    source_kind: String(obj.source_kind || "")
  };
}
