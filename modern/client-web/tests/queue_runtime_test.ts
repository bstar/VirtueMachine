import assert from "node:assert/strict";
import {
  appendCommandLogRuntime,
  enqueueCommandRuntime,
  filterFutureCommandsOfTypeRuntime,
  partitionCommandsForTickRuntime,
  shouldSuppressRepeatedMoveRuntime,
  upsertMoveCommandForTickRuntime
} from "../sim/queue_runtime.ts";

const MOVE = 1;
const USE = 2;

const commandLog = [{ type: 99, tick: 0 }];
appendCommandLogRuntime(commandLog, { type: USE, tick: 1 }, 1);
assert.deepEqual(commandLog, [{ type: USE, tick: 1 }]);

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

console.log("queue_runtime_test: ok");
