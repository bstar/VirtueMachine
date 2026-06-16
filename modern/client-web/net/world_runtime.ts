import {
  inventoryKeyForObjectRuntime,
  pickObjectIntoInventoryRuntime,
  type InventoryObjectRuntime,
  type InventoryPickupRuntimeResult,
  type SimInventoryRuntimeState
} from "../sim/inventory_runtime.ts";
import { isU6InventoryStackableObjectType } from "../../common/u6_object_constants.ts";
import { netJsonPostInitRuntime } from "./request_runtime.ts";
import type { NetStatusLevel, NetStatusSetter } from "./status_runtime.ts";

export type WorldRuntimeRequest = (
  route: string,
  init?: RequestInit,
  auth?: boolean
) => Promise<WorldRuntimeJson | null>;

export interface WorldRuntimeJson {
  events?: CriticalMaintenanceEvent[];
  inventory_item?: WorldRuntimeInventorySource | null;
  intro_state?: { phase?: unknown };
  meta?: WorldRuntimeMeta;
  objects?: WorldRuntimeServerObject[];
  ok?: unknown;
  respawn?: { due_at_ms?: unknown; source_object_key?: unknown };
  target?: WorldRuntimeInventorySource | null;
}

export interface WorldRuntimeMeta {
  hidden_objects?: unknown;
  [key: string]: unknown;
}

export type HiddenWorldObjectMapRuntime = Record<string, number>;

export type HiddenWorldObjectRowRuntime = {
  due_at_ms: number;
  object_key: string;
};

export interface WorldRuntimeObject {
  frame?: number;
  index?: number;
  objectKey?: string;
  object_key?: string;
  sourceArea?: number;
  type?: number;
  x?: number;
  y?: number;
  z?: number;
}

export type WorldRuntimeObjectKeySource = object & {
  index?: unknown;
  objectKey?: unknown;
  object_key?: unknown;
  sourceArea?: unknown;
  sourceIndex?: unknown;
  source_area?: unknown;
  source_index?: unknown;
};

export type WorldRuntimeInventorySource = object & {
  amount?: unknown;
  frame?: unknown;
  holder_id?: unknown;
  holder_key?: unknown;
  holder_kind?: unknown;
  inventory_key?: unknown;
  objectKey?: unknown;
  object_key?: unknown;
  source_kind?: unknown;
  source_object_key?: unknown;
  status?: unknown;
  tile_id?: unknown;
  type?: unknown;
  x?: unknown;
  y?: unknown;
  z?: unknown;
};

export interface WorldRuntimeServerObject {
  assoc_chain?: ReadonlyArray<unknown>;
  assoc_child_0010_count?: unknown;
  assoc_child_count?: unknown;
  blocked_by?: unknown;
  footprint?: Array<{ x?: unknown; y?: unknown; z?: unknown }>;
  frame?: unknown;
  holder_id?: unknown;
  holder_key?: unknown;
  holder_kind?: unknown;
  legacy_order?: unknown;
  object_key?: unknown;
  root_anchor_key?: unknown;
  source_area?: unknown;
  source_index?: unknown;
  source_kind?: unknown;
  status?: unknown;
  tile_id?: unknown;
  type?: unknown;
  x?: unknown;
  y?: unknown;
  z?: unknown;
}

export function shouldHideServerWorldObjectFromLayerRuntime(
  row: { object_key?: unknown; source_kind?: unknown; source_object_key?: unknown } | null | undefined,
  isHidden: (key: string) => boolean
): boolean {
  const objectKey = String(row?.object_key || "").trim();
  if (objectKey && isHidden(objectKey)) {
    return true;
  }
  const sourceKind = String(row?.source_kind || "").trim();
  const isSpawnedClone = sourceKind.startsWith("spawned") || objectKey.startsWith("inv:");
  if (isSpawnedClone) {
    return false;
  }
  const sourceObjectKey = String(row?.source_object_key || "").trim();
  return !!sourceObjectKey && isHidden(sourceObjectKey);
}

export interface WorldRuntimeObjectLayer {
  byCoord?: Map<string, WorldRuntimeObject[]>;
}

export interface CriticalMaintenanceWorldItem {
  item_id: string;
  reachable: boolean;
  at: { x: number; y: number; z: number };
}

export interface CriticalMaintenanceEvent {
  item_id?: unknown;
}

export type WorldRuntimeInventoryItem = {
  amount?: number;
  frame: number;
  holder_id?: string;
  holder_key?: string;
  holder_kind?: string;
  inventory_key?: string;
  objectKey?: string;
  object_key?: string;
  source_kind?: string;
  source_object_key?: string;
  status?: number;
  tile_id?: number;
  type: number;
  x?: number;
  y?: number;
  z?: number;
};

export type WorldRuntimeInventoryObject = Required<Pick<WorldRuntimeInventoryItem, "frame" | "object_key" | "type">> & {
  amount: number;
  holder_id: string;
  holder_key: string;
  holder_kind: string;
  inventory_key: string;
  source_kind: string;
  source_object_key: string;
  status: number;
  tile_id: number;
  x: number;
  y: number;
  z: number;
};

export type WorldRuntimeInventoryDisplayEntry = {
  count: number;
  frame: number;
  inventory_key: string;
  key: string;
  object_key?: string;
  stackable: boolean;
  tile_hex?: string;
  tile_id?: number;
  type: number;
};

export type WorldRuntimeInventoryIdentity = {
  frame: number;
  inventory_key: string;
  stackable: boolean;
  tile_hex?: string;
  tile_id?: number;
  type: number;
};

export type WorldRuntimeInventoryProjection = {
  inventory: Record<string, number>;
  inventoryObjects: WorldRuntimeInventoryObject[];
  inventoryTiles: Record<string, number>;
};

