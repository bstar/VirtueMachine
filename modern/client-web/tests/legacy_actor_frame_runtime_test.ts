import assert from "node:assert/strict";
import {
  authoritativeActorWalkingRuntime,
  directionGroupFromDxDyRuntime,
  isLegacyFourFrameActorTypeRuntime,
  isLegacyTwoFrameActorTypeRuntime,
  legacyActorDirectionGroupRuntime,
  legacyActorFrameForDirectionRuntime,
  legacyActorStandingTileIdRuntime,
  remotePlayerFrameOffsetRuntime,
  timedWalkAnimationActiveRuntime
} from "../sim/legacy_actor_frame_runtime.ts";

assert.equal(isLegacyFourFrameActorTypeRuntime(0x178), true);
assert.equal(isLegacyFourFrameActorTypeRuntime(0x183), true);
assert.equal(isLegacyFourFrameActorTypeRuntime(0x199), true);
assert.equal(isLegacyFourFrameActorTypeRuntime(0x184), false);

assert.equal(isLegacyTwoFrameActorTypeRuntime(0x15a), true);
assert.equal(isLegacyTwoFrameActorTypeRuntime(0x171), true);
assert.equal(isLegacyTwoFrameActorTypeRuntime(0x1aa), true);
assert.equal(isLegacyTwoFrameActorTypeRuntime(0x178), false);

assert.equal(legacyActorFrameForDirectionRuntime(0x178, 2, false, 0), 9);
assert.equal(legacyActorFrameForDirectionRuntime(0x178, 2, false, 16), 10);
assert.equal(legacyActorFrameForDirectionRuntime(0x178, 2, true, 2), 10);
assert.equal(legacyActorFrameForDirectionRuntime(0x16b, 3, true, 2), 11);
assert.equal(legacyActorFrameForDirectionRuntime(0x15a, 1, false, 16), 3);
assert.equal(legacyActorFrameForDirectionRuntime(0x100, 1, false, 16), null);

assert.equal(legacyActorDirectionGroupRuntime({ authoritativeDirection: 6, direction: 2, frame: 0 }), 3);
assert.equal(legacyActorDirectionGroupRuntime({ direction: 4, frame: 0 }), 2);
assert.equal(legacyActorDirectionGroupRuntime({ frame: 12 }), 3);
assert.equal(legacyActorDirectionGroupRuntime({ authoritativeDirection: Number.NaN, direction: Number.NaN, frame: 8 }), 2);
assert.equal(legacyActorDirectionGroupRuntime(null), 0);

assert.equal(
  legacyActorStandingTileIdRuntime({ baseTile: 0x400, frame: 7, type: 0x178 }, 2, false, 0),
  0x409
);
assert.equal(
  legacyActorStandingTileIdRuntime({ baseTile: 0x400, frame: 7, type: 0x100 }, 2, false, 0),
  0x407
);
assert.equal(timedWalkAnimationActiveRuntime(1120, 1000), true);
assert.equal(timedWalkAnimationActiveRuntime(1120, 1120), true);
assert.equal(timedWalkAnimationActiveRuntime(1119, 1120), false);
assert.equal(timedWalkAnimationActiveRuntime(-1, 0), false);
assert.equal(authoritativeActorWalkingRuntime({
  authoritativeMovedAtMs: 1000,
  authoritativePathStatus: "walking",
  authoritativePose: "walk"
}, 1200), true);
assert.equal(authoritativeActorWalkingRuntime({
  authoritativeMovedAtMs: 1000,
  authoritativePathStatus: "idle",
  authoritativePose: "walk"
}, 1200), false);
assert.equal(authoritativeActorWalkingRuntime({
  authoritativeMovedAtMs: 1000,
  authoritativePathStatus: "walking",
  authoritativePose: "stand"
}, 1200), false);
assert.equal(authoritativeActorWalkingRuntime({
  authoritativeMovedAtMs: 1000,
  authoritativePathStatus: "walking",
  authoritativePose: "walk"
}, 4000), false);
assert.equal(authoritativeActorWalkingRuntime({
  authoritativeMovedAtMs: Number.NaN,
  authoritativePathStatus: "walking",
  authoritativePose: "walk"
}, 1200), false);

assert.equal(directionGroupFromDxDyRuntime(0, -1), 0);
assert.equal(directionGroupFromDxDyRuntime(1, 0), 1);
assert.equal(directionGroupFromDxDyRuntime(0, 1), 2);
assert.equal(directionGroupFromDxDyRuntime(-1, 0), 3);
assert.equal(remotePlayerFrameOffsetRuntime(1, 0), 5);
assert.equal(remotePlayerFrameOffsetRuntime(0, -1), 1);

console.log("legacy_actor_frame_runtime_test: ok");
