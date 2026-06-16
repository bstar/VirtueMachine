import { netJsonPostInitRuntime } from "./request_runtime.ts";
import type { SimSnapshotRuntime } from "./snapshot_codec_runtime.ts";

export interface SnapshotRuntimePayload {
  snapshot_base64?: unknown;
  snapshot_meta?: {
    saved_tick?: unknown;
  };
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

export type SnapshotAutosaveStateRuntime = {
  snapshotSaveInFlight: boolean;
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

export function snapshotRouteForCharacterRuntime(characterId: unknown): string {
  const id = String(characterId || "").trim();
  return id ? `/api/characters/${id}/snapshot` : "/api/world/snapshot";
}

export interface SnapshotDiagRuntime {
  diagClass: "diag ok" | "diag warn";
  diagText: string;
}

export interface SnapshotFailurePresentationRuntime extends SnapshotDiagRuntime {
  diagClass: "diag warn";
  statusLevel: "error";
  statusText: string;
}

export type SnapshotButtonRuntime = {
  addEventListener(type: "click", listener: () => void): void;
};

export function remoteSnapshotSavedDiagRuntime(tick: unknown): SnapshotDiagRuntime {
  return {
    diagClass: "diag ok",
    diagText: `Remote snapshot saved at tick ${Number(tick) >>> 0}.`
  };
}

export function remoteSnapshotLoadedDiagRuntime(tick: unknown): SnapshotDiagRuntime {
  return {
    diagClass: "diag ok",
    diagText: `Remote snapshot loaded at tick ${Number(tick) >>> 0}.`
  };
}

export function remoteSnapshotSaveFailureRuntime(reason: unknown): SnapshotFailurePresentationRuntime {
  const text = String(reason || "unknown error");
  return {
    diagClass: "diag warn",
    diagText: `Remote save failed: ${text}`,
    statusLevel: "error",
    statusText: `Save failed: ${text}`
  };
}

export function remoteSnapshotLoadFailureRuntime(reason: unknown): SnapshotFailurePresentationRuntime {
  const text = String(reason || "unknown error");
  return {
    diagClass: "diag warn",
    diagText: `Remote load failed: ${text}`,
    statusLevel: "error",
    statusText: `Load failed: ${text}`
  };
}

export function bindRemoteSnapshotButtonRuntime<TOutput = SnapshotRuntimePayload>(args: {
  button?: SnapshotButtonRuntime | null;
  failure: (reason: unknown) => SnapshotFailurePresentationRuntime;
  onSuccess?: (out: TOutput) => void;
  run: () => Promise<TOutput>;
  setDiag: (diag: SnapshotDiagRuntime) => void;
  setStatus: (level: string, text: string) => void;
  success: (out: TOutput) => SnapshotDiagRuntime;
  updateSessionStat: () => void;
}): boolean {
  if (!args.button) {
    return false;
  }
  args.button.addEventListener("click", () => {
    void (async () => {
      try {
        const out = await args.run();
        args.updateSessionStat();
        args.onSuccess?.(out);
        args.setDiag(args.success(out));
      } catch (err) {
        const failure = args.failure(err);
        args.setStatus(failure.statusLevel, failure.statusText);
        args.setDiag(failure);
      }
    })();
  });
  return true;
}

export async function performNetSaveSnapshot(deps: SnapshotSaveDeps): Promise<SnapshotRuntimePayload> {
  deps.setStatus("sync", "Saving world snapshot...");
  if (!deps.isAuthenticated()) {
    await deps.ensureAuth();
  }
  const savedTick = deps.currentTick() >>> 0;
  const route = typeof deps.snapshotRoute === "function" ? deps.snapshotRoute() : "/api/world/snapshot";
  const out = await deps.request(route || "/api/world/snapshot", {
    ...netJsonPostInitRuntime({
      schema_version: 1,
      sim_core_version: "client-web-js",
      saved_tick: savedTick,
      snapshot_base64: deps.encodeSnapshot()
    }),
    method: "PUT"
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

export async function performNetAutosaveSnapshotRuntime(
  state: SnapshotAutosaveStateRuntime,
  deps: SnapshotSaveDeps
): Promise<SnapshotRuntimePayload | null> {
  if (state.snapshotSaveInFlight) {
    return null;
  }
  state.snapshotSaveInFlight = true;
  try {
    return await performNetSaveSnapshot(deps);
  } finally {
    state.snapshotSaveInFlight = false;
  }
}