export type WorldRuntimeInventorySelection = {
  index?: unknown;
  kind?: unknown;
} | null | undefined;

export function serverObjectKeyForWorldObjectRuntime(obj: WorldRuntimeObjectKeySource | null | undefined): string {
  const row = obj || {};
  const direct = String(row.object_key || row.objectKey || "").trim();
  if (direct) {
    return direct;
  }
  const sourceArea = Number(row.sourceArea ?? row.source_area);
  const sourceIndex = Number(row.sourceIndex ?? row.source_index ?? row.index);
  if (Number.isFinite(sourceArea) && Number.isFinite(sourceIndex)) {
    const areaHex = (sourceArea >>> 0).toString(16).padStart(2, "0");
    const indexHex = (sourceIndex >>> 0).toString(16).padStart(3, "0");
    return `a${areaHex}i${indexHex}`;
  }
  return "";
}

export function worldInventorySourcesFromJsonRuntime(objects: unknown): WorldRuntimeInventorySource[] {
  if (!Array.isArray(objects)) {
    return [];
  }
  return objects
    .filter((obj): obj is WorldRuntimeInventorySource => !!obj && typeof obj === "object");
}

export function requiredWorldObjectActorIdRuntime(actorId: unknown): string {
  const id = String(actorId || "").trim();
  if (!id) {
    throw new Error("world object inventory requires a character id");
  }
  return id;
}

export function inventoryProjectionCountForObjectRuntime(
  obj: Pick<WorldRuntimeInventorySource, "amount" | "frame" | "type"> | null | undefined
): number {
  const type = Number(obj?.type);
  const frame = Number(obj?.frame);
  if (!Number.isFinite(type) || !Number.isFinite(frame)) {
    return 0;
  }
  if (!isU6InventoryStackableObjectType(type, frame)) {
    return 1;
  }
  const amount = Math.floor(Number(obj?.amount) || 0);
  return Math.max(1, Math.min(0xffff, amount));
}

function normalizeInventoryAmountRuntime(amount: unknown): number {
  const n = Number(amount);
  return Number.isFinite(n) ? Math.max(0, Math.min(0xffff, Math.floor(n))) : 0;
}

function tileHexFromRuntimeTile(tileId: number): string | undefined {
  return Number.isFinite(tileId) && tileId > 0
    ? `0x${(tileId & 0xffff).toString(16).padStart(3, "0")}`
    : undefined;
}

export function inventoryIdentityFromServerObjectRuntime(
  obj: Pick<WorldRuntimeInventorySource, "frame" | "inventory_key" | "tile_id" | "type"> | null | undefined
): WorldRuntimeInventoryIdentity | null {
  const typeRaw = Number(obj?.type);
  const frameRaw = Number(obj?.frame);
  if (!Number.isFinite(typeRaw) || !Number.isFinite(frameRaw)) {
    return null;
  }
  const type = Number(typeRaw) & 0x3ff;
  const frame = Number(frameRaw) & 0x3f;
  const inventoryKey = String(obj?.inventory_key || inventoryKeyForObjectRuntime({ type, frame }));
  const tileRaw = Number(obj?.tile_id);
  const tileId = Number.isFinite(tileRaw) ? Number(tileRaw) & 0xffff : undefined;
  return {
    frame,
    inventory_key: inventoryKey,
    stackable: isU6InventoryStackableObjectType(type, frame),
    tile_hex: tileId === undefined ? undefined : tileHexFromRuntimeTile(tileId),
    tile_id: tileId,
    type
  };
}

export function inventoryProjectionFromServerObjectsRuntime(
  objects: readonly WorldRuntimeInventorySource[] | null | undefined
): Record<string, number> {
  const next: Record<string, number> = {};
  for (const obj of objects || []) {
    const identity = inventoryIdentityFromServerObjectRuntime(obj);
    if (!identity) {
      continue;
    }
    const key = identity.inventory_key;
    next[key] = ((Number(next[key]) >>> 0) + inventoryProjectionCountForObjectRuntime(obj)) >>> 0;
  }
  return next;
}

export function inventoryTileProjectionFromServerObjectsRuntime(
  objects: readonly WorldRuntimeInventorySource[] | null | undefined
): Record<string, number> {
  const next: Record<string, number> = {};
  for (const obj of objects || []) {
    const identity = inventoryIdentityFromServerObjectRuntime(obj);
    if (!identity || identity.tile_id === undefined) {
      continue;
    }
    next[identity.inventory_key] = identity.tile_id;
  }
  return next;
}

export function inventoryProjectionStateFromServerObjectsRuntime(objects: unknown): WorldRuntimeInventoryProjection {
  const sources = worldInventorySourcesFromJsonRuntime(objects);
  return {
    inventory: inventoryProjectionFromServerObjectsRuntime(sources),
    inventoryObjects: inventoryObjectsFromServerObjectsRuntime(sources),
    inventoryTiles: inventoryTileProjectionFromServerObjectsRuntime(sources)
  };
}

export function applyInventoryProjectionFromServerObjectsRuntime(
  sim: WorldRuntimeTakeInventoryState | null | undefined,
  objects: unknown
): WorldRuntimeInventoryProjection | null {
  if (!sim) {
    return null;
  }
  const projection = inventoryProjectionStateFromServerObjectsRuntime(objects);
  sim.inventory = projection.inventory;
  sim.inventoryObjects = projection.inventoryObjects;
  sim.inventoryTiles = projection.inventoryTiles;
  return projection;
}

