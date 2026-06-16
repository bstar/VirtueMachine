import assert from "node:assert/strict";
import {
  decodeSimSnapshotBase64Runtime,
  encodeSimSnapshotBase64Runtime,
  normalizeLoadedSimStateRuntime,
  type SimSnapshotRuntime
} from "../net/snapshot_codec_runtime.ts";
import {
  bindRemoteSnapshotButtonRuntime,
  performNetAutosaveSnapshotRuntime,
  performNetLoadSnapshot,
  performNetSaveSnapshot,
  remoteSnapshotLoadedDiagRuntime,
  remoteSnapshotLoadFailureRuntime,
  remoteSnapshotSavedDiagRuntime,
  remoteSnapshotSaveFailureRuntime,
  shouldAutosaveSnapshotRuntime,
  snapshotBase64Runtime,
  snapshotRouteForCharacterRuntime,
  snapshotSavedTickRuntime
} from "../net/snapshot_runtime.ts";

const sim: SimSnapshotRuntime = {
  tick: 10,
  rngState: 1,
  worldFlags: 2,
  commandsApplied: 3,
  doorOpenStates: { door: true },
  removedObjectKeys: { obj: 1 },
  removedObjectAtTick: {},
  removedObjectCount: 0,
  inventory: { "0x088:0x00": 2 },
  spawnedWorldObjects: [{ x: 1, y: 2, z: 0, type: 88, frame: 0, order: 3, renderable: true }],
  spawnedWorldSeq: 7,
  partyMembers: [1, 12, 23],
  avatarPose: "sit",
  avatarPoseSetTick: 9,
  avatarPoseAnchor: { x: 1, y: 2, z: 0, order: 3, type: 88 },
  world: {
    is_on_quest: 0,
    next_sleep: 0,
    time_m: 1,
    time_h: 2,
    date_d: 3,
    date_m: 4,
    date_y: 5,
    wind_dir: -1,
    active: 1,
    map_x: 307,
    map_y: 347,
    map_z: 0,
    in_combat: 0,
    sound_enabled: 1
  }
};

const encoded = encodeSimSnapshotBase64Runtime(sim);
const decoded = decodeSimSnapshotBase64Runtime(encoded);
assert.equal(decoded?.tick, 10);
assert.deepEqual(decoded?.doorOpenStates, { door: 1 });
assert.equal(decoded?.removedObjectAtTick.obj, 10);
assert.equal(decoded?.inventory["0x088:0x00"], 2);
assert.equal(decoded?.spawnedWorldObjects[0].type, 88);
assert.deepEqual(decoded?.partyMembers, [1, 12, 23]);
assert.equal(snapshotSavedTickRuntime({ snapshot_meta: { saved_tick: 12 } }), 12);
assert.equal(snapshotSavedTickRuntime(null), 0);
assert.equal(snapshotBase64Runtime({ snapshot_base64: " encoded " }), "encoded");
assert.equal(snapshotBase64Runtime({}), "");
assert.equal(snapshotRouteForCharacterRuntime("char-1"), "/api/characters/char-1/snapshot");
assert.equal(snapshotRouteForCharacterRuntime(" char-1 "), "/api/characters/char-1/snapshot");
assert.equal(snapshotRouteForCharacterRuntime(""), "/api/world/snapshot");
assert.equal(snapshotRouteForCharacterRuntime(null), "/api/world/snapshot");
assert.deepEqual(remoteSnapshotSavedDiagRuntime(123), {
  diagClass: "diag ok",
  diagText: "Remote snapshot saved at tick 123."
});
assert.deepEqual(remoteSnapshotLoadedDiagRuntime(456), {
  diagClass: "diag ok",
  diagText: "Remote snapshot loaded at tick 456."
});
assert.deepEqual(remoteSnapshotSaveFailureRuntime("offline"), {
  diagClass: "diag warn",
  diagText: "Remote save failed: offline",
  statusLevel: "error",
  statusText: "Save failed: offline"
});
assert.deepEqual(remoteSnapshotLoadFailureRuntime("missing"), {
  diagClass: "diag warn",
  diagText: "Remote load failed: missing",
  statusLevel: "error",
  statusText: "Load failed: missing"
});

