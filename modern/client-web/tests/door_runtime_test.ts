import assert from "node:assert/strict";
import {
  doorStateKeyRuntime,
  doorToggleMaskRuntime,
  doorToggleMessageRuntime,
  isCloseableDoorTypeRuntime,
  isDoorFrameOpenRuntime,
  isDoorToggledRuntime,
  resolveDoorTileIdRuntime,
  resolvedDoorFrameRuntime,
  toggleDoorAtCellRuntime,
  toggleDoorStateRuntime
} from "../sim/door_runtime.ts";

const door = { baseTile: 0x500, frame: 5, order: 7, type: 0x129, x: 10, y: 20, z: 0 };
assert.equal(isCloseableDoorTypeRuntime(0x129), true);
assert.equal(isCloseableDoorTypeRuntime(0x100), false);
assert.equal(doorStateKeyRuntime(door), "10,20,0,7");
assert.equal(doorToggleMaskRuntime(0x129), 4);
assert.equal(doorToggleMaskRuntime(0x14e), 1);

const sim = {};
assert.equal(isDoorToggledRuntime(sim, door), false);
assert.equal(toggleDoorStateRuntime(sim, door), true);
assert.equal(isDoorToggledRuntime(sim, door), true);
assert.equal(resolvedDoorFrameRuntime(sim, door), 1);
assert.equal(resolveDoorTileIdRuntime(sim, door), 0x501);
assert.equal(toggleDoorStateRuntime(sim, door), false);
assert.equal(isDoorToggledRuntime(sim, door), false);
assert.equal(resolvedDoorFrameRuntime(sim, door), 5);

assert.equal(isDoorFrameOpenRuntime(0x129, 1), true);
assert.equal(isDoorFrameOpenRuntime(0x129, 5), false);
assert.equal(isDoorFrameOpenRuntime(0x14e, 1), true);
assert.equal(isDoorFrameOpenRuntime(0x14e, 0), false);

assert.equal(
  doorToggleMessageRuntime({ afterOpen: true, beforeOpen: false, x: 1, y: 2, z: 0 }),
  "Opened door at 1,2,0"
);
assert.equal(
  doorToggleMessageRuntime({ afterOpen: false, beforeOpen: true, x: 1, y: 2, z: 0 }),
  "Closed door at 1,2,0"
);
assert.equal(
  doorToggleMessageRuntime({ afterOpen: true, beforeOpen: true, x: 1, y: 2, z: 0 }),
  "Toggled door at 1,2,0"
);

{
  const sim = {};
  const closedDoor = { baseTile: 0x500, frame: 5, order: 1, type: 0x129, x: 4, y: 5, z: 0 };
  const result = toggleDoorAtCellRuntime({
    sim,
    objectsAt: (x, y, z) => [
      { baseTile: 0x100, frame: 0, order: 0, type: 0x100, x, y, z },
      closedDoor
    ],
    x: 4,
    y: 5,
    z: 0
  });
  assert.equal(result.toggled, true);
  assert.equal(result.toggled && result.beforeOpen, false);
  assert.equal(result.toggled && result.afterOpen, true);
  assert.equal(result.toggled && result.message, "Opened door at 4,5,0");
  assert.equal(isDoorToggledRuntime(sim, closedDoor), true);
}

{
  const result = toggleDoorAtCellRuntime({
    sim: {},
    objectsAt: () => [{ baseTile: 0x100, frame: 0, order: 0, type: 0x100, x: 1, y: 2, z: 0 }],
    x: 1,
    y: 2,
    z: 0
  });
  assert.deepEqual(result, { toggled: false, x: 1, y: 2, z: 0 });
}

console.log("door_runtime_test: ok");