export function normalizeInventoryItemRuntime(value: WorldRuntimeInventorySource | null | undefined): WorldRuntimeInventoryItem {
  const row = value || {};
  const out: WorldRuntimeInventoryItem = {
    frame: Number(row.frame) | 0,
    type: Number(row.type) | 0
  };
  const objectKey = String(row.objectKey || "").trim();
  if (objectKey) {
    out.objectKey = objectKey;
  }
  const objectKeySnake = String(row.object_key || "").trim();
  if (objectKeySnake) {
    out.object_key = objectKeySnake;
  }
  const tileId = Number(row.tile_id);
  if (Number.isFinite(tileId)) {
    out.tile_id = Number(tileId) & 0xffff;
  }
  if (Number.isFinite(Number(row.amount))) {
    out.amount = normalizeInventoryAmountRuntime(row.amount);
  }
  const status = Number(row.status);
  if (Number.isFinite(status)) {
    out.status = Number(status) & 0xff;
  }
  const inventoryKey = String(row.inventory_key || "").trim();
  if (inventoryKey) {
    out.inventory_key = inventoryKey;
  }
  const sourceObjectKey = String(row.source_object_key || "").trim();
  if (sourceObjectKey) {
    out.source_object_key = sourceObjectKey;
  }
  const sourceKind = String(row.source_kind || "").trim();
  if (sourceKind) {
    out.source_kind = sourceKind;
  }
  const holderKind = String(row.holder_kind || "").trim();
  if (holderKind) {
    out.holder_kind = holderKind;
  }
  const holderId = String(row.holder_id || "").trim();
  if (holderId) {
    out.holder_id = holderId;
  }
  const holderKey = String(row.holder_key || "").trim();
  if (holderKey) {
    out.holder_key = holderKey;
  }
  for (const key of ["x", "y", "z"] as const) {
    const n = Number(row[key]);
    if (Number.isFinite(n)) {
      out[key] = Number(n) | 0;
    }
  }
  return out;
}

export function inventoryObjectsFromServerObjectsRuntime(
  objects: readonly WorldRuntimeInventorySource[] | null | undefined
): WorldRuntimeInventoryObject[] {
  const out: WorldRuntimeInventoryObject[] = [];
  for (const src of objects || []) {
    const item = normalizeInventoryItemRuntime(src);
    const objectKey = String(item.object_key || item.objectKey || "").trim();
    if (!objectKey) {
      continue;
    }
    out.push({
      amount: normalizeInventoryAmountRuntime(item.amount),
      frame: Number(item.frame) & 0x3f,
      holder_id: String(item.holder_id || ""),
      holder_key: String(item.holder_key || ""),
      holder_kind: String(item.holder_kind || ""),
      inventory_key: String(item.inventory_key || inventoryKeyForObjectRuntime(item)),
      object_key: objectKey,
      source_kind: String(item.source_kind || ""),
      source_object_key: String(item.source_object_key || ""),
      status: Number(item.status) & 0xff,
      tile_id: Number(item.tile_id) & 0xffff,
      type: Number(item.type) & 0x3ff,
      x: Number(item.x) | 0,
      y: Number(item.y) | 0,
      z: Number(item.z) | 0
    });
  }
  return out;
}

export function inventoryDisplayEntriesFromObjectsRuntime(
  objects: readonly WorldRuntimeInventoryObject[] | null | undefined,
  limit = 12
): WorldRuntimeInventoryDisplayEntry[] {
  const out: WorldRuntimeInventoryDisplayEntry[] = [];
  const stackIndexByKey = new Map<string, number>();
  const max = Math.max(0, Number(limit) | 0);
  for (const obj of objects || []) {
    if (max > 0 && out.length >= max) {
      break;
    }
    const identity = inventoryIdentityFromServerObjectRuntime(obj);
    if (!identity) {
      continue;
    }
    const count = inventoryProjectionCountForObjectRuntime(obj);
    if (identity.stackable) {
      const existingIndex = stackIndexByKey.get(identity.inventory_key);
      if (existingIndex !== undefined) {
        out[existingIndex].count = (Number(out[existingIndex].count) + count) >>> 0;
        continue;
      }
      stackIndexByKey.set(identity.inventory_key, out.length);
      out.push({
        count,
        frame: identity.frame,
        inventory_key: identity.inventory_key,
        key: identity.inventory_key,
        stackable: true,
        tile_hex: identity.tile_hex,
        tile_id: identity.tile_id,
        type: identity.type
      });
      continue;
    }
    out.push({
      count: 1,
      frame: identity.frame,
      inventory_key: identity.inventory_key,
      key: String(obj.object_key || identity.inventory_key),
      object_key: String(obj.object_key || ""),
      stackable: false,
      tile_hex: identity.tile_hex,
      tile_id: identity.tile_id,
      type: identity.type
    });
  }
  return out;
}

export function inventoryObjectForDropSelectionRuntime(
  objects: readonly WorldRuntimeInventoryObject[] | null | undefined,
  selected: WorldRuntimeInventorySelection,
  limit = 12
): WorldRuntimeInventoryObject | null {
  const inventoryObjects = Array.isArray(objects) ? objects : [];
  if (selected && selected.kind === "inventory") {
    const entries = inventoryDisplayEntriesFromObjectsRuntime(inventoryObjects, limit);
    const entry = entries[Number(selected.index) | 0] || null;
    const objectKey = String(entry?.object_key || "").trim();
    if (objectKey) {
      return inventoryObjects.find((obj) => String(obj.object_key || "") === objectKey) || null;
    }
    const inventoryKey = String(entry?.inventory_key || entry?.key || "").trim();
    if (inventoryKey) {
      return inventoryObjects.find((obj) => String(obj.inventory_key || inventoryKeyForObjectRuntime(obj)) === inventoryKey) || null;
    }
    return inventoryObjects[Number(selected.index) | 0] || null;
  }
  return inventoryObjects[0] || null;
}