{
  let listener: (() => void) | null = null;
  const diags: string[] = [];
  const statuses: string[] = [];
  let sessionStatUpdates = 0;
  assert.equal(bindRemoteSnapshotButtonRuntime({
    button: {
      addEventListener(type: "click", fn: () => void) {
        assert.equal(type, "click");
        listener = fn;
      }
    },
    run: async () => ({ snapshot_meta: { saved_tick: 99 } }),
    updateSessionStat: () => { sessionStatUpdates += 1; },
    success: (out) => remoteSnapshotLoadedDiagRuntime(snapshotSavedTickRuntime(out)),
    failure: remoteSnapshotLoadFailureRuntime,
    setStatus: (level, text) => statuses.push(`${level}:${text}`),
    setDiag: (diag) => diags.push(`${diag.diagClass}:${diag.diagText}`)
  }), true);
  listener?.();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(sessionStatUpdates, 1);
  assert.deepEqual(statuses, []);
  assert.deepEqual(diags, ["diag ok:Remote snapshot loaded at tick 99."]);
}

{
  let listener: (() => void) | null = null;
  const diags: string[] = [];
  const statuses: string[] = [];
  let sessionStatUpdates = 0;
  assert.equal(bindRemoteSnapshotButtonRuntime({
    button: {
      addEventListener(_type: "click", fn: () => void) {
        listener = fn;
      }
    },
    run: async () => {
      throw new Error("offline");
    },
    updateSessionStat: () => { sessionStatUpdates += 1; },
    success: remoteSnapshotSavedDiagRuntime,
    failure: remoteSnapshotSaveFailureRuntime,
    setStatus: (level, text) => statuses.push(`${level}:${text}`),
    setDiag: (diag) => diags.push(`${diag.diagClass}:${diag.diagText}`)
  }), true);
  listener?.();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(sessionStatUpdates, 0);
  assert.deepEqual(statuses, ["error:Save failed: Error: offline"]);
  assert.deepEqual(diags, ["diag warn:Remote save failed: Error: offline"]);
}

assert.equal(bindRemoteSnapshotButtonRuntime({
  button: null,
  run: async () => ({}),
  updateSessionStat: () => {},
  success: remoteSnapshotSavedDiagRuntime,
  failure: remoteSnapshotSaveFailureRuntime,
  setStatus: () => {},
  setDiag: () => {}
}), false);

assert.equal(normalizeLoadedSimStateRuntime({}), null);
const malformedSnapshot = normalizeLoadedSimStateRuntime({
  tick: 77,
  doorOpenStates: ["bad"],
  inventory: ["bad"],
  removedObjectKeys: { stale: true },
  removedObjectAtTick: ["bad"],
  spawnedWorldObjects: ["bad"],
  partyMembers: [],
  world: {
    map_x: 10,
    map_y: 11,
    map_z: 0
  }
});
assert.equal(malformedSnapshot?.tick, 77);
assert.deepEqual(malformedSnapshot?.doorOpenStates, {});
assert.deepEqual(malformedSnapshot?.inventory, {});
assert.deepEqual(malformedSnapshot?.removedObjectAtTick, { stale: 77 });
assert.equal(malformedSnapshot?.spawnedWorldObjects[0].type, 0);
assert.deepEqual(malformedSnapshot?.partyMembers, [1]);

