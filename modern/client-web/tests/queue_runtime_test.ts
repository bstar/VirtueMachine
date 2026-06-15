import assert from "node:assert/strict";
import {
  LEGACY_COMMAND_TYPE_RUNTIME,
  LEGACY_MOUSE_CURSOR_INDEX_RUNTIME,
  LEGACY_TARGET_VERB_RUNTIME,
  LEGACY_WORLD_CURSOR_TILE_RUNTIME,
  buildLegacyWireCommandRuntime,
  legacyVerbCommandTypeRuntime,
  legacyVerbLabelRuntime,
  legacyVerbMouseCursorIndexRuntime,
  legacyVerbSelectRangeRuntime,
  legacyVerbWorldCursorTileRuntime,
  normalizeLegacyTargetVerbRuntime
} from "../sim/legacy_command_runtime.ts";
import {
  appendCommandLogRuntime,
  enqueueCommandRuntime,
  filterFutureCommandsOfTypeRuntime,
  partitionCommandsForTickRuntime,
  queueAvatarMoveCommandRuntime,
  queueCellCommandRuntime,
  queueFacingUseCommandRuntime,
  queueLegacyTargetVerbCommandRuntime,
  shouldSuppressRepeatedMoveRuntime,
  upsertMoveCommandForTickRuntime
} from "../sim/queue_runtime.ts";

const MOVE = 1;
const USE = 2;

assert.equal(normalizeLegacyTargetVerbRuntime("Attack"), LEGACY_TARGET_VERB_RUNTIME.ATTACK);
assert.equal(normalizeLegacyTargetVerbRuntime("invalid"), null);
assert.equal(legacyVerbLabelRuntime("cast"), "Cast");
assert.equal(legacyVerbSelectRangeRuntime("get"), -1);
assert.equal(legacyVerbWorldCursorTileRuntime("get"), LEGACY_WORLD_CURSOR_TILE_RUNTIME.DIRECTION);
assert.equal(legacyVerbWorldCursorTileRuntime("drop"), LEGACY_WORLD_CURSOR_TILE_RUNTIME.SELECT);
assert.equal(legacyVerbMouseCursorIndexRuntime("drop"), LEGACY_MOUSE_CURSOR_INDEX_RUNTIME.SELECT);
assert.equal(legacyVerbMouseCursorIndexRuntime("invalid"), LEGACY_MOUSE_CURSOR_INDEX_RUNTIME.POINTER);
assert.equal(legacyVerbCommandTypeRuntime("talk"), LEGACY_COMMAND_TYPE_RUNTIME.TALK_AT_CELL);
assert.deepEqual(buildLegacyWireCommandRuntime(7, LEGACY_COMMAND_TYPE_RUNTIME.USE_AT_CELL, 10, 11), {
  tick: 7,
  type: LEGACY_COMMAND_TYPE_RUNTIME.USE_AT_CELL,
  arg0: 10,
  arg1: 11
});

const commandLog = [{ type: 99, tick: 0 }];
appendCommandLogRuntime(commandLog, { type: USE, tick: 1 }, 1);
assert.deepEqual(commandLog, [{ type: USE, tick: 1 }]);

const clonedCommand = { type: USE, tick: 2, arg0: 4 };
appendCommandLogRuntime(commandLog, clonedCommand, 2);
clonedCommand.arg0 = 9;
assert.deepEqual(commandLog[1], { type: USE, tick: 2, arg0: 4 });

assert.equal(shouldSuppressRepeatedMoveRuntime({
  dx: 1,
  dy: 0,
  lastDx: 1,
  lastDy: 0,
  lastQueuedAtMs: 100,
  nowMs: 120,
  minIntervalMs: 50
}), true);
assert.equal(shouldSuppressRepeatedMoveRuntime({
  dx: 0,
  dy: 1,
  lastDx: 1,
  lastDy: 0,
  lastQueuedAtMs: 100,
  nowMs: 120,
  minIntervalMs: 50
}), false);

const queue = [
  { type: MOVE, tick: 2, arg0: 1, arg1: 0 },
  { type: USE, tick: 3, arg0: 10, arg1: 20 },
  { type: MOVE, tick: 5, arg0: 0, arg1: 1 }
];
assert.deepEqual(filterFutureCommandsOfTypeRuntime(queue, 2, MOVE), [
  { type: MOVE, tick: 2, arg0: 1, arg1: 0 },
  { type: USE, tick: 3, arg0: 10, arg1: 20 }
]);

assert.deepEqual(partitionCommandsForTickRuntime(queue, 3), {
  due: [{ type: USE, tick: 3, arg0: 10, arg1: 20 }],
  pending: [
    { type: MOVE, tick: 2, arg0: 1, arg1: 0 },
    { type: MOVE, tick: 5, arg0: 0, arg1: 1 }
  ]
});

