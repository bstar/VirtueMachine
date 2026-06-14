import assert from "node:assert/strict";
import { hashHexRuntime, simStateHashRuntime } from "../sim/hash_runtime.ts";

const ctx = {
  offset: 0xcbf29ce484222325n,
  prime: 0x100000001b3n,
  mask: 0xffffffffffffffffn
};

const baseState = {
  tick: 1,
  rngState: 2,
  worldFlags: 3,
  commandsApplied: 4,
  world: {
    is_on_quest: 0,
    next_sleep: 1,
    time_m: 2,
    time_h: 3,
    date_d: 4,
    date_m: 5,
    date_y: 6,
    wind_dir: -1,
    active: 7,
    map_x: 8,
    map_y: 9,
    map_z: 0,
    in_combat: 0,
    sound_enabled: 1
  },
  avatarPose: "sit",
  avatarPoseAnchor: { x: 8, y: 9, type: 0x147 },
  doorOpenStates: { b: true, a: false },
  removedObjectKeys: { z: true, a: true },
  removedObjectAtTick: { a: 10, z: 20 },
  inventory: { torch: 2, apple: 1 },
  spawnedWorldObjects: [
    { x: 1, y: 2, type: 3 },
    { x: -1, y: 0, z: 0, type: 4, frame: 1, order: 2 }
  ],
  spawnedWorldSeq: 5
};

const reorderedState = {
  ...baseState,
  doorOpenStates: { a: false, b: true },
  removedObjectKeys: { a: true, z: true },
  removedObjectAtTick: { z: 20, a: 10 },
  inventory: { apple: 1, torch: 2 }
};

const baseHash = simStateHashRuntime(baseState, ctx);
assert.equal(hashHexRuntime(baseHash).length, 16);
assert.equal(simStateHashRuntime(reorderedState, ctx), baseHash, "hash should be stable across object key insertion order");

const changedState = {
  ...baseState,
  inventory: { torch: 3, apple: 1 }
};
assert.notEqual(simStateHashRuntime(changedState, ctx), baseHash, "inventory changes should alter the hash");

console.log("hash_runtime_test: ok");