export function inventoryCountMapForDropValidationRuntime(
  inventory: Record<string, number> | null | undefined,
  objects: readonly WorldRuntimeInventoryObject[] | null | undefined
): Record<string, number> {
  if (inventory && Object.keys(inventory).length > 0) {
    return { ...inventory };
  }
  const out: Record<string, number> = {};
  for (const item of objects || []) {
    const key = String(item.inventory_key || inventoryKeyForObjectRuntime(item));
    out[key] = ((Number(out[key]) >>> 0) + inventoryProjectionCountForObjectRuntime(item)) >>> 0;
  }
  return out;
}

export interface WorldRuntimeTakeResponse {
  inventory_item?: WorldRuntimeInventorySource | null;
  respawn?: { due_at_ms?: unknown; source_object_key?: unknown };
  target?: WorldRuntimeInventorySource | null;
}

export type WorldRuntimeTakeProjection = {
  hide_source: boolean;
  inventory_item: WorldRuntimeInventoryItem;
  inventory_object: WorldRuntimeInventoryObject | null;
  inventory_tile_id: number | null;
  inventory_tile_key: string;
  remove_source_object_key: string;
  remove_taken_object_key: string;
  source_object_key: string;
  source_respawn_due_at_ms: unknown;
};

export type WorldRuntimeTakeInventoryState = SimInventoryRuntimeState & {
  inventoryObjects?: WorldRuntimeInventoryObject[];
  inventoryTiles?: Record<string, number>;
};

export type WorldRuntimeTakeInventoryApplyResult = InventoryPickupRuntimeResult & {
  inventoryObjectKey: string;
  inventoryTileId: number | null;
  inventoryTileKey: string;
};

export type WorldRuntimeDropThrowEffect = {
  endMs: number;
  fromX: number;
  fromY: number;
  landObject: WorldRuntimeJson["target"] | null;
  objectKey: string;
  startMs: number;
  tileId: number;
  toX: number;
  toY: number;
  z: number;
};

export type WorldRuntimeDropThrowPlan =
  | { kind: "apply_now"; landObject: WorldRuntimeJson["target"] | null }
  | { effect: WorldRuntimeDropThrowEffect; kind: "animate" };

export type HiddenWorldObjectMetaUpdateRuntime = {
  expiredObjectKeys: string[];
  hiddenWorldObjectKeys: HiddenWorldObjectMapRuntime | null;
};

export type HiddenWorldObjectLayerPlanRuntime = {
  hiddenWorldObjectKeys: HiddenWorldObjectMapRuntime | null;
  removeObjectKeys: string[];
};

export type HiddenWorldObjectVisibilityRuntime = {
  expiredKeys: string[];
  hidden: boolean;
  hiddenWorldObjectKeys: HiddenWorldObjectMapRuntime;
};

export type HiddenWorldObjectClientStateRuntime = {
  hiddenWorldObjectKeys: HiddenWorldObjectMapRuntime;
};

export type HiddenWorldObjectLayerRuntime = {
  removeRuntimeEntryByAuthoritativeKey(key: string): void;
};

export type ObjectTransientStateRuntime = {
  doorOpenStates?: Record<string, unknown>;
  removedObjectAtTick?: Record<string, unknown>;
  removedObjectCount?: number;
  removedObjectKeys?: Record<string, unknown>;
};

export function clearObjectTransientStateRuntime(state: ObjectTransientStateRuntime | null | undefined): boolean {
  if (!state) {
    return false;
  }
  state.doorOpenStates = {};
  state.removedObjectKeys = {};
  state.removedObjectAtTick = {};
  state.removedObjectCount = 0;
  return true;
}

function worldRuntimeMetaFromUnknown(meta: unknown): WorldRuntimeMeta | null {
  return meta && typeof meta === "object" && !Array.isArray(meta)
    ? meta as WorldRuntimeMeta
    : null;
}

export function hiddenWorldObjectMetaUpdateRuntime(
  meta: unknown,
  nowMs: number,
  fallbackRespawnMs: number
): HiddenWorldObjectMetaUpdateRuntime {
  const metaRecord = worldRuntimeMetaFromUnknown(meta);
  return {
    expiredObjectKeys: expiredWorldObjectKeysFromMetaRuntime(metaRecord),
    hiddenWorldObjectKeys: hiddenWorldObjectKeysFromMetaRuntime(metaRecord, nowMs, fallbackRespawnMs)
  };
}

export function hiddenWorldObjectLayerPlanRuntime(
  meta: unknown,
  nowMs: number,
  fallbackRespawnMs: number
): HiddenWorldObjectLayerPlanRuntime {
  const update = hiddenWorldObjectMetaUpdateRuntime(meta, nowMs, fallbackRespawnMs);
  const removeObjectKeys = new Set(update.expiredObjectKeys);
  if (update.hiddenWorldObjectKeys) {
    for (const key of Object.keys(update.hiddenWorldObjectKeys)) {
      removeObjectKeys.add(key);
    }
  }
  return {
    hiddenWorldObjectKeys: update.hiddenWorldObjectKeys,
    removeObjectKeys: [...removeObjectKeys]
  };
}

export function hiddenWorldObjectKeysFromMetaRuntime(
  meta: WorldRuntimeMeta | null | undefined,
  nowMs: number,
  fallbackRespawnMs: number
): HiddenWorldObjectMapRuntime | null {
  const rows = hiddenWorldObjectRowsFromMetaRuntime(meta, nowMs, fallbackRespawnMs);
  if (!rows) return null;
  const out: HiddenWorldObjectMapRuntime = {};
  for (const row of rows) {
    out[row.object_key] = row.due_at_ms;
  }
  return out;
}

