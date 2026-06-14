import { coordUseOfStatus } from "../common/u6_object_constants.ts";
import { DEFAULT_PICKUP_RESPAWN_MS } from "./world_object_policy.ts";
import type {
  MovedWorldObjectDelta,
  RespawnWorldObjectDelta,
  SpawnedWorldObjectDelta,
  WorldObject,
  WorldObjectDeltas,
  WorldObjectStateContainer
} from "./world_object_types.ts";

function objectRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function spawnedDeltaFromRecord(value: Record<string, unknown>, index: number): SpawnedWorldObjectDelta {
  return {
    object_key: String(value.object_key || `spawn_${index}`),
    source_area: Number(value.source_area) >>> 0,
    source_index: Number(value.source_index) >>> 0,
    status: Number(value.status) & 0xff,
    shape_type: Number(value.shape_type) & 0xffff,
    amount: Number(value.amount) & 0xffff,
    type: Number(value.type) & 0x3ff,
    frame: Number(value.frame) & 0x3f,
    tile_id: Number(value.tile_id) & 0xffff,
    x: Number(value.x) | 0,
    y: Number(value.y) | 0,
    z: Number(value.z) | 0,
    holder_kind: String(value.holder_kind || "none"),
    holder_id: String(value.holder_id || ""),
    holder_key: String(value.holder_key || "")
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
  const src = objectRecord(raw);
  if (!src) {
    return out;
  }
  const removed = objectRecord(src.removed);
  if (removed) {
    for (const [key, value] of Object.entries(removed)) {
      if (value) {
        out.removed[String(key)] = true;
      }
    }
  }
  const moved = objectRecord(src.moved);
  if (moved) {
    for (const [key, value] of Object.entries(moved)) {
      const entry = objectRecord(value);
      if (!entry) {
        continue;
      }
      out.moved[String(key)] = {
        x: Number(entry.x) | 0,
        y: Number(entry.y) | 0,
        z: Number(entry.z) | 0,
        status: Number.isFinite(Number(entry.status)) ? (Number(entry.status) & 0xff) : null,
        holder_kind: String(entry.holder_kind || "none"),
        holder_id: String(entry.holder_id || ""),
        holder_key: String(entry.holder_key || "")
      };
    }
  }
  if (Array.isArray(src.spawned)) {
    out.spawned = src.spawned
      .map((value, index) => {
        const entry = objectRecord(value);
        return entry ? spawnedDeltaFromRecord(entry, index) : null;
      })
      .filter((value): value is SpawnedWorldObjectDelta => !!value);
  }
  const respawns = objectRecord(src.respawns);
  if (respawns) {
    for (const [key, value] of Object.entries(respawns)) {
      const entry = objectRecord(value);
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

export function worldObjectMeta(state: WorldObjectStateContainer, baselineDir: string): Record<string, unknown> {
  const wo = state.worldObjects;
  return {
    baseline_dir: baselineDir,
    source_dir: wo.baseline?.source_dir,
    loaded_at: wo.baseline?.loaded_at,
    files_loaded: Number(wo.baseline?.files_loaded) >>> 0,
    baseline_count: Number(wo.baseline?.baseline_count) >>> 0,
    active_count: wo.active.length >>> 0,
    delta_removed_count: Object.keys(wo.deltas.removed || {}).length >>> 0,
    delta_moved_count: Object.keys(wo.deltas.moved || {}).length >>> 0,
    delta_spawned_count: Array.isArray(wo.deltas.spawned) ? wo.deltas.spawned.length >>> 0 : 0
  };
}

export function findActiveObjectByKey(state: WorldObjectStateContainer, objectKey: unknown): WorldObject | null {
  const key = String(objectKey || "");
  if (!key) {
    return null;
  }
  return state.worldObjects.active.find((obj) => String(obj.object_key || "") === key) || null;
}

export function movedWorldObjectDeltaFromObject(obj: WorldObject): MovedWorldObjectDelta {
  return {
    x: Number(obj.x) | 0,
    y: Number(obj.y) | 0,
    z: Number(obj.z) | 0,
    status: Number(obj.status) & 0xff,
    holder_kind: String(obj.holder_kind || "none"),
    holder_id: String(obj.holder_id || ""),
    holder_key: String(obj.holder_key || "")
  };
}

export function respawnWorldObjectDeltaFromRecord(value: Record<string, unknown>): RespawnWorldObjectDelta {
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
      state.worldObjects.deltas.spawned[index] = {
        ...state.worldObjects.deltas.spawned[index],
        ...movedWorldObjectDeltaFromObject(obj)
      };
    }
    return;
  }
  state.worldObjects.deltas.moved[String(obj.object_key)] = movedWorldObjectDeltaFromObject(obj);
}
