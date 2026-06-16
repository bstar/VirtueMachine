import { coordUseOfStatus } from "../common/u6_object_constants.ts";
import { normalizeWorldObjectHolderKindRuntime } from "../common/world_object_contract.ts";
import {
  DEFAULT_DROPPED_CLONE_DESPAWN_MS,
  DEFAULT_PICKUP_RESPAWN_MS,
  normalizeWorldObjectAmountRuntime,
  sourceObjectKeyFromInventoryCloneKeyRuntime
} from "./world_object_policy.ts";
import type {
  MovedWorldObjectDelta,
  RespawnWorldObjectDelta,
  SpawnedWorldObjectDelta,
  WorldObject,
  WorldObjectDeltas,
  WorldObjectState,
  WorldObjectStateContainer
} from "./world_object_types.ts";

type WorldObjectDeltasSourceRuntime = {
  moved?: unknown;
  removed?: unknown;
  respawns?: unknown;
  spawned?: unknown;
};

type WorldObjectRemovedDeltaMapSourceRuntime = {
  [objectKey: string]: unknown;
};

type WorldObjectMovedDeltaMapSourceRuntime = {
  [objectKey: string]: unknown;
};

type WorldObjectRespawnDeltaMapSourceRuntime = {
  [objectKey: string]: unknown;
};

type MovedWorldObjectDeltaSourceRuntime = {
  holder_id?: unknown;
  holder_key?: unknown;
  holder_kind?: unknown;
  status?: unknown;
  x?: unknown;
  y?: unknown;
  z?: unknown;
};

type SpawnedWorldObjectDeltaSourceRuntime = MovedWorldObjectDeltaSourceRuntime & {
  amount?: unknown;
  despawn_at_ms?: unknown;
  dropped_at_ms?: unknown;
  frame?: unknown;
  object_key?: unknown;
  shape_type?: unknown;
  source_area?: unknown;
  source_index?: unknown;
  source_object_key?: unknown;
  tile_id?: unknown;
  type?: unknown;
};

type RespawnWorldObjectDeltaSourceRuntime = {
  due_at_ms?: unknown;
  policy?: unknown;
  respawn_ms?: unknown;
  taken_at_ms?: unknown;
};

export type WorldObjectMetaRuntime = {
  active_count: number;
  baseline_count: number;
  baseline_dir: string;
  delta_moved_count: number;
  delta_removed_count: number;
  delta_spawned_count: number;
  files_loaded: number;
  hidden_objects: Array<{
    due_at_ms: number;
    object_key: string;
    policy: string;
    respawn_ms: number;
  }>;
  loaded_at?: string;
  source_dir?: string;
};

export type WorldObjectInventorySafetyIssueRuntime = {
  code: string;
  object_key: string;
};

function parseU16LE(bytes: Uint8Array, off: number): number {
  return (bytes[off] | (bytes[off + 1] << 8)) >>> 0;
}

