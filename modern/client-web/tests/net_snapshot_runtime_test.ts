import assert from "node:assert/strict";
import {
  decodeSimSnapshotBase64Runtime,
  encodeSimSnapshotBase64Runtime,
  normalizeLoadedSimStateRuntime,
  type SimSnapshotRuntime
} from "../net/snapshot_codec_runtime.ts";
import {
  performNetLoadSnapshot,
  performNetSaveSnapshot,
  shouldAutosaveSnapshotRuntime
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
assert.equal(decoded?.removedObjectAtTick.obj, 10);
assert.equal(decoded?.inventory["0x088:0x00"], 2);
assert.equal(decoded?.spawnedWorldObjects[0].type, 88);

assert.equal(normalizeLoadedSimStateRuntime({}), null);
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
  assert.equal(out.snapshot_meta?.saved_tick, 10);
  assert.equal(savedTick, 10);
  assert.deepEqual(statuses, ["sync:Saving world snapshot...", "online:Saved tick 10"]);
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
  assert.equal(out.snapshot_meta?.saved_tick, 10);
  assert.equal(applied?.tick, 10);
}

console.log("net_snapshot_runtime_test: ok");