export function hiddenWorldObjectRowsFromMetaRuntime(
  meta: WorldRuntimeMeta | null | undefined,
  nowMs: number,
  fallbackRespawnMs: number
): HiddenWorldObjectRowRuntime[] | null {
  if (!meta || !Array.isArray(meta.hidden_objects)) {
    return null;
  }
  const rows: HiddenWorldObjectRowRuntime[] = [];
  const now = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
  const fallback = Math.max(0, Number(fallbackRespawnMs) || 0);
  for (const row of meta.hidden_objects) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const record = row as { due_at_ms?: unknown; object_key?: unknown };
    const key = String(record.object_key || "").trim();
    if (!key) {
      continue;
    }
    const due = Number(record.due_at_ms);
    const dueAtMs = Number.isFinite(due) && due > 0 ? due : now + fallback;
    if (dueAtMs > now) {
      rows.push({
        due_at_ms: Math.floor(dueAtMs),
        object_key: key
      });
    }
  }
  rows.sort((a, b) => {
    if (a.due_at_ms !== b.due_at_ms) {
      return a.due_at_ms - b.due_at_ms;
    }
    return a.object_key.localeCompare(b.object_key);
  });
  return rows;
}

export function expiredWorldObjectKeysFromMetaRuntime(meta: WorldRuntimeMeta | null | undefined): string[] {
  const rows = Array.isArray(meta?.expired_objects) ? meta.expired_objects : [];
  const out: string[] = [];
  for (const row of rows) {
    const key = String(row || "").trim();
    if (key) {
      out.push(key);
    }
  }
  return out;
}

export function markedHiddenWorldObjectKeysRuntime(
  current: HiddenWorldObjectMapRuntime | null | undefined,
  sourceKey: unknown,
  dueAtMs: unknown,
  nowMs: number,
  fallbackRespawnMs: number
): HiddenWorldObjectMapRuntime {
  const key = String(sourceKey || "").trim();
  const next = { ...(current || {}) };
  if (!key) {
    return next;
  }
  const now = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
  const due = Number(dueAtMs);
  next[key] = Number.isFinite(due) && due > now
    ? due
    : now + Math.max(0, Number(fallbackRespawnMs) || 0);
  return next;
}

export function purgeExpiredHiddenWorldObjectKeysRuntime(
  current: HiddenWorldObjectMapRuntime | null | undefined,
  nowMs: number
): { expiredKeys: string[]; hiddenWorldObjectKeys: HiddenWorldObjectMapRuntime } {
  const now = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
  const hiddenWorldObjectKeys: HiddenWorldObjectMapRuntime = {};
  const expiredKeys: string[] = [];
  for (const [key, rawDue] of Object.entries(current || {})) {
    const due = Number(rawDue);
    if (Number.isFinite(due) && due > now) {
      hiddenWorldObjectKeys[key] = due;
    } else {
      expiredKeys.push(key);
    }
  }
  return { expiredKeys, hiddenWorldObjectKeys };
}

export function isHiddenWorldObjectKeyRuntime(
  current: HiddenWorldObjectMapRuntime | null | undefined,
  sourceKey: unknown,
  nowMs: number
): boolean {
  const key = String(sourceKey || "").trim();
  if (!key) {
    return false;
  }
  const due = Number(current?.[key] || 0);
  const now = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
  return Number.isFinite(due) && due > now;
}

export function hiddenWorldObjectVisibilityRuntime(
  current: HiddenWorldObjectMapRuntime | null | undefined,
  sourceKey: unknown,
  nowMs: number
): HiddenWorldObjectVisibilityRuntime {
  const next = purgeExpiredHiddenWorldObjectKeysRuntime(current, nowMs);
  return {
    expiredKeys: next.expiredKeys,
    hidden: isHiddenWorldObjectKeyRuntime(next.hiddenWorldObjectKeys, sourceKey, nowMs),
    hiddenWorldObjectKeys: next.hiddenWorldObjectKeys
  };
}

export function markHiddenWorldObjectClientStateRuntime(
  state: HiddenWorldObjectClientStateRuntime,
  sourceKey: unknown,
  dueAtMs: unknown,
  nowMs: number,
  fallbackRespawnMs: number
): HiddenWorldObjectMapRuntime {
  state.hiddenWorldObjectKeys = markedHiddenWorldObjectKeysRuntime(
    state.hiddenWorldObjectKeys,
    sourceKey,
    dueAtMs,
    nowMs,
    fallbackRespawnMs
  );
  return state.hiddenWorldObjectKeys;
}

export function removeHiddenWorldObjectsFromLayerRuntime(
  layer: HiddenWorldObjectLayerRuntime | null | undefined,
  hiddenWorldObjectKeys: HiddenWorldObjectMapRuntime | null | undefined
): string[] {
  const removedKeys = Object.keys(hiddenWorldObjectKeys || {});
  if (!layer) {
    return removedKeys;
  }
  for (const key of removedKeys) {
    layer.removeRuntimeEntryByAuthoritativeKey(key);
  }
  return removedKeys;
}

export function applyHiddenWorldObjectsMetaToClientRuntime(args: {
  fallbackRespawnMs: number;
  layer?: HiddenWorldObjectLayerRuntime | null;
  meta: unknown;
  nowMs: number;
  state: HiddenWorldObjectClientStateRuntime;
}): HiddenWorldObjectLayerPlanRuntime {
  const plan = hiddenWorldObjectLayerPlanRuntime(args.meta, args.nowMs, args.fallbackRespawnMs);
  if (args.layer) {
    for (const key of plan.removeObjectKeys) {
      args.layer.removeRuntimeEntryByAuthoritativeKey(key);
    }
  }
  if (plan.hiddenWorldObjectKeys) {
    args.state.hiddenWorldObjectKeys = plan.hiddenWorldObjectKeys;
  }
  return plan;
}

