import assert from "node:assert/strict";
import { expireRemovedWorldPropsRuntime } from "../sim/sim_utils_runtime.ts";

const sim = {
  removedObjectKeys: {
    active: true,
    stale: 1,
    falseFlag: 0
  },
  removedObjectAtTick: {
    active: 95,
    stale: 80,
    falseFlag: 99
  },
  removedObjectCount: 3
};

expireRemovedWorldPropsRuntime(sim, 100, 10);

assert.deepEqual(sim.removedObjectKeys, { active: true });
assert.deepEqual(sim.removedObjectAtTick, { active: 95 });
assert.equal(sim.removedObjectCount, 1);

const emptySim = {
  removedObjectKeys: {},
  removedObjectAtTick: {},
  removedObjectCount: 4
};

expireRemovedWorldPropsRuntime(emptySim, 100, 10);
assert.equal(emptySim.removedObjectCount, 0);

console.log("sim_utils_runtime_test: ok");
