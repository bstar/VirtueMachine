import assert from "node:assert/strict";
import {
  createInitialAppSimState,
  toAppSimStateRuntime
} from "../sim/app_state_runtime.ts";
import type { SimSnapshotRuntime } from "../net/snapshot_codec_runtime.ts";

const world: SimSnapshotRuntime["world"] = {
  is_on_quest: 0,
  next_sleep: 0,
  time_m: 1,
  time_h: 2,
  date_d: 3,
  date_m: 4,
  date_y: 5,
  wind_dir: 0,
  active: 0,
  map_x: 10,
  map_y: 20,
  map_z: 0,
  in_combat: 0,
  sound_enabled: 1
};

const initial = createInitialAppSimState(world, 0x12345678);
assert.equal(initial.rngState, 0x12345678);
assert.equal(initial.partySize, 1);
assert.deepEqual(initial.doorOpenStates, {});
initial.world.time_h = 9;
assert.equal(world.time_h, 2);

const snapshot: SimSnapshotRuntime = {
  tick: initial.tick,
  rngState: initial.rngState,
  worldFlags: initial.worldFlags,
  commandsApplied: initial.commandsApplied,
  doorOpenStates: {
    open: true,
    closed: 0,
    count: 3
  },
  removedObjectKeys: {},
  removedObjectAtTick: {},
  removedObjectCount: 0,
  inventory: {},
  spawnedWorldObjects: [],
  spawnedWorldSeq: 0,
  avatarPose: "stand",
  avatarPoseSetTick: -1,
  avatarPoseAnchor: null,
  world
};

const adapted = toAppSimStateRuntime(snapshot, 4);
assert.deepEqual(adapted.doorOpenStates, { open: 1, closed: 0, count: 3 });
assert.equal(adapted.partySize, 4);

const partySnapshot = {
  ...snapshot,
  partySize: 2
} as SimSnapshotRuntime & { partySize: number };
assert.equal(toAppSimStateRuntime(partySnapshot, 4).partySize, 2);

console.log("app_state_runtime_test: ok");
