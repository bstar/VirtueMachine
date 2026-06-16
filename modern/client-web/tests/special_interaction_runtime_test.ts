import assert from "node:assert/strict";
import { U6_SFX } from "../audio/sfx_ids_runtime.ts";
import {
  OBJ_U6_BELL_RUNTIME,
  OBJ_U6_RUBBER_DUCKY_RUNTIME,
  specialUseSfxAtCellRuntime,
  specialUseSfxForObjectTypeRuntime
} from "../gameplay/special_interaction_runtime.ts";

assert.equal(specialUseSfxForObjectTypeRuntime(OBJ_U6_BELL_RUNTIME), U6_SFX.BELL);
assert.equal(specialUseSfxForObjectTypeRuntime(OBJ_U6_RUBBER_DUCKY_RUNTIME), U6_SFX.RUBBER_DUCK);
assert.equal(specialUseSfxForObjectTypeRuntime(0x100), null);
assert.equal(specialUseSfxForObjectTypeRuntime(0x400 + OBJ_U6_BELL_RUNTIME), U6_SFX.BELL);

assert.equal(specialUseSfxAtCellRuntime(null), null);
assert.equal(specialUseSfxAtCellRuntime([{ type: 0x100 }]), null);
assert.equal(specialUseSfxAtCellRuntime([
  { type: 0x100 },
  { type: OBJ_U6_RUBBER_DUCKY_RUNTIME }
]), U6_SFX.RUBBER_DUCK);
assert.equal(specialUseSfxAtCellRuntime([
  { type: OBJ_U6_BELL_RUNTIME },
  { type: OBJ_U6_RUBBER_DUCKY_RUNTIME }
]), U6_SFX.BELL);

console.log("special_interaction_runtime_test: ok");