export function hiddenWorldObjectVisibilityForClientRuntime(
  state: HiddenWorldObjectClientStateRuntime,
  sourceKey: unknown,
  nowMs: number
): HiddenWorldObjectVisibilityRuntime {
  const visibility = hiddenWorldObjectVisibilityRuntime(state.hiddenWorldObjectKeys, sourceKey, nowMs);
  if (visibility.expiredKeys.length > 0) {
    state.hiddenWorldObjectKeys = visibility.hiddenWorldObjectKeys;
  }
  return visibility;
}

export function inventoryItemFromTakeResponseRuntime(
  out: WorldRuntimeTakeResponse | null | undefined,
  fallback: WorldRuntimeInventorySource | null | undefined
): WorldRuntimeInventoryItem {
  return normalizeInventoryItemRuntime(out?.inventory_item || out?.target || fallback);
}

export function sourceObjectKeyFromTakeResponseRuntime(
  out: WorldRuntimeTakeResponse | null | undefined,
  item: WorldRuntimeInventorySource | null | undefined,
  fallback: WorldRuntimeObjectKeySource | null | undefined
): string {
  return String(
    out?.respawn?.source_object_key
      || item?.source_object_key
      || out?.target?.source_object_key
      || serverObjectKeyForWorldObjectRuntime(fallback)
      || ""
  ).trim();
}

export function takeProjectionFromResponseRuntime(
  out: WorldRuntimeTakeResponse | null | undefined,
  fallback: WorldRuntimeInventorySource & WorldRuntimeObjectKeySource
): WorldRuntimeTakeProjection {
  const item = inventoryItemFromTakeResponseRuntime(out, fallback);
  const sourceObj = fallback as WorldRuntimeInventorySource & WorldRuntimeObjectKeySource & {
    key?: unknown;
  };
  const takenObjectKey = String(sourceObj.object_key || sourceObj.key || "").trim();
  const sourceObjectKey = sourceObjectKeyFromTakeResponseRuntime(out, item, sourceObj);
  const inventoryObjects = inventoryObjectsFromServerObjectsRuntime([item]);
  const inventoryObject = inventoryObjects[0] || null;
  const tileId = Number(item.tile_id);
  return {
    hide_source: !!(out?.respawn?.source_object_key || out?.respawn?.due_at_ms),
    inventory_item: item,
    inventory_object: inventoryObject,
    inventory_tile_id: Number.isFinite(tileId) ? Number(tileId) & 0xffff : null,
    inventory_tile_key: inventoryKeyForObjectRuntime(item),
    remove_source_object_key: sourceObjectKey,
    remove_taken_object_key: takenObjectKey.startsWith("inv:") ? takenObjectKey : "",
    source_object_key: sourceObjectKey,
    source_respawn_due_at_ms: out?.respawn?.due_at_ms
  };
}

export function applyTakeProjectionToInventoryRuntime(
  sim: WorldRuntimeTakeInventoryState,
  projection: WorldRuntimeTakeProjection,
  removedObject: InventoryObjectRuntime | null | undefined
): WorldRuntimeTakeInventoryApplyResult {
  if (!Array.isArray(sim.inventoryObjects)) {
    sim.inventoryObjects = [];
  }
  const inventoryObjectKey = String(projection.inventory_object?.object_key || "");
  if (projection.inventory_object) {
    sim.inventoryObjects = [
      ...sim.inventoryObjects.filter((entry) => String(entry.object_key || "") !== inventoryObjectKey),
      projection.inventory_object
    ];
  }
  if (projection.inventory_tile_id !== null) {
    if (!sim.inventoryTiles) {
      sim.inventoryTiles = {};
    }
    sim.inventoryTiles[projection.inventory_tile_key] = projection.inventory_tile_id;
  }
  const pickup = pickObjectIntoInventoryRuntime(sim, projection.inventory_item, removedObject);
  return {
    ...pickup,
    inventoryObjectKey,
    inventoryTileId: projection.inventory_tile_id,
    inventoryTileKey: projection.inventory_tile_key
  };
}

export function dropThrowPlanRuntime(args: {
  durationMs: number;
  fromX: number;
  fromY: number;
  landObject: WorldRuntimeJson["target"] | null | undefined;
  nowMs: number;
  toX: number;
  toY: number;
  z: number;
}): WorldRuntimeDropThrowPlan {
  const landObject = args.landObject || null;
  const objectKey = String(landObject?.object_key || "").trim();
  const tileId = Number(landObject?.tile_id);
  if (!objectKey || !Number.isFinite(tileId)) {
    return { kind: "apply_now", landObject };
  }
  if ((args.fromX | 0) === (args.toX | 0) && (args.fromY | 0) === (args.toY | 0)) {
    return { kind: "apply_now", landObject };
  }
  const nowMs = Number(args.nowMs) || 0;
  const durationMs = Math.max(0, Number(args.durationMs) || 0);
  return {
    kind: "animate",
    effect: {
      endMs: nowMs + durationMs,
      fromX: args.fromX | 0,
      fromY: args.fromY | 0,
      landObject,
      objectKey,
      startMs: nowMs,
      tileId: Number(tileId) & 0xffff,
      toX: args.toX | 0,
      toY: args.toY | 0,
      z: args.z | 0
    }
  };
}

export async function requestTakeWorldObjectRuntime(
  args: {
    actorId: string | number | null | undefined;
    actorX: number;
    actorY: number;
    actorZ: number;
    target: WorldRuntimeObjectKeySource | null | undefined;
  },
  request: WorldRuntimeRequest
): Promise<WorldRuntimeJson | null> {
  const targetKey = serverObjectKeyForWorldObjectRuntime(args.target);
  if (!targetKey) {
    throw new Error("target object has no authoritative key");
  }
  const out = await request("/api/world/objects/interact", netJsonPostInitRuntime({
    verb: "take",
    target_key: targetKey,
    actor_id: requiredWorldObjectActorIdRuntime(args.actorId),
    actor_x: Number(args.actorX) | 0,
    actor_y: Number(args.actorY) | 0,
    actor_z: Number(args.actorZ) | 0
  }), true);
  return out && typeof out === "object" ? out : null;
}