assert.equal(shouldAutosaveSnapshotRuntime({
  currentTick: 0,
  intervalTicks: 10,
  isAuthenticated: true,
  isSessionStarted: true,
  lastSavedTick: 0
}), false);
assert.equal(shouldAutosaveSnapshotRuntime({
  currentTick: 9,
  intervalTicks: 10,
  isAuthenticated: true,
  isSessionStarted: true,
  lastSavedTick: 0
}), false);
assert.equal(shouldAutosaveSnapshotRuntime({
  currentTick: 10,
  intervalTicks: 10,
  isAuthenticated: true,
  isSessionStarted: true,
  lastSavedTick: 0
}), true);
assert.equal(shouldAutosaveSnapshotRuntime({
  currentTick: 20,
  intervalTicks: 10,
  isAuthenticated: false,
  isSessionStarted: true,
  lastSavedTick: 0
}), false);
assert.equal(shouldAutosaveSnapshotRuntime({
  currentTick: 20,
  intervalTicks: 10,
  isAuthenticated: true,
  isSessionStarted: false,
  lastSavedTick: 0
}), false);
assert.equal(shouldAutosaveSnapshotRuntime({
  currentTick: 20,
  intervalTicks: 10,
  isAuthenticated: true,
  isInFlight: true,
  isSessionStarted: true,
  lastSavedTick: 0
}), false);
assert.equal(shouldAutosaveSnapshotRuntime({
  currentTick: 20,
  intervalTicks: 10,
  isAuthenticated: true,
  isSessionStarted: true,
  lastSavedTick: 0,
  syncPaused: true
}), false);

{
  const statuses: string[] = [];
  let savedTick = 0;
  const out = await performNetSaveSnapshot({
    ensureAuth: async () => {},
    isAuthenticated: () => true,
    request: async (route, init, auth) => {
      assert.equal(route, "/snapshot");
      assert.equal(auth, true);
      const body = JSON.parse(String(init?.body || "{}"));
      assert.equal(body.saved_tick, 10);
      assert.equal(body.snapshot_base64, "encoded");
      return { snapshot_meta: { saved_tick: 10 } };
    },
    snapshotRoute: () => "/snapshot",
    encodeSnapshot: () => "encoded",
    currentTick: () => 10,
    onSavedTick: (tick) => { savedTick = tick; },
    resetBackgroundFailures: () => {},
    setStatus: (level, text) => statuses.push(`${level}:${text}`)
  });
  assert.equal(snapshotSavedTickRuntime(out), 10);
  assert.equal(savedTick, 10);
  assert.deepEqual(statuses, ["sync:Saving world snapshot...", "online:Saved tick 10"]);
}

{
  let requestCount = 0;
  const state = { snapshotSaveInFlight: true };
  const out = await performNetAutosaveSnapshotRuntime(state, {
    ensureAuth: async () => {},
    isAuthenticated: () => true,
    request: async () => {
      requestCount += 1;
      return {};
    },
    encodeSnapshot: () => "encoded",
    currentTick: () => 10,
    onSavedTick: () => {},
    resetBackgroundFailures: () => {},
    setStatus: () => {}
  });
  assert.equal(out, null);
  assert.equal(requestCount, 0);
  assert.equal(state.snapshotSaveInFlight, true);
}

{
  const state = { snapshotSaveInFlight: false };
  const out = await performNetAutosaveSnapshotRuntime(state, {
    ensureAuth: async () => {},
    isAuthenticated: () => true,
    request: async () => ({ snapshot_meta: { saved_tick: 11 } }),
    snapshotRoute: () => "/snapshot",
    encodeSnapshot: () => "encoded",
    currentTick: () => 11,
    onSavedTick: (tick) => {
      assert.equal(tick, 11);
    },
    resetBackgroundFailures: () => {},
    setStatus: () => {}
  });
  assert.equal(snapshotSavedTickRuntime(out), 11);
  assert.equal(state.snapshotSaveInFlight, false);
}

{
  let applied: SimSnapshotRuntime | null = null;
  const out = await performNetLoadSnapshot({
    ensureAuth: async () => {},
    isAuthenticated: () => true,
    request: async () => ({ snapshot_base64: encoded, snapshot_meta: { saved_tick: 10 } }),
    snapshotRoute: () => "/snapshot",
    decodeSnapshot: decodeSimSnapshotBase64Runtime,
    applyLoadedSim: (loaded) => { applied = loaded; },
    resetBackgroundFailures: () => {},
    setStatus: () => {}
  });
  assert.equal(snapshotSavedTickRuntime(out), 10);
  assert.equal(applied?.tick, 10);
}

console.log("net_snapshot_runtime_test: ok");
