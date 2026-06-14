import assert from "node:assert/strict";
import {
  advanceWorldClockMinuteRuntime,
  clampIntRuntime,
  computeSnapshotHashRuntime,
  decodePackedCoordRuntime,
  defaultWorldClockRuntime,
  deterministicRecoveryTickLastRuntime,
  normalizeWorldClockRuntime,
  parseU16LERuntime,
  queryIntOrRuntime
} from "../server_runtime.ts";

assert.deepEqual(defaultWorldClockRuntime(1234), {
  tick: 0,
  time_m: 0,
  time_h: 0,
  date_d: 1,
  date_m: 1,
  date_y: 1,
  last_advanced_at_ms: 1234
});

assert.deepEqual(normalizeWorldClockRuntime({
  tick: -1,
  time_m: 59,
  time_h: 23,
  date_d: 0,
  date_m: 13,
  date_y: 5,
  last_advanced_at_ms: 0
}, 999), {
  tick: 0xffffffff,
  time_m: 59,
  time_h: 23,
  date_d: 1,
  date_m: 13,
  date_y: 5,
  last_advanced_at_ms: 999
});

assert.equal(parseU16LERuntime(new Uint8Array([0x34, 0x12]), 0), 0x1234);
assert.deepEqual(decodePackedCoordRuntime(0xff, 0x03, 0xf0), { x: 0x3ff, y: 0, z: 0x0f });

assert.equal(clampIntRuntime(-5, 0, 10), 0);
assert.equal(clampIntRuntime(99, 0, 10), 10);
assert.equal(clampIntRuntime(7, 0, 10), 7);

const url = new URL("http://example.test/?x=42&bad=nope");
assert.equal(queryIntOrRuntime(url, "x", 1), 42);
assert.equal(queryIntOrRuntime(url, "bad", 1), 1);
assert.equal(queryIntOrRuntime(url, "missing", 1), 1);

const clock = {
  tick: 0,
  time_m: 59,
  time_h: 23,
  date_d: 28,
  date_m: 13,
  date_y: 1,
  last_advanced_at_ms: 0
};
advanceWorldClockMinuteRuntime(clock, {
  daysPerMonth: 28,
  hoursPerDay: 24,
  minutesPerHour: 60,
  monthsPerYear: 13
});
assert.deepEqual(clock, {
  tick: 0,
  time_m: 0,
  time_h: 0,
  date_d: 1,
  date_m: 1,
  date_y: 2,
  last_advanced_at_ms: 0
});

assert.equal(
  computeSnapshotHashRuntime(""),
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
);
assert.equal(deterministicRecoveryTickLastRuntime([
  { item_id: "a", tick: 10 },
  { item_id: "b", tick: 30 },
  { item_id: "a", tick: 20 }
], "a"), 20);
assert.equal(deterministicRecoveryTickLastRuntime([{ item_id: "b", tick: 30 }], "a"), null);

console.log("server_runtime_test: ok");