const upsertQueue = [
  { type: MOVE, tick: 4, arg0: 1, arg1: 0 },
  { type: USE, tick: 4, arg0: 7, arg1: 8 }
];
const upsertLog = [{ type: MOVE, tick: 4, arg0: 1, arg1: 0 }];
assert.equal(upsertMoveCommandForTickRuntime({
  queue: upsertQueue,
  commandLog: upsertLog,
  cmd: { type: MOVE, tick: 4, arg0: -1, arg1: 0 },
  targetTick: 4,
  moveType: MOVE,
  commandLogMax: 10
}), true);
assert.deepEqual(upsertQueue, [
  { type: MOVE, tick: 4, arg0: -1, arg1: 0 },
  { type: USE, tick: 4, arg0: 7, arg1: 8 }
]);
assert.deepEqual(upsertLog, [{ type: MOVE, tick: 4, arg0: -1, arg1: 0 }]);

const enqueueQueue = [];
const enqueueLog = [];
enqueueCommandRuntime({
  queue: enqueueQueue,
  commandLog: enqueueLog,
  cmd: { type: USE, tick: 6, arg0: 1 },
  commandLogMax: 5
});
assert.deepEqual(enqueueQueue, [{ type: USE, tick: 6, arg0: 1 }]);
assert.deepEqual(enqueueLog, [{ type: USE, tick: 6, arg0: 1 }]);

{
  const moveState = {
    avatarFacingDx: 0,
    avatarFacingDy: 0,
    avatarWalkAnimUntilMs: -1,
    commandLog: [],
    lastMoveInputDx: 0,
    lastMoveInputDy: 0,
    lastMoveQueueAtMs: -1,
    queue: [],
    sim: { tick: 10 }
  };
  assert.equal(queueAvatarMoveCommandRuntime({
    state: moveState,
    dx: 1,
    dy: 0,
    nowMs: 1000,
    minIntervalMs: 50,
    walkAnimWindowMs: 120,
    commandLogMax: 10
  }), true);
  assert.equal(moveState.avatarFacingDx, 1);
  assert.equal(moveState.avatarWalkAnimUntilMs, 1120);
  assert.deepEqual(moveState.queue, [{ tick: 11, type: LEGACY_COMMAND_TYPE_RUNTIME.MOVE_AVATAR, arg0: 1, arg1: 0 }]);
  assert.deepEqual(moveState.commandLog, [{ tick: 11, type: LEGACY_COMMAND_TYPE_RUNTIME.MOVE_AVATAR, arg0: 1, arg1: 0 }]);

  assert.equal(queueAvatarMoveCommandRuntime({
    state: moveState,
    dx: 1,
    dy: 0,
    nowMs: 1010,
    minIntervalMs: 50,
    walkAnimWindowMs: 120,
    commandLogMax: 10
  }), false);
  assert.equal(moveState.queue.length, 1);

  assert.equal(queueAvatarMoveCommandRuntime({
    state: moveState,
    dx: 0,
    dy: 1,
    nowMs: 1070,
    minIntervalMs: 50,
    walkAnimWindowMs: 120,
    commandLogMax: 10
  }), true);
  assert.deepEqual(moveState.queue, [{ tick: 11, type: LEGACY_COMMAND_TYPE_RUNTIME.MOVE_AVATAR, arg0: 0, arg1: 1 }]);
  assert.deepEqual(moveState.commandLog, [{ tick: 11, type: LEGACY_COMMAND_TYPE_RUNTIME.MOVE_AVATAR, arg0: 0, arg1: 1 }]);
}

{
  const queue = [];
  const commandLog = [];
  queueFacingUseCommandRuntime({
    queue,
    commandLog,
    tick: 20,
    facingDx: -1,
    facingDy: 0,
    commandLogMax: 5
  });
  assert.deepEqual(queue, [{ tick: 21, type: LEGACY_COMMAND_TYPE_RUNTIME.USE_FACING, arg0: -1, arg1: 0 }]);
  assert.deepEqual(commandLog, queue);
}

{
  const queue = [];
  const commandLog = [];
  assert.equal(queueCellCommandRuntime({
    queue,
    commandLog,
    tick: 30,
    commandType: LEGACY_COMMAND_TYPE_RUNTIME.USE_AT_CELL,
    wx: 123.9,
    wy: 44.2,
    commandLogMax: 5
  }), true);
  assert.deepEqual(queue, [{ tick: 31, type: LEGACY_COMMAND_TYPE_RUNTIME.USE_AT_CELL, arg0: 123, arg1: 44 }]);
  assert.equal(queueCellCommandRuntime({
    queue,
    commandLog,
    tick: 30,
    commandType: 0,
    wx: 1,
    wy: 2,
    commandLogMax: 5
  }), false);
  assert.equal(queue.length, 1);
}

{
  const queue = [];
  const commandLog = [];
  assert.equal(queueLegacyTargetVerbCommandRuntime({
    queue,
    commandLog,
    tick: 40,
    verb: "talk",
    wx: 7,
    wy: 8,
    commandLogMax: 5
  }), true);
  assert.deepEqual(queue, [{ tick: 41, type: LEGACY_COMMAND_TYPE_RUNTIME.TALK_AT_CELL, arg0: 7, arg1: 8 }]);
  assert.equal(queueLegacyTargetVerbCommandRuntime({
    queue,
    commandLog,
    tick: 40,
    verb: "invalid",
    wx: 1,
    wy: 2,
    commandLogMax: 5
  }), false);
  assert.equal(queue.length, 1);
}

console.log("queue_runtime_test: ok");
