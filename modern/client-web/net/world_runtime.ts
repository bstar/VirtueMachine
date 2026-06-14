export type WorldRuntimeRequest = (
  route: string,
  init?: RequestInit,
  auth?: boolean
) => Promise<WorldRuntimeJson | null>;

export interface WorldRuntimeJson {
  [key: string]: unknown;
}

export interface WorldRuntimeObject {
  type?: number;
  x?: number;
  y?: number;
  z?: number;
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
  [key: string]: unknown;
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
