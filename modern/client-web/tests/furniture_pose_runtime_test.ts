import assert from "node:assert/strict";
import {
  bedInteractionScoreRuntime,
  chairFrameForCellRuntime,
  furnitureOccupancyCellsRuntime,
  objectIsBedAtCellRuntime,
  objectIsChairAtCellRuntime,
  preferredSleepCellForBedRuntime,
  sleepBedCellFrameOffsetRuntime,
  sleepFrameOffsetForBedAtCellRuntime
} from "../sim/furniture_pose_runtime.ts";

const singleFlags = () => 0;
const horizontalFlags = () => 0x80;
const verticalFlags = () => 0x40;
const doubleFlags = () => 0xc0;

const bed = {
  baseTile: 0x300,
  frame: 0,
  order: 4,
  type: 0x0a3,
  x: 12,
  y: 20,
  z: 1
};

assert.deepEqual(furnitureOccupancyCellsRuntime(bed, singleFlags), [{ x: 12, y: 20 }]);
assert.deepEqual(furnitureOccupancyCellsRuntime(bed, horizontalFlags), [
  { x: 12, y: 20 },
  { x: 11, y: 20 }
]);
assert.deepEqual(furnitureOccupancyCellsRuntime(bed, verticalFlags), [
  { x: 12, y: 20 },
  { x: 12, y: 19 }
]);
assert.deepEqual(furnitureOccupancyCellsRuntime(bed, doubleFlags), [
  { x: 12, y: 20 },
  { x: 11, y: 20 },
  { x: 12, y: 19 },
  { x: 11, y: 19 }
]);
assert.deepEqual(furnitureOccupancyCellsRuntime(null, doubleFlags), []);

assert.equal(sleepBedCellFrameOffsetRuntime(bed, 12, 20, doubleFlags), 0);
assert.equal(sleepBedCellFrameOffsetRuntime(bed, 11, 20, doubleFlags), 1);
assert.equal(sleepBedCellFrameOffsetRuntime(bed, 12, 19, doubleFlags), 2);
assert.equal(sleepBedCellFrameOffsetRuntime(bed, 11, 19, doubleFlags), 3);
assert.equal(sleepBedCellFrameOffsetRuntime(bed, 30, 30, doubleFlags), 0);

assert.equal(sleepFrameOffsetForBedAtCellRuntime({ ...bed, frame: 6 }, 12, 20, doubleFlags), 1);
assert.equal(sleepFrameOffsetForBedAtCellRuntime({ ...bed, frame: 2 }, 12, 19, doubleFlags), 0);
assert.equal(sleepFrameOffsetForBedAtCellRuntime({ ...bed, frame: 0 }, 12, 19, doubleFlags), 1);
assert.equal(sleepFrameOffsetForBedAtCellRuntime({ ...bed, frame: 3 }, 11, 19, doubleFlags), 0);

assert.deepEqual(preferredSleepCellForBedRuntime({ ...bed, frame: 2 }, 100, 100, doubleFlags), {
  x: 12,
  y: 19,
  z: 1
});
assert.deepEqual(preferredSleepCellForBedRuntime({ ...bed, frame: 5 }, 11, 19, doubleFlags), {
  x: 11,
  y: 19,
  z: 1
});

assert.deepEqual(bedInteractionScoreRuntime({ ...bed, frame: 2 }, 12, 18, doubleFlags), {
  valid: true,
  dist: 1
});
assert.deepEqual(bedInteractionScoreRuntime({ ...bed, frame: 4 }, 12, 20, doubleFlags), {
  valid: false,
  dist: 0
});

assert.equal(objectIsBedAtCellRuntime(bed, 11, 19, doubleFlags), true);
assert.equal(objectIsBedAtCellRuntime(bed, 10, 19, doubleFlags), false);
assert.equal(objectIsBedAtCellRuntime({ ...bed, type: 0x0fc }, 12, 20, doubleFlags), false);

const chair = {
  baseTile: 0x400,
  frame: 3,
  order: 2,
  type: 0x0fc,
  x: 5,
  y: 6,
  z: 0
};

assert.equal(chairFrameForCellRuntime(chair, 5, 6, () => []), 3);
assert.equal(objectIsChairAtCellRuntime(chair, 5, 6, singleFlags, () => []), true);
assert.equal(objectIsChairAtCellRuntime(chair, 4, 6, horizontalFlags, () => []), true);
assert.equal(objectIsChairAtCellRuntime(chair, 3, 6, horizontalFlags, () => []), false);

const footprintChair = {
  baseTile: 0x500,
  frame: 0,
  order: 8,
  type: 0x147,
  x: 30,
  y: 31,
  z: 0
};

assert.equal(
  chairFrameForCellRuntime(footprintChair, 29, 31, () => [
    { x: 30, y: 31, tileId: 0x500 },
    { x: 29, y: 31, tileId: 0x502 }
  ]),
  2
);
assert.equal(
  objectIsChairAtCellRuntime(footprintChair, 29, 31, singleFlags, () => [
    { x: 30, y: 31, tileId: 0x500 },
    { x: 29, y: 31, tileId: 0x502 }
  ]),
  true
);
assert.equal(
  objectIsChairAtCellRuntime(footprintChair, 30, 31, singleFlags, () => [
    { x: 30, y: 31, tileId: 0x500 }
  ]),
  false
);

console.log("furniture_pose_runtime_test: ok");
