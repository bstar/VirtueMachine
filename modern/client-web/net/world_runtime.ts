import { inventoryKeyForObjectRuntime } from "../sim/inventory_runtime.ts";

export type WorldRuntimeRequest = (
  route: string,
  init?: RequestInit,
  auth?: boolean
) => Promise<WorldRuntimeJson | null>;

export interface WorldRuntimeJson {
  [key: string]: unknown;
}

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
};

export type WorldRuntimeInventorySource = object & {
  frame?: unknown;
  objectKey?: unknown;
  object_key?: unknown;
  type?: unknown;
};

export interface WorldRuntimeObjectLayer {
  byCoord?: Map<string, WorldRuntimeObject[]>;
}

export interface CriticalMaintenanceWorldItem {
  item_id: string;
  reachable: boolean;
  at: { x: number; y: number; z: number };
}

export interface CriticalMaintenanceEvent {
  [key: string]: unknown;
}

export type WorldRuntimeInventoryItem = Record<string, unknown> & {
  frame: number;
  type: number;
};

export function serverObjectKeyForWorldObjectRuntime(obj: WorldRuntimeObjectKeySource | null | undefined): string {
  const row = obj || {};
  const direct = String(row.object_key || row.objectKey || "").trim();
  if (direct) {
    return direct;
  }
  const sourceArea = Number(row.sourceArea);
  const index = Number(row.index);
  if (Number.isFinite(sourceArea) && Number.isFinite(index)) {
    return `objblk:${sourceArea | 0}:${index | 0}`;
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

function normalizeInventoryItemRuntime(value: WorldRuntimeInventorySource | null | undefined): WorldRuntimeInventoryItem {
  const row = value || {};
  return {
    ...row,
    frame: Number(row.frame) | 0,
    type: Number(row.type) | 0
  };
}

export interface WorldRuntimeTakeResponse {
  inventory_item?: WorldRuntimeInventorySource | null;
  target?: WorldRuntimeInventorySource | null;
  [key: string]: unknown;
}

export function inventoryItemFromTakeResponseRuntime(
  out: WorldRuntimeTakeResponse | null | undefined,
  fallback: WorldRuntimeInventorySource | null | undefined
): WorldRuntimeInventoryItem {
  return normalizeInventoryItemRuntime(out?.inventory_item || out?.target || fallback);
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

export function normalizeIntroPhaseRuntime(phase: unknown): "pre_intro" | "post_intro" {
  return String(phase || "").trim().toLowerCase() === "pre_intro" ? "pre_intro" : "post_intro";
}

export async function requestIntroPhaseRuntime(
  fallbackPhase: unknown,
  request: WorldRuntimeRequest
): Promise<{ out: WorldRuntimeJson | null; phase: "pre_intro" | "post_intro" }> {
  const out = await request("/api/world/intro-state", { method: "GET" }, true);
  const rawPhase = out && typeof out === "object"
    ? (out.intro_state as { phase?: unknown } | undefined)?.phase
    : null;
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
  const rawPhase = out && typeof out === "object"
    ? (out.intro_state as { phase?: unknown } | undefined)?.phase
    : null;
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
  const out = await request(
    `/api/world/objects?x=${encodeURIComponent(x | 0)}&y=${encodeURIComponent(y | 0)}&z=${encodeURIComponent(z | 0)}&radius=0&limit=128&projection=footprint&include_footprint=1`,
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
