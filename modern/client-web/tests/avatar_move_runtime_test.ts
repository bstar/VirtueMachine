import assert from "node:assert/strict";
import { applyAvatarMoveCommandRuntime } from "../sim/avatar_move_runtime.ts";

function makeSim(overrides = {}) {
  return {
    avatarPose: "stand",
    avatarPoseAnchor: null,
    avatarPoseSetTick: -1,
    tick: 10,
    world: { map_x: 5, map_y: 6, map_z: 1 },
    ...overrides
  };
}

{
  const sim = makeSim({
    avatarPose: "sit",
    avatarPoseAnchor: { x: 5, y: 6, z: 1, order: 2, type: 0x0fc },
    avatarPoseSetTick: 10
  });
  const result = applyAvatarMoveCommandRuntime(sim, 1, 0, {
    isBlockedAt: () => false,
    movementMode: "avatar"
  });
  assert.deepEqual(result, {
    kind: "pose-set-this-tick",
    moved: false,
    targetX: 6,
    targetY: 6,
    targetZ: 1
  });
  assert.equal(sim.avatarPose, "sit");
  assert.deepEqual(sim.world, { map_x: 5, map_y: 6, map_z: 1 });
}

{
  const sim = makeSim({
    avatarPose: "sleep",
    avatarPoseAnchor: { x: 5, y: 6, z: 1, order: 4, type: 0x0a3 },
    avatarPoseSetTick: 8
  });
  const result = applyAvatarMoveCommandRuntime(sim, 1, -1, {
    isBlockedAt: () => false,
    movementMode: "avatar"
  });
  assert.deepEqual(result, {
    kind: "avatar-move",
    moved: true,
    targetX: 6,
    targetY: 5,
    targetZ: 1
  });
  assert.equal(sim.avatarPose, "stand");
  assert.equal(sim.avatarPoseAnchor, null);
  assert.equal(sim.avatarPoseSetTick, -1);
  assert.deepEqual(sim.world, { map_x: 6, map_y: 5, map_z: 1 });
}

{
  const sim = makeSim();
  const result = applyAvatarMoveCommandRuntime(sim, 1, 0, {
    isBlockedAt: (x, y, z) => x === 6 && y === 6 && z === 1,
    movementMode: "avatar"
  });
  assert.deepEqual(result, {
    kind: "blocked",
    moved: false,
    targetX: 6,
    targetY: 6,
    targetZ: 1
  });
  assert.deepEqual(sim.world, { map_x: 5, map_y: 6, map_z: 1 });
}

{
  const sim = makeSim({ avatarPose: "sit", avatarPoseAnchor: { x: 1, y: 2, z: 1, order: 3, type: 0x0fc } });
  const result = applyAvatarMoveCommandRuntime(sim, -2, 3, {
    isBlockedAt: () => true,
    movementMode: "free"
  });
  assert.deepEqual(result, {
    kind: "free-move",
    moved: true,
    targetX: 3,
    targetY: 9,
    targetZ: 1
  });
  assert.equal(sim.avatarPose, "stand");
  assert.deepEqual(sim.world, { map_x: 3, map_y: 9, map_z: 1 });
}

{
  const sim = makeSim({ world: { map_x: 4095, map_y: -4096, map_z: 2 } });
  const result = applyAvatarMoveCommandRuntime(sim, 10, -10, {
    isBlockedAt: () => false,
    movementMode: "avatar"
  });
  assert.deepEqual(result, {
    kind: "avatar-move",
    moved: true,
    targetX: 4095,
    targetY: -4096,
    targetZ: 2
  });
  assert.deepEqual(sim.world, { map_x: 4095, map_y: -4096, map_z: 2 });
}

console.log("avatar_move_runtime_test: ok");
