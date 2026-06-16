import assert from "node:assert/strict";
import {
  legacyAttackVerbRuntime,
  legacyCastVerbRuntime,
  legacyDropVerbRuntime,
  legacyDropVerbValidationRuntime,
  legacyMoveVerbRuntime,
  legacyVerbSfxIdRuntime
} from "../gameplay/legacy_verb_runtime.ts";
import { U6_SFX } from "../audio/sfx_ids_runtime.ts";

assert.deepEqual(legacyAttackVerbRuntime({ type: 0x456 }, 1, 2, 0), {
  diagClass: "ok",
  ok: true,
  playSfx: "attack_swing",
  text: "Attack: target 0x56 at 1,2,0 (combat resolution pending)."
});

assert.deepEqual(legacyAttackVerbRuntime(null, 1, 2, 0), {
  diagClass: "warn",
  ok: false,
  text: "Attack: no valid target at 1,2,0."
});

assert.deepEqual(legacyCastVerbRuntime(10, 11, 1), {
  diagClass: "ok",
  ok: true,
  playSfx: "casting_magic_p1",
  text: "Cast: target 10,11,1 accepted (spell system pending)."
});

assert.equal(legacyVerbSfxIdRuntime("attack_swing"), U6_SFX.ATTACK_SWING);
assert.equal(legacyVerbSfxIdRuntime("casting_magic_p1"), U6_SFX.CASTING_MAGIC_P1);
assert.equal(legacyVerbSfxIdRuntime(""), null);
assert.equal(legacyVerbSfxIdRuntime("unknown"), null);

assert.deepEqual(legacyMoveVerbRuntime(12, 13, 0), {
  diagClass: "ok",
  ok: true,
  text: "Move: target 12,13,0 accepted (object move semantics pending)."
});

const farDropSim = {
  inventory: { "0x123:0x00": 1 },
  world: { map_x: 10, map_y: 10, map_z: 0 }
};
assert.deepEqual(legacyDropVerbRuntime(farDropSim, 16, 10), {
  diagClass: "warn",
  ok: false,
  text: "Drop: target out of range (16,10)."
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
assert.deepEqual(legacyDropVerbValidationRuntime(dropSim, 11, 10), {
  diagClass: "ok",
  inventoryKey: "0x123:0x00",
  ok: true,
  text: "Drop: 0x123:0x00 at 11,10,1.",
  tz: 1
});
assert.deepEqual(dropSim.inventory, { "0x123:0x00": 2 });
assert.deepEqual(legacyDropVerbRuntime(dropSim, 11, 10), {
  diagClass: "ok",
  ok: true,
  text: "Drop: 0x123:0x00 at 11,10,1 (remaining 1)."
});
assert.deepEqual(dropSim.inventory, { "0x123:0x00": 1 });

console.log("legacy_verb_runtime_test: ok");
