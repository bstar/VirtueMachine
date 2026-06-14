import type { SimSnapshotRuntime } from "./snapshot_codec_runtime.ts";

export interface SnapshotRuntimePayload {
  snapshot_base64?: unknown;
  snapshot_meta?: {
    saved_tick?: unknown;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export type SnapshotRuntimeRequest = (
  route: string,
  init?: RequestInit,
  auth?: boolean
) => Promise<SnapshotRuntimePayload | null>;

export type SnapshotSaveDeps = {
  ensureAuth: () => Promise<void>;
  isAuthenticated: () => boolean;
  request: SnapshotRuntimeRequest;
  snapshotRoute?: () => string;
  encodeSnapshot: () => string;
  currentTick: () => number;
  onSavedTick: (tick: number) => void;
  resetBackgroundFailures: () => void;
  setStatus: (level: string, text: string) => void;
};

export type SnapshotLoadDeps = {
  ensureAuth: () => Promise<void>;
  isAuthenticated: () => boolean;
  request: SnapshotRuntimeRequest;
  snapshotRoute?: () => string;
  decodeSnapshot: (snapshotBase64: string) => SimSnapshotRuntime | null;
  applyLoadedSim: (loaded: SimSnapshotRuntime) => void;
  resetBackgroundFailures: () => void;
  setStatus: (level: string, text: string) => void;
};

export function shouldAutosaveSnapshotRuntime(args: {
  currentTick: unknown;
  intervalTicks: unknown;
  isAuthenticated: boolean;
  isInFlight?: boolean;
  isSessionStarted: boolean;
  lastSavedTick: unknown;
  syncPaused?: boolean;
}): boolean {
  if (!args.isAuthenticated || !args.isSessionStarted || args.syncPaused || args.isInFlight) {
    return false;
  }
  const currentTick = Number(args.currentTick) >>> 0;
  const lastSavedTick = Number(args.lastSavedTick) >>> 0;
  const intervalTicks = Math.max(1, Number(args.intervalTicks) >>> 0);
  if (currentTick <= 0 || currentTick === lastSavedTick) {
    return false;
  }
  return (currentTick - lastSavedTick) >= intervalTicks;
}

export function snapshotSavedTickRuntime(payload: SnapshotRuntimePayload | null | undefined): number {
  return Number(payload?.snapshot_meta?.saved_tick || 0) >>> 0;
}

export function snapshotBase64Runtime(payload: SnapshotRuntimePayload | null | undefined): string {
  return String(payload?.snapshot_base64 || "").trim();
}

export async function performNetSaveSnapshot(deps: SnapshotSaveDeps): Promise<SnapshotRuntimePayload> {
  deps.setStatus("sync", "Saving world snapshot...");
  if (!deps.isAuthenticated()) {
    await deps.ensureAuth();
  }
  const savedTick = deps.currentTick() >>> 0;
  const route = typeof deps.snapshotRoute === "function" ? deps.snapshotRoute() : "/api/world/snapshot";
  const out = await deps.request(route || "/api/world/snapshot", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      schema_version: 1,
      sim_core_version: "client-web-js",
      saved_tick: savedTick,
      snapshot_base64: deps.encodeSnapshot()
    })
  }, true);
  deps.resetBackgroundFailures();
  const tickOut = snapshotSavedTickRuntime(out);
  deps.onSavedTick(tickOut);
  deps.setStatus("online", `Saved tick ${tickOut}`);
  return out || {};
}

export async function performNetLoadSnapshot(deps: SnapshotLoadDeps): Promise<SnapshotRuntimePayload> {
  deps.setStatus("sync", "Loading world snapshot...");
  if (!deps.isAuthenticated()) {
    await deps.ensureAuth();
  }
  const route = typeof deps.snapshotRoute === "function" ? deps.snapshotRoute() : "/api/world/snapshot";
  const out = await deps.request(route || "/api/world/snapshot", { method: "GET" }, true);
  const snapshotBase64 = snapshotBase64Runtime(out);
  if (!snapshotBase64) {
    throw new Error("No world snapshot is saved yet");
  }
  const loaded = deps.decodeSnapshot(snapshotBase64);
  if (!loaded) {
    throw new Error("Snapshot payload is invalid");
  }
  deps.applyLoadedSim(loaded);
  deps.resetBackgroundFailures();
  deps.setStatus("online", `Loaded tick ${snapshotSavedTickRuntime(out)}`);
  return out || {};
}