function isObjectSourceRuntime(value: unknown): value is object {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asWorldObjectDeltasSourceRuntime(value: unknown): WorldObjectDeltasSourceRuntime | null {
  return isObjectSourceRuntime(value) ? value as WorldObjectDeltasSourceRuntime : null;
}

function asWorldObjectRemovedDeltaMapSourceRuntime(value: unknown): WorldObjectRemovedDeltaMapSourceRuntime | null {
  return isObjectSourceRuntime(value) ? value as WorldObjectRemovedDeltaMapSourceRuntime : null;
}

function asWorldObjectMovedDeltaMapSourceRuntime(value: unknown): WorldObjectMovedDeltaMapSourceRuntime | null {
  return isObjectSourceRuntime(value) ? value as WorldObjectMovedDeltaMapSourceRuntime : null;
}

function asWorldObjectRespawnDeltaMapSourceRuntime(value: unknown): WorldObjectRespawnDeltaMapSourceRuntime | null {
  return isObjectSourceRuntime(value) ? value as WorldObjectRespawnDeltaMapSourceRuntime : null;
}

function asMovedWorldObjectDeltaSourceRuntime(value: unknown): MovedWorldObjectDeltaSourceRuntime | null {
  return isObjectSourceRuntime(value) ? value as MovedWorldObjectDeltaSourceRuntime : null;
}

function asSpawnedWorldObjectDeltaSourceRuntime(value: unknown): SpawnedWorldObjectDeltaSourceRuntime | null {
  return isObjectSourceRuntime(value) ? value as SpawnedWorldObjectDeltaSourceRuntime : null;
}

function asRespawnWorldObjectDeltaSourceRuntime(value: unknown): RespawnWorldObjectDeltaSourceRuntime | null {
  return isObjectSourceRuntime(value) ? value as RespawnWorldObjectDeltaSourceRuntime : null;
}

function decodePackedCoord(raw0: number, raw1: number, raw2: number): { x: number; y: number; z: number } {
  return {
    x: (raw0 | ((raw1 & 0x03) << 8)) >>> 0,
    y: ((raw1 >> 2) | ((raw2 & 0x0f) << 6)) >>> 0,
    z: ((raw2 >> 4) & 0x0f) >>> 0
  };
}

export function parseBaseTileMapRuntime(bytes: Uint8Array | Buffer | null | undefined): Uint16Array {
  const map = new Uint16Array(0x400);
  if (!bytes) {
    return map;
  }
  const n = Math.min(0x400, Math.floor(bytes.length / 2));
  for (let i = 0; i < n; i += 1) {
    map[i] = parseU16LE(bytes, i * 2) & 0xffff;
  }
  return map;
}

export function parseObjBlkRecordsRuntime(
  bytes: Uint8Array | Buffer | null | undefined,
  areaId: number,
  baseTileMap: Uint16Array | readonly number[]
): WorldObject[] {
  if (!bytes || bytes.length < 2) {
    return [];
  }
  let count = parseU16LE(bytes, 0);
  const maxCount = Math.min(0x0c00, Math.floor((bytes.length - 2) / 8));
  if (count > maxCount) {
    count = maxCount;
  }
  const decoded: WorldObject[] = [];
  for (let i = 0; i < count; i += 1) {
    const off = 2 + (i * 8);
    const status = bytes[off + 0] >>> 0;
    const pos = decodePackedCoord(bytes[off + 1], bytes[off + 2], bytes[off + 3]);
    const shapeType = parseU16LE(bytes, off + 4);
    const type = shapeType & 0x03ff;
    const frame = (shapeType >> 10) & 0x003f;
    const amount = parseU16LE(bytes, off + 6);
    const baseTile = baseTileMap[type] ?? 0;
    const tileId = (baseTile + frame) & 0xffff;
    const coordUse = status & 0x18;
    const assocIndex = ((bytes[off + 1] | (bytes[off + 2] << 8)) & 0xffff) >>> 0;
    decoded.push({
      index: i >>> 0,
      coord_use: coordUse >>> 0,
      assoc_index: assocIndex >>> 0,
      object_key: `a${(areaId >>> 0).toString(16).padStart(2, "0")}i${i.toString(16).padStart(3, "0")}`,
      source_area: areaId >>> 0,
      source_index: i >>> 0,
      status: status & 0xff,
      shape_type: shapeType & 0xffff,
      amount: amount & 0xffff,
      type: type & 0x3ff,
      frame: frame & 0x3f,
      tile_id: tileId & 0xffff,
      x: pos.x & 0x3ff,
      y: pos.y & 0x3ff,
      z: pos.z & 0x0f,
      holder_kind: "none",
      holder_id: "",
      holder_key: ""
    });
  }
  for (const row of decoded) {
    const ai = Number(row.assoc_index) | 0;
    if (ai >= 0 && ai < decoded.length) {
      row.assoc_obj = decoded[ai];
    }
  }
  const childCounts = new Uint16Array(count);
  const child0010Counts = new Uint16Array(count);
  for (const row of decoded) {
    if ((Number(row.coord_use) | 0) === 0) {
      continue;
    }
    const ai = Number(row.assoc_index) | 0;
    if (ai < 0 || ai >= count) {
      continue;
    }
    childCounts[ai] = (childCounts[ai] + 1) & 0xffff;
    if ((Number(row.status) & 0x10) !== 0) {
      child0010Counts[ai] = (child0010Counts[ai] + 1) & 0xffff;
    }
  }
  const out: WorldObject[] = [];
  const ordered = decoded.slice().sort((a, b) => {
    const aUse = (Number(a.status) & 0x18) >>> 0;
    const bUse = (Number(b.status) & 0x18) >>> 0;
    if (aUse !== 0 && bUse === 0) return -1;
    if (bUse !== 0 && aUse === 0) return 1;
    if ((Number(a.y) | 0) !== (Number(b.y) | 0)) return (Number(a.y) | 0) - (Number(b.y) | 0);
    if ((Number(a.x) | 0) !== (Number(b.x) | 0)) return (Number(a.x) | 0) - (Number(b.x) | 0);
    if ((Number(a.z) | 0) !== (Number(b.z) | 0)) return (Number(b.z) | 0) - (Number(a.z) | 0);
    if (isStatus0010(a.status) !== isStatus0010(b.status)) {
      return isStatus0010(a.status) ? -1 : 1;
    }
    if ((Number(a.source_area) | 0) !== (Number(b.source_area) | 0)) return (Number(a.source_area) | 0) - (Number(b.source_area) | 0);
    if ((Number(a.source_index) | 0) !== (Number(b.source_index) | 0)) return (Number(a.source_index) | 0) - (Number(b.source_index) | 0);
    return (Number(a.index) | 0) - (Number(b.index) | 0);
  });
  const legacyOrderByIndex = new Int32Array(count);
  legacyOrderByIndex.fill(-1);
  for (let i = 0; i < ordered.length; i += 1) {
    const idx = Number(ordered[i].index) | 0;
    if (idx >= 0 && idx < count) {
      legacyOrderByIndex[idx] = i;
    }
  }
  for (const row of decoded) {
    if ((Number(row.coord_use) | 0) !== 0) {
      continue;
    }
    out.push({
      ...row,
      legacy_order: legacyOrderByIndex[Number(row.index) | 0] | 0,
      assoc_child_count: Number(childCounts[Number(row.index) | 0] || 0) >>> 0,
      assoc_child_0010_count: Number(child0010Counts[Number(row.index) | 0] || 0) >>> 0
    });
  }
  return out;
}

function repairSpawnedCloneIdentity(
  spawned: SpawnedWorldObjectDelta,
  baselineByKey: Map<string, WorldObject>,
  nowMs: number
): SpawnedWorldObjectDelta {
  const sourceObjectKey = String(spawned.source_object_key || sourceObjectKeyFromInventoryCloneKeyRuntime(spawned.object_key)).trim();
  const isLooseInventoryClone = String(spawned.object_key || "").startsWith("inv:")
    && coordUseOfStatus(spawned.status) === 0
    && normalizeWorldObjectHolderKindRuntime(spawned.holder_kind) === "none";
  const migratedDropTimestamps = isLooseInventoryClone && !(Number(spawned.despawn_at_ms) > 0)
    ? {
        dropped_at_ms: Math.floor(nowMs),
        despawn_at_ms: Math.floor(nowMs + DEFAULT_DROPPED_CLONE_DESPAWN_MS)
      }
    : {};
  if (!sourceObjectKey) {
    return { ...spawned, ...migratedDropTimestamps };
  }
  const parent = baselineByKey.get(sourceObjectKey);
  if (!parent) {
    return { ...spawned, source_object_key: sourceObjectKey, ...migratedDropTimestamps };
  }
  const sourceMatchesParent = (Number(spawned.source_area) >>> 0) === (Number(parent.source_area) >>> 0)
    && (Number(spawned.source_index) >>> 0) === (Number(parent.source_index) >>> 0);
  if (!sourceMatchesParent) {
    return { ...spawned, source_object_key: sourceObjectKey, ...migratedDropTimestamps };
  }
  return {
    ...spawned,
    ...migratedDropTimestamps,
    source_object_key: sourceObjectKey,
    shape_type: Number(parent.shape_type) & 0xffff,
    type: Number(parent.type) & 0x3ff,
    frame: Number(parent.frame) & 0x3f,
    tile_id: Number(parent.tile_id) & 0xffff
  };
}

function spawnedDeltaFromRecord(value: SpawnedWorldObjectDeltaSourceRuntime, index: number): SpawnedWorldObjectDelta {
  const objectKey = String(value.object_key || `spawn_${index}`);
  const sourceObjectKey = String(value.source_object_key || sourceObjectKeyFromInventoryCloneKeyRuntime(objectKey));
  return {
    object_key: objectKey,
    source_object_key: sourceObjectKey,
    despawn_at_ms: Number.isFinite(Number(value.despawn_at_ms)) ? Math.max(0, Math.floor(Number(value.despawn_at_ms))) : 0,
    dropped_at_ms: Number.isFinite(Number(value.dropped_at_ms)) ? Math.max(0, Math.floor(Number(value.dropped_at_ms))) : 0,
    source_area: Number(value.source_area) >>> 0,
    source_index: Number(value.source_index) >>> 0,
    status: Number(value.status) & 0xff,
    shape_type: Number(value.shape_type) & 0xffff,
    amount: normalizeWorldObjectAmountRuntime(value.amount),
    type: Number(value.type) & 0x3ff,
    frame: Number(value.frame) & 0x3f,
    tile_id: Number(value.tile_id) & 0xffff,
    x: Number(value.x) | 0,
    y: Number(value.y) | 0,
    z: Number(value.z) | 0,
    holder_kind: normalizeWorldObjectHolderKindRuntime(value.holder_kind),
    holder_id: String(value.holder_id || ""),
    holder_key: String(value.holder_key || "")
  };
}

export function spawnedWorldObjectDeltaFromObjectRuntime(obj: WorldObject): SpawnedWorldObjectDelta {
  return {
    object_key: String(obj.object_key || ""),
    source_object_key: String(obj.source_object_key || sourceObjectKeyFromInventoryCloneKeyRuntime(obj.object_key)),
    despawn_at_ms: Number(obj.despawn_at_ms) > 0 ? Math.floor(Number(obj.despawn_at_ms)) : 0,
    dropped_at_ms: Number(obj.dropped_at_ms) > 0 ? Math.floor(Number(obj.dropped_at_ms)) : 0,
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

export function normalizeWorldObjectDeltas(raw: unknown): WorldObjectDeltas {
  const out: WorldObjectDeltas = {
    schema_version: 1,
    removed: {},
    moved: {},
    spawned: [],
    respawns: {}
  };
  const src = asWorldObjectDeltasSourceRuntime(raw);
  if (!src) {
    return out;
  }
  const removed = asWorldObjectRemovedDeltaMapSourceRuntime(src.removed);
  if (removed) {
    for (const [key, value] of Object.entries(removed)) {
      if (value) {
        out.removed[String(key)] = true;
      }
    }
  }
  const moved = asWorldObjectMovedDeltaMapSourceRuntime(src.moved);
  if (moved) {
    for (const [key, value] of Object.entries(moved)) {
      const entry = asMovedWorldObjectDeltaSourceRuntime(value);
      if (!entry) {
        continue;
      }
      out.moved[String(key)] = {
        x: Number(entry.x) | 0,
        y: Number(entry.y) | 0,
        z: Number(entry.z) | 0,
        status: Number.isFinite(Number(entry.status)) ? (Number(entry.status) & 0xff) : null,
        holder_kind: normalizeWorldObjectHolderKindRuntime(entry.holder_kind),
        holder_id: String(entry.holder_id || ""),
        holder_key: String(entry.holder_key || "")
      };
    }
  }
  if (Array.isArray(src.spawned)) {
    out.spawned = src.spawned
      .map((value, index) => {
        const entry = asSpawnedWorldObjectDeltaSourceRuntime(value);
        return entry ? spawnedDeltaFromRecord(entry, index) : null;
      })
      .filter((value): value is SpawnedWorldObjectDelta => !!value);
  }
  const respawns = asWorldObjectRespawnDeltaMapSourceRuntime(src.respawns);
  if (respawns) {
    for (const [key, value] of Object.entries(respawns)) {
      const entry = asRespawnWorldObjectDeltaSourceRuntime(value);
      if (!entry) {
        continue;
      }
      const dueAtMs = Number(entry.due_at_ms);
      const takenAtMs = Number(entry.taken_at_ms);
      const respawnMs = Number(entry.respawn_ms);
      if (!Number.isFinite(dueAtMs) || dueAtMs <= 0) {
        continue;
      }
      out.respawns[String(key)] = {
        due_at_ms: Math.floor(dueAtMs),
        taken_at_ms: Number.isFinite(takenAtMs) ? Math.floor(takenAtMs) : 0,
        respawn_ms: Number.isFinite(respawnMs) ? Math.max(0, Math.floor(respawnMs)) : DEFAULT_PICKUP_RESPAWN_MS,
        policy: String(entry.policy || "default")
      };
    }
  }
  return out;
}

export function buildWorldObjectStateRuntime(args: {
  baseline: {
    baseline_count?: number;
    files_loaded?: number;
    loaded_at?: string;
    objects?: WorldObject[];
    source_dir?: string;
    [key: string]: unknown;
  };
  buildObjectAnchorIndex: (objects: WorldObject[]) => Map<string, WorldObject[]>;
  nowMs: number;
  rawDeltas: unknown;
  terrainType: Uint8Array;
  tileFlags: Uint8Array;
  typeWeights?: Uint8Array;
}): WorldObjectState {
  const baselineObjects = Array.isArray(args.baseline.objects) ? args.baseline.objects : [];
  const deltas = normalizeWorldObjectDeltas(args.rawDeltas);
  const nowMs = Number(args.nowMs);
  const baselineByKey = new Map<string, WorldObject>();
  for (const b of baselineObjects) {
    const key = String(b.object_key || "");
    if (key) {
      baselineByKey.set(key, b);
    }
  }
  deltas.spawned = deltas.spawned
    .filter((spawned) => {
      const despawnAtMs = Number(spawned.despawn_at_ms) || 0;
      return despawnAtMs <= 0 || despawnAtMs > nowMs;
    })
    .map((spawned) => repairSpawnedCloneIdentity(spawned, baselineByKey, nowMs));
  const active: WorldObject[] = [];
  for (const b of baselineObjects) {
    const objectKey = String(b.object_key || "");
    const respawn = deltas.respawns[objectKey];
    const hiddenByPickup = deltas.removed[objectKey]
      && !(respawn && Number(respawn.due_at_ms) <= nowMs);
    if (hiddenByPickup) {
      continue;
    }
    const moved = deltas.moved[objectKey];
    if (moved) {
      active.push({
        ...b,
        x: moved.x | 0,
        y: moved.y | 0,
        z: moved.z | 0,
        status: Number.isFinite(Number(moved.status)) ? (Number(moved.status) & 0xff) : (Number(b.status) & 0xff),
        holder_kind: normalizeWorldObjectHolderKindRuntime(moved.holder_kind || b.holder_kind),
        holder_id: String(moved.holder_id || b.holder_id || ""),
        holder_key: String(moved.holder_key || b.holder_key || ""),
        source_kind: "baseline_moved"
      });
    } else {
      active.push({ ...b, source_kind: "baseline" });
    }
  }
  for (const s of deltas.spawned) {
    active.push({ ...s, source_kind: "spawned" });
  }
  active.sort(compareLegacyWorldObjectOrder);
  return {
    baseline: args.baseline,
    tileFlags: args.tileFlags,
    terrainType: args.terrainType,
    typeWeights: args.typeWeights,
    deltas,
    active,
    activeByAnchor: args.buildObjectAnchorIndex(active)
  };
}

export function inventorySafetyIssuesForSpawnedWorldObjectsRuntime(
  spawnedObjects: readonly SpawnedWorldObjectDelta[] | null | undefined
): WorldObjectInventorySafetyIssueRuntime[] {
  const issues: WorldObjectInventorySafetyIssueRuntime[] = [];
  for (const obj of spawnedObjects || []) {
    if (coordUseOfStatus(obj.status) !== 0x10) {
      continue;
    }
    const objectKey = String(obj.object_key || "").trim();
    const sourceObjectKey = String(obj.source_object_key || "").trim();
    const holderKind = normalizeWorldObjectHolderKindRuntime(obj.holder_kind);
    const holderId = String(obj.holder_id || "").trim();
    if (!objectKey.startsWith("inv:")) {
      issues.push({ code: "held_inventory_key_not_clone", object_key: objectKey });
    }
    if (!sourceObjectKey) {
      issues.push({ code: "held_inventory_missing_source", object_key: objectKey });
    }
    if (objectKey && sourceObjectKey && objectKey === sourceObjectKey) {
      issues.push({ code: "held_inventory_aliases_source", object_key: objectKey });
    }
    if (holderKind !== "npc" || !holderId) {
      issues.push({ code: "held_inventory_missing_holder", object_key: objectKey });
    }
    if (Number(obj.dropped_at_ms) > 0 || Number(obj.despawn_at_ms) > 0) {
      issues.push({ code: "held_inventory_has_drop_timer", object_key: objectKey });
    }
  }
  return issues;
}

function isStatus0010(status: unknown): boolean {
  return (Number(status) & 0x10) !== 0;
}

export function compareLegacyWorldObjectOrder(a: WorldObject, b: WorldObject): number {
  if ((Number(a.legacy_order) | 0) !== (Number(b.legacy_order) | 0)) {
    return (Number(a.legacy_order) | 0) - (Number(b.legacy_order) | 0);
  }
  const aUse = coordUseOfStatus(a.status);
  const bUse = coordUseOfStatus(b.status);
  if (aUse !== 0 && bUse === 0) {
    return -1;
  }
  if (bUse !== 0 && aUse === 0) {
    return 1;
  }
  if ((Number(a.y) | 0) !== (Number(b.y) | 0)) {
    return (Number(a.y) | 0) - (Number(b.y) | 0);
  }
  if ((Number(a.x) | 0) !== (Number(b.x) | 0)) {
    return (Number(a.x) | 0) - (Number(b.x) | 0);
  }
  if ((Number(a.z) | 0) !== (Number(b.z) | 0)) {
    return (Number(b.z) | 0) - (Number(a.z) | 0);
  }
  if (isStatus0010(a.status) !== isStatus0010(b.status)) {
    return isStatus0010(a.status) ? -1 : 1;
  }
  if ((Number(a.source_area) | 0) !== (Number(b.source_area) | 0)) {
    return (Number(a.source_area) | 0) - (Number(b.source_area) | 0);
  }
  if ((Number(a.source_index) | 0) !== (Number(b.source_index) | 0)) {
    return (Number(a.source_index) | 0) - (Number(b.source_index) | 0);
  }
  return String(a.object_key || "").localeCompare(String(b.object_key || ""));
}

export function worldObjectMeta(state: WorldObjectStateContainer, baselineDir: string, nowMs = Date.now()): WorldObjectMetaRuntime {
  const wo = state.worldObjects;
  const respawns = wo.deltas.respawns || {};
  const hiddenObjects = Object.keys(wo.deltas.removed || {})
    .filter((key) => !!wo.deltas.removed[key])
    .filter((key) => {
      const respawn = respawns[key];
      return !respawn || Number(respawn.due_at_ms) > nowMs;
    })
    .map((key) => {
      const respawn: RespawnWorldObjectDeltaSourceRuntime = respawns[key] || {};
      return {
        object_key: key,
        due_at_ms: Number(respawn.due_at_ms) || 0,
        respawn_ms: Number(respawn.respawn_ms) || 0,
        policy: String(respawn.policy || "")
      };
    })
    .sort((a, b) => {
      if (a.due_at_ms !== b.due_at_ms) {
        return a.due_at_ms - b.due_at_ms;
      }
      return a.object_key.localeCompare(b.object_key);
    });
  return {
    baseline_dir: baselineDir,
    source_dir: wo.baseline?.source_dir,
    loaded_at: wo.baseline?.loaded_at,
    files_loaded: Number(wo.baseline?.files_loaded) >>> 0,
    baseline_count: Number(wo.baseline?.baseline_count) >>> 0,
    active_count: wo.active.length >>> 0,
    delta_removed_count: Object.keys(wo.deltas.removed || {}).length >>> 0,
    delta_moved_count: Object.keys(wo.deltas.moved || {}).length >>> 0,
    delta_spawned_count: Array.isArray(wo.deltas.spawned) ? wo.deltas.spawned.length >>> 0 : 0,
    hidden_objects: hiddenObjects
  };
}

export function findActiveObjectByKey(state: WorldObjectStateContainer, objectKey: unknown): WorldObject | null {
  const key = String(objectKey || "");
  if (!key) {
    return null;
  }
  const direct = state.worldObjects.active.find((obj) => String(obj.object_key || "") === key);
  if (direct) {
    return direct;
  }
  const legacyObjblk = key.match(/^objblk:(\d+):(\d+)$/);
  if (!legacyObjblk) {
    return null;
  }
  const sourceArea = Number(legacyObjblk[1]) | 0;
  const sourceIndex = Number(legacyObjblk[2]) | 0;
  return state.worldObjects.active.find((obj) => (
    (Number(obj.source_area) | 0) === sourceArea
    && (Number(obj.source_index) | 0) === sourceIndex
  )) || null;
}

export function movedWorldObjectDeltaFromObject(obj: WorldObject): MovedWorldObjectDelta {
  return {
    x: Number(obj.x) | 0,
    y: Number(obj.y) | 0,
    z: Number(obj.z) | 0,
    status: Number(obj.status) & 0xff,
    holder_kind: normalizeWorldObjectHolderKindRuntime(obj.holder_kind),
    holder_id: String(obj.holder_id || ""),
    holder_key: String(obj.holder_key || "")
  };
}

export function respawnWorldObjectDeltaFromRecord(value: RespawnWorldObjectDeltaSourceRuntime): RespawnWorldObjectDelta {
  const dueAtMs = Number(value.due_at_ms);
  const takenAtMs = Number(value.taken_at_ms);
  const respawnMs = Number(value.respawn_ms);
  return {
    due_at_ms: Math.floor(dueAtMs),
    taken_at_ms: Number.isFinite(takenAtMs) ? Math.floor(takenAtMs) : 0,
    respawn_ms: Number.isFinite(respawnMs) ? Math.max(0, Math.floor(respawnMs)) : DEFAULT_PICKUP_RESPAWN_MS,
    policy: String(value.policy || "default")
  };
}

export function persistPatchedObject(state: WorldObjectStateContainer, obj: WorldObject): void {
  if (!obj || !obj.object_key) {
    return;
  }
  if (String(obj.source_kind || "").startsWith("spawned")) {
    const index = state.worldObjects.deltas.spawned.findIndex((s) => String(s.object_key || "") === String(obj.object_key));
    if (index >= 0) {
      const moved = movedWorldObjectDeltaFromObject(obj);
      state.worldObjects.deltas.spawned[index] = {
        ...state.worldObjects.deltas.spawned[index],
        x: moved.x,
        y: moved.y,
        z: moved.z,
        status: moved.status ?? (Number(state.worldObjects.deltas.spawned[index].status) & 0xff),
        holder_kind: moved.holder_kind,
        holder_id: moved.holder_id,
        holder_key: moved.holder_key,
        despawn_at_ms: Number(obj.despawn_at_ms) > 0 ? Math.floor(Number(obj.despawn_at_ms)) : 0,
        dropped_at_ms: Number(obj.dropped_at_ms) > 0 ? Math.floor(Number(obj.dropped_at_ms)) : 0
      };
    } else {
      state.worldObjects.deltas.spawned.push(spawnedWorldObjectDeltaFromObjectRuntime(obj));
    }
    return;
  }
  state.worldObjects.deltas.moved[String(obj.object_key)] = movedWorldObjectDeltaFromObject(obj);
}