export async function requestDropWorldObjectRuntime(
  args: {
    actorId: string | number | null | undefined;
    actorX: number;
    actorY: number;
    actorZ: number;
    dropX?: number;
    dropY?: number;
    dropZ?: number;
    targetKey: string | number | null | undefined;
  },
  request: WorldRuntimeRequest
): Promise<WorldRuntimeJson | null> {
  const targetKey = String(args.targetKey || "").trim();
  if (!targetKey) {
    throw new Error("inventory object has no authoritative key");
  }
  const out = await request("/api/world/objects/interact", netJsonPostInitRuntime({
    verb: "drop",
    target_key: targetKey,
    actor_id: requiredWorldObjectActorIdRuntime(args.actorId),
    actor_x: Number(args.actorX) | 0,
    actor_y: Number(args.actorY) | 0,
    actor_z: Number(args.actorZ) | 0,
    drop_x: Number(args.dropX ?? args.actorX) | 0,
    drop_y: Number(args.dropY ?? args.actorY) | 0,
    drop_z: Number(args.dropZ ?? args.actorZ) | 0
  }), true);
  return out && typeof out === "object" ? out : null;
}

export function normalizeIntroPhaseRuntime(phase: unknown): "pre_intro" | "post_intro" {
  return String(phase || "").trim().toLowerCase() === "pre_intro" ? "pre_intro" : "post_intro";
}

export interface IntroPhasePresentationRuntime {
  diagClass: "diag ok" | "diag warn";
  diagText: string;
  statusLevel: Extract<NetStatusLevel, "online" | "error">;
  statusText: string;
}

export function introPhaseSetPresentationRuntime(phase: unknown): IntroPhasePresentationRuntime {
  const text = String(phase || "post_intro");
  return {
    diagClass: "diag ok",
    diagText: `Intro phase set to ${text}.`,
    statusLevel: "online",
    statusText: `Intro phase: ${text}`
  };
}

export function introPhaseUpdateFailureRuntime(reason: unknown): IntroPhasePresentationRuntime {
  const text = String(reason || "unknown error");
  return {
    diagClass: "diag warn",
    diagText: `Intro phase update failed: ${text}`,
    statusLevel: "error",
    statusText: `Intro phase update failed: ${text}`
  };
}

export function bindIntroPhaseButtonRuntime(args: {
  button?: { addEventListener: (type: "click", listener: () => void | Promise<void>) => void } | null;
  currentPhase: () => unknown;
  errorMessage: (err: unknown) => string;
  isAuthenticated: () => boolean;
  requestedPhase: () => unknown;
  setDiag: (diag: IntroPhasePresentationRuntime) => void;
  setIntroPhase: (phase: string) => Promise<unknown>;
  setStatus: NetStatusSetter;
}): boolean {
  if (!args.button) {
    return false;
  }
  args.button.addEventListener("click", () => {
    void (async () => {
      try {
        if (!args.isAuthenticated()) {
          throw new Error("Login required");
        }
        const requested = String(args.requestedPhase() || args.currentPhase() || "post_intro");
        await args.setIntroPhase(requested);
        const presentation = introPhaseSetPresentationRuntime(args.currentPhase());
        args.setDiag(presentation);
        args.setStatus(presentation.statusLevel, presentation.statusText);
      } catch (err) {
        const presentation = introPhaseUpdateFailureRuntime(args.errorMessage(err));
        args.setStatus(presentation.statusLevel, presentation.statusText);
        args.setDiag(presentation);
      }
    })();
  });
  return true;
}

export async function requestIntroPhaseRuntime(
  fallbackPhase: unknown,
  request: WorldRuntimeRequest
): Promise<{ out: WorldRuntimeJson | null; phase: "pre_intro" | "post_intro" }> {
  const out = await request("/api/world/intro-state", { method: "GET" }, true);
  const rawPhase = out?.intro_state?.phase;
  return {
    out,
    phase: normalizeIntroPhaseRuntime(rawPhase || fallbackPhase || "post_intro")
  };
}

export async function setIntroPhaseRuntime(
  phase: unknown,
  request: WorldRuntimeRequest
): Promise<{ out: WorldRuntimeJson | null; phase: "pre_intro" | "post_intro" }> {
  const requested = normalizeIntroPhaseRuntime(phase);
  const out = await request("/api/world/intro-state", {
    ...netJsonPostInitRuntime({ phase: requested }),
    method: "PUT"
  }, true);
  const rawPhase = out?.intro_state?.phase;
  return {
    out,
    phase: normalizeIntroPhaseRuntime(rawPhase || requested)
  };
}

export function collectWorldItemsForMaintenanceFromLayer(objectLayer: WorldRuntimeObjectLayer | null | undefined): CriticalMaintenanceWorldItem[] {
  if (!objectLayer || !objectLayer.byCoord) {
    return [];
  }
  const worldItems: CriticalMaintenanceWorldItem[] = [];
  for (const list of objectLayer.byCoord.values()) {
    for (const obj of list) {
      const typeHex = (Number(obj.type) & 0x3ff).toString(16).padStart(3, "0");
      worldItems.push({
        item_id: `item_type_0x${typeHex}`,
        reachable: true,
        at: { x: Number(obj.x) | 0, y: Number(obj.y) | 0, z: Number(obj.z) | 0 }
      });
    }
  }
  return worldItems;
}

