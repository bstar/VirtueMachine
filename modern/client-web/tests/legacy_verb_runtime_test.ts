import assert from "node:assert/strict";
import {
  legacyCastVerbRuntime,
  legacyDropVerbRuntime,
  legacyMoveVerbRuntime
} from "../gameplay/legacy_verb_runtime.ts";

assert.deepEqual(legacyCastVerbRuntime(10, 11, 1), {
  diagClass: "ok",
  ok: true,
  playSfx: "casting_magic_p1",
  text: "Cast: target 10,11,1 accepted (spell system pending)."
});

assert.deepEqual(legacyMoveVerbRuntime(12, 13, 0), {
  diagClass: "ok",
  ok: true,
  text: "Move: target 12,13,0 accepted (object move semantics pending)."
});

const farDropSim = {
  inventory: { "0x123:0x00": 1 },
  world: { map_x: 10, map_y: 10, map_z: 0 }
};
assert.deepEqual(legacyDropVerbRuntime(farDropSim, 12, 10), {
  diagClass: "warn",
  ok: false,
  text: "Drop: target must be adjacent (12,10)."
});
assert.deepEqual(farDropSim.inventory, { "0x123:0x00": 1 });

assert.deepEqual(legacyDropVerbRuntime({
  inventory: {},
  world: { map_x: 10, map_y: 10, map_z: 0 }
}, 11, 10), {
  diagClass: "warn",
  ok: false,
  text: "Drop: inventory is empty."
});

const dropSim = {
  inventory: { "0x123:0x00": 2 },
  world: { map_x: 10, map_y: 10, map_z: 1 }
};
assert.deepEqual(legacyDropVerbRuntime(dropSim, 11, 10), {
  diagClass: "ok",
  ok: true,
  text: "Drop: 0x123:0x00 at 11,10,1 (remaining 1)."
});
assert.deepEqual(dropSim.inventory, { "0x123:0x00": 1 });

console.log("legacy_verb_runtime_test: ok");
