export type SnapshotSaveDeps = {
  ensureAuth: () => Promise<void>;
  isAuthenticated: () => boolean;
  request: (route: string, init?: RequestInit, auth?: boolean) => Promise<any>;
  encodeSnapshot: () => string;
  currentTick: () => number;
  onSavedTick: (tick: number) => void;
  resetBackgroundFailures: () => void;
  setStatus: (level: string, text: string) => void;
};

export type SnapshotLoadDeps = {
  ensureAuth: () => Promise<void>;
  isAuthenticated: () => boolean;
  request: (route: string, init?: RequestInit, auth?: boolean) => Promise<any>;
  decodeSnapshot: (snapshotBase64: string) => any;
  applyLoadedSim: (loaded: any) => void;
  resetBackgroundFailures: () => void;
  setStatus: (level: string, text: string) => void;
};

export async function performNetSaveSnapshot(deps: SnapshotSaveDeps): Promise<any> {
  deps.setStatus("sync", "Saving world snapshot...");
  if (!deps.isAuthenticated()) {
    await deps.ensureAuth();
  }
  const savedTick = deps.currentTick() >>> 0;
  const out = await deps.request("/api/world/snapshot", {
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
  const tickOut = Number(out?.snapshot_meta?.saved_tick || 0) >>> 0;
  deps.onSavedTick(tickOut);
  deps.setStatus("online", `Saved tick ${tickOut}`);
  return out;
}

export async function performNetLoadSnapshot(deps: SnapshotLoadDeps): Promise<any> {
  deps.setStatus("sync", "Loading world snapshot...");
  if (!deps.isAuthenticated()) {
    await deps.ensureAuth();
  }
  const out = await deps.request("/api/world/snapshot", { method: "GET" }, true);
  if (!out?.snapshot_base64) {
    throw new Error("No world snapshot is saved yet");
  }
  const loaded = deps.decodeSnapshot(String(out.snapshot_base64));
  if (!loaded) {
    throw new Error("Snapshot payload is invalid");
  }
  deps.applyLoadedSim(loaded);
  deps.resetBackgroundFailures();
  deps.setStatus("online", `Loaded tick ${Number(out?.snapshot_meta?.saved_tick || 0)}`);
  return out;
}