export async function requestCriticalMaintenance(
  payload: {
    tick: number;
    world_items: CriticalMaintenanceWorldItem[];
  },
  request: WorldRuntimeRequest
): Promise<CriticalMaintenanceEvent[]> {
  const out = await request("/api/world/critical-items/maintenance", netJsonPostInitRuntime(payload), true);
  return Array.isArray(out?.events) ? out.events as CriticalMaintenanceEvent[] : [];
}

export async function requestWorldObjectsAtCell(
  x: number,
  y: number,
  z: number,
  request: WorldRuntimeRequest
): Promise<WorldRuntimeJson | null> {
  return requestWorldObjectsAroundRuntime({ x, y, z, radius: 1, limit: 256 }, request);
}

export async function requestWorldObjectsAroundRuntime(
  args: {
    limit?: number;
    radius?: number;
    x: number;
    y: number;
    z: number;
  },
  request: WorldRuntimeRequest
): Promise<WorldRuntimeJson | null> {
  const radius = Math.max(0, Math.min(16, Number(args.radius) | 0));
  const limit = Math.max(1, Math.min(4096, Number(args.limit) | 0 || 512));
  const out = await request(
    `/api/world/objects?x=${encodeURIComponent(args.x | 0)}&y=${encodeURIComponent(args.y | 0)}&z=${encodeURIComponent(args.z | 0)}&radius=${encodeURIComponent(radius)}&limit=${encodeURIComponent(limit)}&projection=footprint&include_footprint=1`,
    { method: "GET" },
    true
  );
  return out && typeof out === "object" ? out : null;
}

export interface CriticalMaintenanceState {
  token?: string;
  maintenanceInFlight?: boolean;
  recoveryEventCount?: number;
  lastMaintenanceTick?: number;
}

export interface RunCriticalMaintenanceOptions {
  silent?: boolean;
}

export interface RunCriticalMaintenanceDeps {
  currentTick: () => number;
  collectWorldItems: () => CriticalMaintenanceWorldItem[];
  login: () => Promise<unknown>;
  request: WorldRuntimeRequest;
  resetBackgroundFailures: () => void;
  updateCriticalRecoveryStat: () => void;
  setStatus: NetStatusSetter;
  setDiag: (kind: "ok" | "warn", text: string) => void;
}

export interface CriticalMaintenanceFailureRuntime {
  diagClass: "diag warn";
  diagText: string;
  statusLevel: Extract<NetStatusLevel, "error">;
  statusText: string;
}

export interface CriticalMaintenanceDiagRuntime {
  diagClass: "diag ok" | "diag warn";
  diagText: string;
}

export type CriticalMaintenanceButtonRuntime = {
  addEventListener(type: "click", listener: () => void): void;
};

export interface InventorySyncFailureDiagRuntime {
  diagClass: "diag warn";
  diagText: string;
}

export function inventorySyncFailureDiagRuntime(reason: string): InventorySyncFailureDiagRuntime {
  return {
    diagClass: "diag warn",
    diagText: `Inventory sync failed: ${reason}`
  };
}

export function criticalMaintenanceFailureRuntime(
  err: unknown,
  errorMessage: (err: unknown) => string
): CriticalMaintenanceFailureRuntime {
  const reason = errorMessage(err);
  return {
    diagClass: "diag warn",
    diagText: `Critical maintenance failed: ${reason}`,
    statusLevel: "error",
    statusText: `Maintenance failed: ${reason}`
  };
}

export function criticalMaintenanceDiagRuntime(kind: unknown, text: unknown): CriticalMaintenanceDiagRuntime {
  return {
    diagClass: kind === "ok" ? "diag ok" : "diag warn",
    diagText: String(text || "")
  };
}

export function bindCriticalMaintenanceButtonRuntime(args: {
  button?: CriticalMaintenanceButtonRuntime | null;
  errorMessage: (err: unknown) => string;
  run: () => Promise<unknown>;
  setDiag: (diag: CriticalMaintenanceDiagRuntime) => void;
  setStatus: NetStatusSetter;
}): boolean {
  if (!args.button) {
    return false;
  }
  args.button.addEventListener("click", () => {
    void (async () => {
      try {
        await args.run();
      } catch (err) {
        const failure = criticalMaintenanceFailureRuntime(err, args.errorMessage);
        args.setStatus(failure.statusLevel, failure.statusText);
        args.setDiag(failure);
      }
    })();
  });
  return true;
}

export async function runCriticalMaintenanceRuntime(
  netState: CriticalMaintenanceState,
  opts: RunCriticalMaintenanceOptions,
  deps: RunCriticalMaintenanceDeps
): Promise<CriticalMaintenanceEvent[]> {
  const silent = !!opts.silent;
  if (netState.maintenanceInFlight) {
    return [];
  }
  netState.maintenanceInFlight = true;
  deps.setStatus("sync", "Running critical maintenance...");
  try {
    if (!netState.token) {
      await deps.login();
    }
    const tick = deps.currentTick() >>> 0;
    const events = await requestCriticalMaintenance({
      tick,
      world_items: deps.collectWorldItems()
    }, deps.request);
    deps.resetBackgroundFailures();
    netState.recoveryEventCount = (Number(netState.recoveryEventCount) + events.length) >>> 0;
    netState.lastMaintenanceTick = tick;
    deps.updateCriticalRecoveryStat();
    if (!silent) {
      deps.setDiag(
        "ok",
        events.length
          ? `Critical maintenance emitted ${events.length} recovery event(s).`
          : "Critical maintenance check complete (no recoveries needed)."
      );
    }
    deps.setStatus(
      "online",
      events.length
        ? `Maintenance recovered ${events.length} item(s)`
        : "Maintenance check complete"
    );
    return events;
  } finally {
    netState.maintenanceInFlight = false;
  }
}
