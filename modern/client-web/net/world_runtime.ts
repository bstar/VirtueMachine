import { inventoryKeyForObjectRuntime } from "../sim/inventory_runtime.ts";
import { isU6InventoryStackableObjectType } from "../../common/u6_object_constants.ts";

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

export function inventoryProjectionFromServerObjectsRuntime(
  objects: readonly WorldRuntimeInventorySource[] | null | undefined
): Record<string, number> {
  const next: Record<string, number> = {};
  for (const obj of objects || []) {
    const type = Number(obj.type);
    const frame = Number(obj.frame);
    if (!Number.isFinite(type) || !Number.isFinite(frame)) {
      continue;
    }
    const key = inventoryKeyForObjectRuntime({ type, frame });
    next[key] = ((Number(next[key]) >>> 0) + 1) >>> 0;
  }
  return next;
}

export function inventoryTileProjectionFromServerObjectsRuntime(
  objects: readonly WorldRuntimeInventorySource[] | null | undefined
): Record<string, number> {
  const next: Record<string, number> = {};
  for (const obj of objects || []) {
    const type = Number(obj.type);
    const frame = Number(obj.frame);
    const tileId = Number(obj.tile_id);
    if (!Number.isFinite(type) || !Number.isFinite(frame) || !Number.isFinite(tileId)) {
      continue;
    }
    const key = inventoryKeyForObjectRuntime({ type, frame });
    next[key] = Number(tileId) & 0xffff;
  }
  return next;
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
  const amount = Number(row.amount);
  if (Number.isFinite(amount)) {
    out.amount = Number(amount) & 0xffff;
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
      amount: Number(item.amount) & 0xffff,
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

function tileHexFromRuntimeTile(tileId: number): string | undefined {
  return Number.isFinite(tileId) && tileId > 0
    ? `0x${(tileId & 0xffff).toString(16).padStart(3, "0")}`
    : undefined;
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
    const type = Number(obj.type) & 0x3ff;
    const frame = Number(obj.frame) & 0x3f;
    const inventoryKey = String(obj.inventory_key || inventoryKeyForObjectRuntime({ type, frame }));
    const tileId = Number(obj.tile_id) & 0xffff;
    const stackable = isU6InventoryStackableObjectType(type, frame);
    const count = Math.max(1, Number(obj.amount) >>> 0);
    if (stackable) {
      const existingIndex = stackIndexByKey.get(inventoryKey);
      if (existingIndex !== undefined) {
        out[existingIndex].count = (Number(out[existingIndex].count) + count) >>> 0;
        continue;
      }
      stackIndexByKey.set(inventoryKey, out.length);
      out.push({
        count,
        frame,
        inventory_key: inventoryKey,
        key: inventoryKey,
        stackable: true,
        tile_hex: tileHexFromRuntimeTile(tileId),
        tile_id: tileId,
        type
      });
      continue;
    }
    out.push({
      count: 1,
      frame,
      inventory_key: inventoryKey,
      key: String(obj.object_key || inventoryKey),
      object_key: String(obj.object_key || ""),
      stackable: false,
      tile_hex: tileHexFromRuntimeTile(tileId),
      tile_id: tileId,
      type
    });
  }
  return out;
}

export interface WorldRuntimeTakeResponse {
  inventory_item?: WorldRuntimeInventorySource | null;
  respawn?: { due_at_ms?: unknown; source_object_key?: unknown };
  target?: WorldRuntimeInventorySource | null;
}

export function hiddenWorldObjectKeysFromMetaRuntime(
  meta: WorldRuntimeMeta | null | undefined,
  nowMs: number,
  fallbackRespawnMs: number
): HiddenWorldObjectMapRuntime | null {
  if (!meta || !Array.isArray(meta.hidden_objects)) {
    return null;
  }
  const out: HiddenWorldObjectMapRuntime = {};
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
      out[key] = dueAtMs;
    }
  }
  return out;
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
  const out = await request("/api/world/objects/interact", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      verb: "take",
      target_key: targetKey,
      actor_id: String(args.actorId || "Avatar"),
      actor_x: Number(args.actorX) | 0,
      actor_y: Number(args.actorY) | 0,
      actor_z: Number(args.actorZ) | 0
    })
  }, true);
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
  const out = await request("/api/world/objects/interact", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      verb: "drop",
      target_key: targetKey,
      actor_id: String(args.actorId || "Avatar"),
      actor_x: Number(args.actorX) | 0,
      actor_y: Number(args.actorY) | 0,
      actor_z: Number(args.actorZ) | 0,
      drop_x: Number(args.dropX ?? args.actorX) | 0,
      drop_y: Number(args.dropY ?? args.actorY) | 0,
      drop_z: Number(args.dropZ ?? args.actorZ) | 0
    })
  }, true);
  return out && typeof out === "object" ? out : null;
}

export function normalizeIntroPhaseRuntime(phase: unknown): "pre_intro" | "post_intro" {
  return String(phase || "").trim().toLowerCase() === "pre_intro" ? "pre_intro" : "post_intro";
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
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      phase: requested
    })
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
  const out = await request("/api/world/critical-items/maintenance", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  }, true);
  return Array.isArray(out?.events) ? out.events as CriticalMaintenanceEvent[] : [];
}

export async function requestWorldObjectsAtCell(
  x: number,
  y: number,
  z: number,
  request: WorldRuntimeRequest
): Promise<WorldRuntimeJson | null> {
  return requestWorldObjectsAroundRuntime({ x, y, z, radius: 0, limit: 128 }, request);
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
  setStatus: (level: string, text: string) => void;
  setDiag: (kind: "ok" | "warn", text: string) => void;
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
