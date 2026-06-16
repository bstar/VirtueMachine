import assert from "node:assert/strict";
import {
  applyAvatarMoveCommandRuntime,
  avatarMoveAnimationPatchRuntime,
  avatarWalkPresentationActiveRuntime,
  countQueuedAvatarMoveCommandsRuntime
} from "../sim/avatar_move_runtime.ts";
import { LEGACY_COMMAND_TYPE_RUNTIME } from "../sim/legacy_command_runtime.ts";

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

assert.deepEqual(avatarMoveAnimationPatchRuntime({
  result: {
    kind: "avatar-move",
    moved: true,
    targetX: 6,
    targetY: 6,
    targetZ: 1
  },
  simTick: 17,
  nowMs: 1000,
  walkAnimWindowMs: 280
}), {
  avatarLastMoveTick: 17,
  avatarWalkAnimUntilMs: 1280
});

assert.equal(avatarWalkPresentationActiveRuntime({
  queuedMoveCount: 1,
  nowMs: 1500,
  walkAnimUntilMs: 1200
}), false);
assert.equal(avatarWalkPresentationActiveRuntime({
  queuedMoveCount: 0,
  nowMs: 1199,
  walkAnimUntilMs: 1200
}), true);
assert.equal(avatarWalkPresentationActiveRuntime({
  queuedMoveCount: 0,
  nowMs: 1201,
  walkAnimUntilMs: 1200
}), false);
assert.equal(countQueuedAvatarMoveCommandsRuntime(null), 0);
assert.equal(countQueuedAvatarMoveCommandsRuntime([
  { type: LEGACY_COMMAND_TYPE_RUNTIME.MOVE_AVATAR },
  { type: LEGACY_COMMAND_TYPE_RUNTIME.USE_FACING },
  "bad",
  { type: LEGACY_COMMAND_TYPE_RUNTIME.MOVE_AVATAR }
]), 2);

for (const result of [
  {
    kind: "free-move" as const,
    moved: true,
    targetX: 6,
    targetY: 6,
    targetZ: 1
  }
] as const) {
  assert.deepEqual(avatarMoveAnimationPatchRuntime({
    result,
    simTick: 17,
    nowMs: 1000,
    walkAnimWindowMs: 280
  }), {
    avatarLastMoveTick: null,
    avatarWalkAnimUntilMs: null
  });
}

assert.deepEqual(avatarMoveAnimationPatchRuntime({
  result: {
    kind: "blocked",
    moved: false,
    targetX: 6,
    targetY: 6,
    targetZ: 1
  },
  simTick: 17,
  nowMs: 1000,
  walkAnimWindowMs: 280
}), {
  avatarLastMoveTick: null,
  avatarWalkAnimUntilMs: -1
});

console.log("avatar_move_runtime_test: ok");
